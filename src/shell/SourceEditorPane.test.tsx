import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SourceEditorPane } from './SourceEditorPane';
import type { SourceEditorViewProps } from '@/components/SourceEditorView';

vi.mock('@/components/SourceEditorView', () => ({
  SourceEditorView: ({
    value,
    extensions,
    theme,
    onChange,
    onStatistics,
    onCreateEditor,
    containerRef,
  }: SourceEditorViewProps) => (
    <section
      data-testid="source-editor-view"
      data-value={value}
      data-extension-count={String(extensions.length)}
      data-theme={theme}
      data-has-container-ref={String(Boolean(containerRef))}
    >
      <button type="button" onClick={() => onChange('updated source')}>
        Change source
      </button>
      <button type="button" onClick={() => onStatistics({ lines: 3 })}>
        Report stats
      </button>
      <button type="button" onClick={() => onCreateEditor({ id: 'view' } as never)}>
        Create editor
      </button>
    </section>
  ),
}));

describe('SourceEditorPane', () => {
  afterEach(() => {
    cleanup();
  });

  it('maps the active app theme to the CodeMirror source editor theme', () => {
    const { rerender } = render(
      <SourceEditorPane
        value="# Draft"
        extensions={['markdown']}
        themeKind="BuiltInDark"
        onChange={() => {}}
        onStatistics={() => {}}
        onCreateEditor={() => {}}
        containerRef={{ current: null }}
      />,
    );

    expect(screen.getByTestId('source-editor-view')).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByTestId('source-editor-view')).toHaveAttribute('data-value', '# Draft');
    expect(screen.getByTestId('source-editor-view')).toHaveAttribute('data-extension-count', '1');
    expect(screen.getByTestId('source-editor-view')).toHaveAttribute(
      'data-has-container-ref',
      'true',
    );

    rerender(
      <SourceEditorPane
        value="# Draft"
        extensions={['markdown']}
        themeKind="CustomCss"
        onChange={() => {}}
        onStatistics={() => {}}
        onCreateEditor={() => {}}
        containerRef={{ current: null }}
      />,
    );

    expect(screen.getByTestId('source-editor-view')).toHaveAttribute('data-theme', 'light');
  });

  it('keeps SourceEditorView callbacks owned by App while grouping the render surface', () => {
    const onChange = vi.fn();
    const onStatistics = vi.fn();
    const onCreateEditor = vi.fn();

    render(
      <SourceEditorPane
        value="# Draft"
        extensions={[]}
        themeKind="BuiltInLight"
        onChange={onChange}
        onStatistics={onStatistics}
        onCreateEditor={onCreateEditor}
        containerRef={{ current: null }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Change source' }));
    fireEvent.click(screen.getByRole('button', { name: 'Report stats' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create editor' }));

    expect(onChange).toHaveBeenCalledWith('updated source');
    expect(onStatistics).toHaveBeenCalledWith({ lines: 3 });
    expect(onCreateEditor).toHaveBeenCalledWith({ id: 'view' });
  });
});
