// Shape we accept for the @tiptap/markdown manager exposed on
// `editor.storage.markdown.manager`. We pluck `serialize` at runtime so
// missing / older versions degrade to ProseMirror's default plain-text copy
// instead of throwing.
interface MarkdownManagerLike {
  // `any` keeps the real manager's `(docOrContent: JSONContent) => string`
  // assignable here (an `unknown` parameter would fail contravariance).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serialize?: (docOrContent: any) => string;
}

// Loose duck-typed view of the Tiptap editor — same convention as
// wysiwygPaste.ts: keeps us compatible with both the real `@tiptap/react`
// Editor type and the lighter mocks the unit tests pass in.
interface EditorLike {
  storage?: { markdown?: { manager?: MarkdownManagerLike } };
}

// The part of a ProseMirror Slice this module touches. `Fragment.toJSON()`
// yields an array of node JSON (or null when the fragment is empty), which is
// exactly what MarkdownManager.serialize accepts.
interface SliceLike {
  content: { toJSON: () => unknown };
}

type JsonNodeLike = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
};

function textFromJsonNode(node: JsonNodeLike): string {
  if (typeof node.text === 'string') return node.text;
  if (!Array.isArray(node.content)) return '';
  return node.content.map((child) => textFromJsonNode(child as JsonNodeLike)).join('');
}

function rawTextForSingleCodeBlock(content: unknown): string | null {
  if (!Array.isArray(content) || content.length !== 1) return null;
  const [node] = content as JsonNodeLike[];
  if (node?.type !== 'codeBlock') return null;
  return textFromJsonNode(node);
}

/**
 * ProseMirror `clipboardTextSerializer` for the WYSIWYG surface: serialize
 * the copied/cut slice to markdown so the clipboard's `text/plain` flavor
 * carries markdown source (`**bold**`, `# heading`, …) instead of bare text.
 *
 * The `text/html` flavor is untouched, so rich-text targets still receive
 * formatted content; markdown-aware targets (and our own paste handler,
 * which prefers `text/plain`) get round-trippable markdown.
 *
 * Returns `''` whenever the markdown path is unavailable or fails —
 * prosemirror-view treats a falsy result as "no serializer" and falls back
 * to its default `textBetween` plain-text copy.
 */
export function serializeWysiwygSliceToMarkdown(
  slice: SliceLike,
  editor: EditorLike | null,
): string {
  const manager = editor?.storage?.markdown?.manager;
  if (!manager || typeof manager.serialize !== 'function') return '';
  const content = slice?.content?.toJSON?.();
  if (!content) return '';
  const rawCode = rawTextForSingleCodeBlock(content);
  if (rawCode !== null) return rawCode;
  try {
    // Wrap in a doc node: serializing a bare node array joins the blocks
    // with no separator ("# TitleBody"); the doc renderer is what inserts
    // the blank line between top-level blocks (same path as getMarkdown()).
    // Trailing newlines are trimmed — a select-all sweeps in the TrailingNode
    // empty paragraph, which is an editor artifact, not copied content.
    return (manager.serialize({ type: 'doc', content }) ?? '').replace(/\n+$/, '');
  } catch {
    return '';
  }
}
