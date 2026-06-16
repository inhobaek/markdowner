import { EditorView, Prec, type Extension } from '@uiw/react-codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

import type { CodeBlockTheme } from './settings';

/**
 * Palette for one code-block theme, transcribed from the `:root[data-cb-theme]`
 * hljs token rules in styles.css. Keeping the source editor's CodeMirror theme
 * in lock-step with those rules makes the editor-/split-mode syntax colors match
 * the WYSIWYG code blocks exactly. When a palette here is changed, update the
 * matching block in styles.css (and vice versa).
 */
interface CodeThemePalette {
  dark: boolean;
  bg: string;
  fg: string;
  comment: string;
  keyword: string;
  string: string;
  /** Headings, names, function/definition titles. */
  title: string;
  /** Numbers, built-ins, types, attributes, variables. */
  number: string;
  tag: string;
  link: string;
}

const PALETTES: Record<CodeBlockTheme, CodeThemePalette> = {
  'github-light': { dark: false, bg: '#f6f8fa', fg: '#24292f', comment: '#6a737d', keyword: '#d73a49', string: '#032f62', title: '#6f42c1', number: '#005cc5', tag: '#22863a', link: '#d73a49' },
  'github-dark': { dark: true, bg: '#0d1117', fg: '#c9d1d9', comment: '#8b949e', keyword: '#ff7b72', string: '#a5d6ff', title: '#d2a8ff', number: '#79c0ff', tag: '#7ee787', link: '#ff7b72' },
  'one-light': { dark: false, bg: '#fafafa', fg: '#383a42', comment: '#a0a1a7', keyword: '#a626a4', string: '#50a14f', title: '#4078f2', number: '#986801', tag: '#e45649', link: '#0184bc' },
  'one-dark': { dark: true, bg: '#282c34', fg: '#abb2bf', comment: '#5c6370', keyword: '#c678dd', string: '#98c379', title: '#e06c75', number: '#d19a66', tag: '#e06c75', link: '#61afef' },
  'ayu-light': { dark: false, bg: '#fafafa', fg: '#5c6773', comment: '#abb0b6', keyword: '#fa8d3e', string: '#86b300', title: '#f2ae49', number: '#a37acc', tag: '#55b4d4', link: '#55b4d4' },
  'ayu-dark': { dark: true, bg: '#0a0e14', fg: '#b3b1ad', comment: '#5c6773', keyword: '#ff8f40', string: '#c2d94c', title: '#ffb454', number: '#d2a6ff', tag: '#39bae6', link: '#39bae6' },
  'flexoki-light': { dark: false, bg: '#f2f0e5', fg: '#100f0f', comment: '#878580', keyword: '#af3029', string: '#66800b', title: '#5e409d', number: '#bc5215', tag: '#66800b', link: '#205ea6' },
  'flexoki-dark': { dark: true, bg: '#100f0f', fg: '#cecdc3', comment: '#878580', keyword: '#d14d41', string: '#879a39', title: '#8b7ec8', number: '#da702c', tag: '#879a39', link: '#4385be' },
  'monokai-light': { dark: false, bg: '#fafafa', fg: '#49483e', comment: '#999580', keyword: '#f92672', string: '#669900', title: '#7a9f0c', number: '#644ac9', tag: '#f92672', link: '#0087af' },
  'monokai-dark': { dark: true, bg: '#272822', fg: '#f8f8f2', comment: '#75715e', keyword: '#f92672', string: '#e6db74', title: '#a6e22e', number: '#ae81ff', tag: '#f92672', link: '#66d9ef' },
};

/** Append an 8-bit alpha (00–ff) to a `#rrggbb` colour. */
const alpha = (hex: string, a: string) => `${hex}${a}`;

function highlightStyleFor(p: CodeThemePalette): HighlightStyle {
  return HighlightStyle.define([
    // --- Markdown structure (what the source editor mostly renders) ---
    { tag: t.heading, color: p.title, fontWeight: 'bold' },
    { tag: [t.heading1, t.heading2, t.heading3, t.heading4, t.heading5, t.heading6], color: p.title, fontWeight: 'bold' },
    { tag: t.strong, color: p.fg, fontWeight: 'bold' },
    { tag: t.emphasis, color: p.fg, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: [t.link, t.url], color: p.link, textDecoration: 'underline' },
    { tag: t.monospace, color: p.string },
    { tag: t.quote, color: p.comment, fontStyle: 'italic' },
    { tag: [t.list, t.processingInstruction], color: p.keyword },
    { tag: t.contentSeparator, color: p.comment },
    // --- Programming tokens (inline + any nested code) ---
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: p.comment, fontStyle: 'italic' },
    { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword, t.self, t.null], color: p.keyword },
    { tag: [t.string, t.special(t.string), t.regexp, t.docString, t.character], color: p.string },
    { tag: [t.number, t.integer, t.float, t.bool, t.atom, t.unit], color: p.number },
    { tag: [t.typeName, t.className, t.namespace], color: p.number },
    { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.variableName)], color: p.title },
    { tag: [t.propertyName, t.attributeName], color: p.number },
    { tag: [t.variableName, t.labelName], color: p.fg },
    { tag: [t.tagName, t.angleBracket], color: p.tag },
    { tag: [t.meta, t.documentMeta, t.annotation], color: p.comment },
    { tag: [t.literal, t.constant(t.variableName)], color: p.number },
    { tag: t.escape, color: p.number },
    { tag: t.invalid, color: p.dark ? '#ff5555' : '#d70000' },
  ]);
}

function editorThemeFor(p: CodeThemePalette): Extension {
  // Activeline/selection use the palette colours at low alpha so they read on
  // both light and dark backgrounds without a separate palette entry.
  const lineHi = alpha(p.fg, p.dark ? '14' : '0d');
  return EditorView.theme(
    {
      '&': { backgroundColor: p.bg, color: p.fg },
      '.cm-content': { caretColor: p.fg },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: p.fg },
      '.cm-gutters': { backgroundColor: p.bg, color: p.comment, border: 'none' },
      '.cm-activeLine': { backgroundColor: lineHi },
      '.cm-activeLineGutter': { backgroundColor: lineHi, color: p.fg },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        { backgroundColor: alpha(p.link, '33') },
      '.cm-selectionMatch': { backgroundColor: alpha(p.number, '22') },
    },
    { dark: p.dark },
  );
}

const cache = new Map<CodeBlockTheme, Extension>();

/**
 * CodeMirror theme extension for the source/split-mode editor that mirrors the
 * given code-block theme — background, foreground, and syntax token colours.
 * The syntax highlighting is given the highest precedence so it overrides the
 * generic default highlight style that ships with @uiw/react-codemirror's
 * basic setup. Memoised per theme so switching back and forth is free and the
 * editor view isn't rebuilt with a fresh extension identity each render.
 */
export function sourceEditorThemeExtension(theme: CodeBlockTheme): Extension {
  const cached = cache.get(theme);
  if (cached) return cached;
  const palette = PALETTES[theme] ?? PALETTES['one-dark'];
  const extension: Extension = [
    editorThemeFor(palette),
    Prec.highest(syntaxHighlighting(highlightStyleFor(palette))),
  ];
  cache.set(theme, extension);
  return extension;
}
