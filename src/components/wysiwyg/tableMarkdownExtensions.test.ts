/**
 * Round-trip regression tests for the GFM-safe table markdown hooks.
 *
 * The stock @tiptap/extension-table serializer drops cells containing `|`,
 * persists a literal U+001F between multi-block cell contents, and regrows
 * a phantom empty header row on headerless tables. Each case here pins the
 * non-corrupting behavior of `MarkdownTable` across serialize → parse
 * cycles, mirroring the editor stack wired up in App.tsx.
 */
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import { common, createLowlight } from 'lowlight';
import { afterEach, describe, expect, it } from 'vitest';

import { MarkdownTable, sanitizeMarkdownControlChars } from './tableMarkdownExtensions';

const lowlight = createLowlight(common);

function buildEditor() {
  return new Editor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
      Image,
      MarkdownTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
    ],
    content: '',
  });
}

function setMarkdown(editor: Editor, markdown: string) {
  editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false } as never);
}

function setDoc(editor: Editor, doc: JSONContent) {
  editor.commands.setContent(doc, { emitUpdate: false } as never);
}

function findTable(editor: Editor): JSONContent | undefined {
  return editor.getJSON().content?.find(n => n.type === 'table');
}

function cellTexts(row: JSONContent | undefined): string[] {
  return (row?.content ?? []).map(cell =>
    (cell.content ?? [])
      .map(block => (block.content ?? []).map(inline => inline.text ?? '').join(''))
      .join('\n'),
  );
}

function paragraphCell(type: 'tableCell' | 'tableHeader', text: string): JSONContent {
  return {
    type,
    content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
  };
}

describe('MarkdownTable round-trip', () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it('escapes | in cells so no cells are dropped across a round-trip', () => {
    editor = buildEditor();
    setDoc(editor, {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [paragraphCell('tableHeader', 'a|b'), paragraphCell('tableHeader', 'h2')],
            },
            {
              type: 'tableRow',
              content: [paragraphCell('tableCell', 'c|x'), paragraphCell('tableCell', 'd')],
            },
          ],
        },
      ],
    });

    const markdown = editor.getMarkdown();
    expect(markdown).toContain('a\\|b');
    expect(markdown).toContain('c\\|x');

    setMarkdown(editor, markdown);
    const table = findTable(editor);
    expect(table?.content).toHaveLength(2);
    expect(cellTexts(table?.content?.[0])).toEqual(['a|b', 'h2']);
    expect(cellTexts(table?.content?.[1])).toEqual(['c|x', 'd']);
  });

  it('joins multi-paragraph cells with <br> — no U+001F anywhere in the output', () => {
    editor = buildEditor();
    setDoc(editor, {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
                    { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
                  ],
                },
                paragraphCell('tableCell', 'd'),
              ],
            },
          ],
        },
      ],
    });

    const markdown = editor.getMarkdown();
    expect(markdown).not.toContain('\u001F');
    expect(markdown).toContain('one<br>two');

    // <br> parses back to a hardBreak, and the next serialize emits <br>
    // again — the cell is a fixed point from the second cycle onward.
    setMarkdown(editor, markdown);
    const again = editor.getMarkdown();
    expect(again).not.toContain('\u001F');
    expect(again).toContain('one<br>two');
  });

  it('keeps intra-cell hard breaks as <br> instead of collapsing them to a space', () => {
    editor = buildEditor();
    setDoc(editor, {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', text: 'one' },
                        { type: 'hardBreak' },
                        { type: 'text', text: 'two' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(editor.getMarkdown()).toContain('one<br>two');
  });

  it('headerless tables keep their row count across repeated round-trips', () => {
    editor = buildEditor();
    setDoc(editor, {
      type: 'doc',
      content: [
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [paragraphCell('tableCell', 'r1c1'), paragraphCell('tableCell', 'r1c2')],
            },
            {
              type: 'tableRow',
              content: [paragraphCell('tableCell', 'r2c1'), paragraphCell('tableCell', 'r2c2')],
            },
          ],
        },
      ],
    });

    for (let cycle = 0; cycle < 2; cycle += 1) {
      setMarkdown(editor, editor.getMarkdown());
      const table = findTable(editor);
      expect(table?.content).toHaveLength(2);
      expect(cellTexts(table?.content?.[0])).toEqual(['r1c1', 'r1c2']);
      expect(cellTexts(table?.content?.[1])).toEqual(['r2c1', 'r2c2']);
    }
  });

  it('plain tables with a header round-trip unchanged', () => {
    editor = buildEditor();
    const source = '| a   | b   |\n| --- | --- |\n| c   | d   |\n';
    setMarkdown(editor, source);

    const first = editor.getMarkdown();
    setMarkdown(editor, first);
    expect(editor.getMarkdown()).toBe(first);

    const table = findTable(editor);
    expect(table?.content).toHaveLength(2);
    expect(table?.content?.[0]?.content?.every(c => c.type === 'tableHeader')).toBe(true);
    expect(cellTexts(table?.content?.[0])).toEqual(['a', 'b']);
    expect(cellTexts(table?.content?.[1])).toEqual(['c', 'd']);
  });

  it('preserves column alignment markers across a round-trip', () => {
    editor = buildEditor();
    const source = '| a | b |\n| :--- | ---: |\n| c | d |\n';
    setMarkdown(editor, source);

    const markdown = editor.getMarkdown();
    expect(markdown).toMatch(/\| :-+ \| -+: \|/);

    setMarkdown(editor, markdown);
    const row = findTable(editor)?.content?.[1];
    expect(row?.content?.[0]?.attrs?.align).toBe('left');
    expect(row?.content?.[1]?.attrs?.align).toBe('right');
  });

  it('keeps an all-empty header when the table has no body rows', () => {
    editor = buildEditor();
    setMarkdown(editor, '|     |     |\n| --- | --- |\n');
    const table = findTable(editor);
    expect(table?.content).toHaveLength(1);
    expect(table?.content?.[0]?.content?.every(c => c.type === 'tableHeader')).toBe(true);
  });
});

describe('sanitizeMarkdownControlChars', () => {
  it('replaces U+001F with a space so words do not glue together', () => {
    expect(sanitizeMarkdownControlChars('one\u001Ftwo')).toBe('one two');
    expect(sanitizeMarkdownControlChars('| a\u001Fb |\n')).toBe('| a b |\n');
  });

  it('leaves clean markdown untouched', () => {
    const clean = '# Title\n\n| a | b |\n| --- | --- |\n| c | d |\n';
    expect(sanitizeMarkdownControlChars(clean)).toBe(clean);
  });
});
