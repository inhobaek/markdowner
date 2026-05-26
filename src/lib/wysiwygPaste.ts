import { Fragment, Slice } from '@tiptap/pm/model';
import type { Mark, Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

// Matches URLs we recognise as auto-linkable inside pasted plain text.
// Conservative on purpose: requires an explicit `http(s)://` (or `mailto:`,
// `tel:`) scheme so bare words like `index.tsx` or `a.b.c` aren't linked.
// Trailing punctuation is excluded so "see https://example.com." does the
// expected thing (the trailing period stays outside the link).
const URL_PATTERN =
  /\b((?:https?:\/\/|mailto:|tel:)[^\s<>()[\]{}'"`]+[^\s<>()[\]{}'"`.,;:!?])/g;

function linkMarkForHref(schema: Schema, href: string): Mark | null {
  const linkType = schema.marks.link;
  if (!linkType) return null;
  return linkType.create({ href });
}

// Split a plain-text run into inline ProseMirror nodes, applying the link
// mark to substrings that look like URLs. Non-URL chunks become plain text;
// URL chunks become text wrapped in a `link` mark so the resulting paragraph
// contains clickable links the moment the paste lands.
function buildInlineFromText(schema: Schema, text: string): ProseMirrorNode[] {
  if (text.length === 0) return [];
  const linkType = schema.marks.link;
  if (!linkType) return [schema.text(text)];

  const out: ProseMirrorNode[] = [];
  let cursor = 0;
  // String#matchAll requires the /g flag and would consume the regex's
  // lastIndex across iterations; using exec with explicit lastIndex keeps
  // the state local to this call.
  URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_PATTERN.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[1].length;
    if (start > cursor) {
      out.push(schema.text(text.slice(cursor, start)));
    }
    const href = match[1];
    const linkMark = linkMarkForHref(schema, href);
    out.push(linkMark ? schema.text(href, [linkMark]) : schema.text(href));
    cursor = end;
  }
  if (cursor < text.length) {
    out.push(schema.text(text.slice(cursor)));
  }
  return out;
}

/**
 * Builds an "open" Slice of paragraph nodes from a plain-text string, suitable
 * for `Transaction.replaceSelection`. The slice has openStart/openEnd = 1 so
 * the first and last paragraph merge with the surrounding block at the paste
 * point instead of starting a brand-new paragraph at the caret.
 *
 * Splits on blank lines (`\n{2,}`) to produce separate paragraphs. Single
 * newlines inside a paragraph become hard breaks, matching what users get
 * from a normal text-mode paste. URL-looking substrings are wrapped in `link`
 * marks so pasting "see https://example.com" lands a clickable link in one
 * step instead of leaving the user to re-select and apply the link by hand.
 */
export function buildPlainTextPasteSlice(schema: Schema, text: string): Slice {
  const normalized = text.replace(/\r\n?/g, '\n');
  const blocks = normalized.split(/\n{2,}/);

  const paragraphNodes: ProseMirrorNode[] = blocks.map((block) => {
    const lines = block.split('\n');
    const inline: ProseMirrorNode[] = [];
    lines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        inline.push(schema.nodes.hardBreak.create());
      }
      if (line.length > 0) {
        inline.push(...buildInlineFromText(schema, line));
      }
    });
    return schema.nodes.paragraph.create(null, inline);
  });

  if (paragraphNodes.length === 0) {
    return Slice.empty;
  }

  return new Slice(Fragment.from(paragraphNodes), 1, 1);
}

/**
 * Tiptap `editorProps.handlePaste` that forces plain-text pasting in the
 * WYSIWYG surface.
 *
 * Why: ProseMirror's default paste handler prefers `text/html` over
 * `text/plain`. Sources like browser devtools, React inspector tools
 * (react-grab), and some terminals push HTML to the clipboard that contains
 * unknown elements (`<SidebarInset>`, custom `data-*` divs, …) or malformed
 * markup. ProseMirror's DOMParser silently drops what its schema can't map,
 * so the pasted content loses chunks that the user actually copied.
 *
 * Preferring `text/plain` mirrors what the user visibly highlighted in the
 * source app and keeps the paste verbatim. Markdown formatting from the
 * source (bold, italic, lists) is lost, which is the right trade for a
 * markdown editor where the user can type that syntax explicitly. URLs are
 * auto-linked on the way in (see `buildPlainTextPasteSlice`) so the most
 * common "paste a URL" case still produces a clickable link.
 *
 * Returns `true` to short-circuit the default handler when plain text is
 * available; falls through (`false`) for clipboard payloads without text
 * (image/file pastes still work via the default path).
 */
export function handleWysiwygPlainTextPaste(
  view: EditorView,
  event: ClipboardEvent,
): boolean {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return false;
  const text = clipboardData.getData('text/plain');
  if (!text) return false;

  const slice = buildPlainTextPasteSlice(view.state.schema, text);
  if (slice.size === 0) return false;

  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
  return true;
}
