import type {
  JSONContent,
  MarkdownParseHelpers,
  MarkdownRendererHelpers,
  MarkdownToken,
} from '@tiptap/core';
import { Table } from '@tiptap/extension-table';

/**
 * GFM-safe markdown round-trip for tables.
 *
 * The stock @tiptap/extension-table markdown hooks (3.22.x) corrupt
 * documents in three ways, all of which reach disk via the draft mirror:
 *
 * 1. `|` inside a cell is not escaped on serialize, so "c|x" splits the
 *    row on re-parse and GFM clamps to the header column count — trailing
 *    cells are silently dropped.
 * 2. Multi-block cell content is joined with a literal U+001F control
 *    character that survives re-parses inside cell text forever.
 * 3. Headerless tables serialize with an empty header line, which re-parse
 *    turns into a phantom all-empty header row (2-row table → 3 rows).
 *
 * `MarkdownTable` below overrides only `parseMarkdown`/`renderMarkdown`;
 * everything else (commands, schema, resizing) is inherited unchanged.
 * TableRow / TableHeader / TableCell declare no markdown hooks, so the
 * stock extensions remain in use for those nodes.
 */

type TableCellAlign = 'left' | 'right' | 'center';

type MarkdownTableToken = {
  align?: Array<TableCellAlign | null>;
  header?: { tokens: MarkdownToken[]; align?: TableCellAlign | null }[];
  rows?: { tokens: MarkdownToken[]; align?: TableCellAlign | null }[][];
} & MarkdownToken;

/**
 * Belt-and-braces guard for the persistence path: strip the U+001F cell
 * separator the stock serializer leaks into markdown. Replaced with a
 * space (not removed) so previously-corrupted files don't glue words.
 */
export function sanitizeMarkdownControlChars(markdown: string): string {
  return markdown.replace(/\u001F/g, ' ');
}

function normalizeAlign(value: unknown): TableCellAlign | null {
  return value === 'left' || value === 'right' || value === 'center' ? value : null;
}

function collapseWhitespace(s: string): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

// hardBreak serializes to "  \n" which the stock renderer collapses to a
// space. Converting newline runs to <br> instead keeps intra-cell line
// breaks: marked re-parses inline <br> in a cell back to a hardBreak node
// (verified against @tiptap/markdown 3.22.x under jsdom), so the cell is
// stable across repeated round-trips.
function replaceNewlinesWithBreaks(s: string): string {
  return s.replace(/[ \t]*\n[ \t\n]*/g, '<br>');
}

// GFM unescapes \| inside cells before inline parsing, so escaping every
// pipe round-trips to the literal character without splitting the row.
function escapeCellPipes(s: string): string {
  return s.replace(/\|/g, '\\|');
}

interface RenderedCell {
  text: string;
  isHeader: boolean;
  align: TableCellAlign | null;
}

function renderCellText(cellNode: JSONContent, h: MarkdownRendererHelpers): string {
  let raw = '';

  if (cellNode.content && Array.isArray(cellNode.content) && cellNode.content.length > 1) {
    // Render each direct block child separately and join with <br> — the
    // stock renderer joins with U+001F here, which is what leaks control
    // bytes into saved files.
    const parts = cellNode.content.map(child => h.renderChildren(child as unknown as JSONContent));
    raw = parts.join('<br>');
  } else {
    raw = cellNode.content ? h.renderChildren(cellNode.content as unknown as JSONContent[]) : '';
  }

  return escapeCellPipes(collapseWhitespace(replaceNewlinesWithBreaks(raw)));
}

