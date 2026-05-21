import type { EditorMode, ThemeKind } from './desktop';

export const WINDOW_TITLE = 'Markdowner';

export type EditorModeOption = {
  mode: EditorMode;
  label: string;
  shortcutSymbol: string;
  shortcutText: string;
  ariaKeyshortcuts: string;
};

export const EDITOR_MODE_OPTIONS: EditorModeOption[] = [
  {
    mode: 'Wysiwyg',
    label: 'WYSIWYG',
    shortcutSymbol: '\u23251',
    shortcutText: 'Opt+1',
    ariaKeyshortcuts: 'Alt+Digit1',
  },
  {
    mode: 'Editor',
    label: 'Editor',
    shortcutSymbol: '\u23252',
    shortcutText: 'Opt+2',
    ariaKeyshortcuts: 'Alt+Digit2',
  },
  {
    mode: 'SplitView',
    label: 'Split View',
    shortcutSymbol: '\u23253',
    shortcutText: 'Opt+3',
    ariaKeyshortcuts: 'Alt+Digit3',
  },
];

const EDITOR_MODE_LABELS: Record<EditorMode, string> = EDITOR_MODE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.mode] = option.label;
    return acc;
  },
  {} as Record<EditorMode, string>,
);

type WindowTitleSnapshot = {
  activeDocumentDirty: boolean;
  activeDocumentName: string | null;
  activeDocumentSource: string | null;
};

const THEME_KIND_LABELS: Record<ThemeKind, string> = {
  BuiltInLight: 'Light',
  BuiltInDark: 'Dark',
  CustomCss: 'Custom',
};

export function formatThemeLabel(kind: ThemeKind): string {
  return THEME_KIND_LABELS[kind] ?? kind;
}

export function formatEditorMode(mode: EditorMode): string {
  return EDITOR_MODE_LABELS[mode] ?? mode;
}

export function buildWindowTitle(snapshot: WindowTitleSnapshot): string {
  if (snapshot.activeDocumentSource === null || !snapshot.activeDocumentName) {
    return WINDOW_TITLE;
  }

  const prefix = snapshot.activeDocumentDirty ? '\u25cf ' : '';
  return `${prefix}${snapshot.activeDocumentName} \u2014 ${WINDOW_TITLE}`;
}
