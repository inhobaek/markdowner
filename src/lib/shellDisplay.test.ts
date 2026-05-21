import { describe, expect, it } from 'vitest';

import {
  EDITOR_MODE_OPTIONS,
  WINDOW_TITLE,
  buildWindowTitle,
  formatEditorMode,
  formatThemeLabel,
} from './shellDisplay';

describe('formatEditorMode', () => {
  it('returns friendly labels for editor modes', () => {
    expect(formatEditorMode('Wysiwyg')).toBe('WYSIWYG');
    expect(formatEditorMode('Editor')).toBe('Editor');
    expect(formatEditorMode('SplitView')).toBe('Split View');
  });
});

describe('EDITOR_MODE_OPTIONS', () => {
  it('keeps mode labels and keyboard metadata together', () => {
    expect(EDITOR_MODE_OPTIONS).toEqual([
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
    ]);
  });
});

describe('formatThemeLabel', () => {
  it('returns friendly labels for built-in and custom themes', () => {
    expect(formatThemeLabel('BuiltInLight')).toBe('Light');
    expect(formatThemeLabel('BuiltInDark')).toBe('Dark');
    expect(formatThemeLabel('CustomCss')).toBe('Custom');
  });
});

describe('buildWindowTitle', () => {
  it('returns the app title when no document is open', () => {
    expect(
      buildWindowTitle({
        activeDocumentDirty: false,
        activeDocumentName: null,
        activeDocumentSource: null,
      }),
    ).toBe(WINDOW_TITLE);
  });

  it('returns the document title for a clean open document', () => {
    expect(
      buildWindowTitle({
        activeDocumentDirty: false,
        activeDocumentName: 'notes.md',
        activeDocumentSource: '# Notes',
      }),
    ).toBe('notes.md \u2014 Markdowner');
  });

  it('marks dirty documents in the title', () => {
    expect(
      buildWindowTitle({
        activeDocumentDirty: true,
        activeDocumentName: 'notes.md',
        activeDocumentSource: '# Notes',
      }),
    ).toBe('\u25cf notes.md \u2014 Markdowner');
  });
});