// Adapted from @tiptap/extension-table's renderTableToMarkdown with the
// cell text pipeline above swapped in; padding, alignment markers and the
// header/body layout match the stock output so plain tables are unchanged.
function renderTableNodeToMarkdown(node: JSONContent, h: MarkdownRendererHelpers): string {
  if (!node || !node.content || node.content.length === 0) {
    return '';
  }

  const rows: RenderedCell[][] = [];

  node.content.forEach(rowNode => {
    const cells: RenderedCell[] = [];

    rowNode.content?.forEach(cellNode => {
      cells.push({
        text: renderCellText(cellNode, h),
        isHeader: cellNode.type === 'tableHeader',
        align: normalizeAlign(cellNode.attrs?.align),
      });
    });

    rows.push(cells);
  });

  const columnCount = rows.reduce((max, r) => Math.max(max, r.length), 0);

  if (columnCount === 0) {
    return '';
  }

  const colWidths: number[] = new Array(columnCount).fill(3);

  rows.forEach(r => {
    for (let i = 0; i < columnCount; i += 1) {
      colWidths[i] = Math.max(colWidths[i], (r[i]?.text || '').length);
    }
  });

  const pad = (s: string, width: number) => s + ' '.repeat(Math.max(0, width - s.length));

  const headerRow = rows[0];
  const hasHeader = headerRow.some(c => c.isHeader);
  const colAlignments: Array<TableCellAlign | null> = new Array(columnCount).fill(null);

  rows.forEach(r => {
    for (let i = 0; i < columnCount; i += 1) {
      if (!colAlignments[i] && r[i]?.align) {
        colAlignments[i] = r[i].align;
      }
    }
  });

  let out = '\n';

  // GFM requires a header line, so headerless tables still emit an empty
  // one; the parse override below drops the resulting phantom row again.
  const headerTexts = new Array(columnCount)
    .fill(0)
    .map((_, i) => (hasHeader ? headerRow[i]?.text || '' : ''));

  out += `| ${headerTexts.map((t, i) => pad(t, colWidths[i])).join(' | ')} |\n`;

  out += `| ${colWidths
    .map((w, index) => {
      const dashes = '-'.repeat(Math.max(3, w));
      const alignment = colAlignments[index];

      if (alignment === 'left') return `:${dashes}`;
      if (alignment === 'right') return `${dashes}:`;
      if (alignment === 'center') return `:${dashes}:`;
      return dashes;
    })
    .join(' | ')} |\n`;

  const body = hasHeader ? rows.slice(1) : rows;
  body.forEach(r => {
    out += `| ${new Array(columnCount)
      .fill(0)
      .map((_, i) => pad(r[i]?.text || '', colWidths[i]))
      .join(' | ')} |\n`;
  });

  return out;
}

function hasInlineContent(inline: JSONContent[]): boolean {
  return inline.some(n => n.type !== 'text' || (n.text ?? '').trim() !== '');
}

// Adapted from the stock Table.parseMarkdown, plus phantom-header
// normalization: an all-empty header row over a non-empty body is the
// serializer's mandatory GFM header line, not authored content — drop it
// so headerless tables keep their row count across round-trips.
function parseTableToken(token: MarkdownTableToken, h: MarkdownParseHelpers): JSONContent {
  const rows: JSONContent[] = [];
  const alignments = Array.isArray(token.align) ? token.align : [];

  if (token.header) {
    const headerCells: JSONContent[] = [];
    let headerHasContent = false;

    token.header.forEach((cell, index) => {
      const align = normalizeAlign(alignments[index] ?? cell.align);
      const attrs = align ? { align } : {};
      const inline = h.parseInline(cell.tokens);

      if (hasInlineContent(inline)) {
        headerHasContent = true;
      }

      headerCells.push(h.createNode('tableHeader', attrs, [{ type: 'paragraph', content: inline }]));
    });

    if (headerHasContent || !token.rows || token.rows.length === 0) {
      rows.push(h.createNode('tableRow', {}, headerCells));
    }
  }

  if (token.rows) {
    token.rows.forEach(row => {
      const bodyCells: JSONContent[] = [];

      row.forEach((cell, index) => {
        const align = normalizeAlign(alignments[index] ?? cell.align);
        const attrs = align ? { align } : {};

        bodyCells.push(
          h.createNode('tableCell', attrs, [{ type: 'paragraph', content: h.parseInline(cell.tokens) }]),
        );
      });

      rows.push(h.createNode('tableRow', {}, bodyCells));
    });
  }

  return h.createNode('table', undefined, rows);
}

/** Drop-in replacement for `Table` with non-corrupting markdown hooks. */
export const MarkdownTable = Table.extend({
  parseMarkdown: (token, h) => parseTableToken(token as MarkdownTableToken, h),
  renderMarkdown: (node, h) => renderTableNodeToMarkdown(node, h),
});
