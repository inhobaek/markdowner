import { describe, expect, it } from 'vitest';

import { CODE_BLOCK_THEMES } from './settings';
import { sourceEditorThemeExtension } from './sourceEditorTheme';

describe('sourceEditorThemeExtension', () => {
  it('returns a CodeMirror extension for every code-block theme', () => {
    for (const { value } of CODE_BLOCK_THEMES) {
      const ext = sourceEditorThemeExtension(value);
      // A theme extension is an array of [EditorView.theme, syntaxHighlighting].
      expect(Array.isArray(ext)).toBe(true);
      expect((ext as unknown[]).length).toBe(2);
    }
  });

  it('memoises so repeated lookups return the same extension identity', () => {
    const first = sourceEditorThemeExtension('one-dark');
    const second = sourceEditorThemeExtension('one-dark');
    expect(first).toBe(second);
  });

  it('returns distinct extensions for different themes', () => {
    expect(sourceEditorThemeExtension('github-light')).not.toBe(
      sourceEditorThemeExtension('monokai-dark'),
    );
  });
});
