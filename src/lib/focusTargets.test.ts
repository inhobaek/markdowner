import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  focusActiveEditor,
  focusExplorerFilter,
  focusExplorerTree,
  focusOutlineTree,
} from './focusTargets';

afterEach(() => {
  document.body.replaceChildren();
});

function appendButton(attributes: Record<string, string>, text = 'button') {
  const button = document.createElement('button');
  button.textContent = text;
  for (const [key, value] of Object.entries(attributes)) {
    button.setAttribute(key, value);
  }
  document.body.appendChild(button);
  return button;
}

describe('focusExplorerTree', () => {
  it('restores the remembered explorer element when it is still connected', () => {
    const root = document.createElement('aside');
    root.dataset.explorerRoot = '';
    const remembered = document.createElement('button');
    root.appendChild(remembered);
    document.body.appendChild(root);

    expect(focusExplorerTree(remembered)).toBe(true);
    expect(document.activeElement).toBe(remembered);
  });

  it('falls back to the first explorer workspace row', () => {
    const root = document.createElement('aside');
    root.dataset.explorerRoot = '';
    const tree = document.createElement('div');
    tree.dataset.testid = 'explorer-workspace-tree';
    const row = document.createElement('button');
    tree.appendChild(row);
    root.appendChild(tree);
    document.body.appendChild(root);

    expect(focusExplorerTree(null)).toBe(true);
    expect(document.activeElement).toBe(row);
  });
});

describe('focusOutlineTree', () => {
  it('restores the remembered outline row when available', () => {
    const root = document.createElement('nav');
    root.dataset.outlineRoot = '';
    const remembered = document.createElement('button');
    root.appendChild(remembered);
    document.body.appendChild(root);

    expect(focusOutlineTree(remembered)).toBe(true);
    expect(document.activeElement).toBe(remembered);
  });

  it('falls back to the outline root when no row exists', () => {
    const root = document.createElement('nav');
    root.dataset.outlineRoot = '';
    root.tabIndex = -1;
    document.body.appendChild(root);

    expect(focusOutlineTree(null)).toBe(true);
    expect(document.activeElement).toBe(root);
  });
});

describe('focusExplorerFilter', () => {
  it('focuses and selects the explorer filter input on the next frame', () => {
    const root = document.createElement('aside');
    root.dataset.explorerRoot = '';
    const input = document.createElement('input');
    input.dataset.explorerFilter = '';
    input.value = 'draft';
    root.appendChild(input);
    document.body.appendChild(root);
    const select = vi.spyOn(input, 'select');

    focusExplorerFilter({
      requestFrame: (callback) => {
        callback(0);
        return 0;
      },
    });

    expect(document.activeElement).toBe(input);
    expect(select).toHaveBeenCalled();
  });
});

describe('focusActiveEditor', () => {
  it('focuses the WYSIWYG ProseMirror surface in WYSIWYG mode', () => {
    const surface = document.createElement('div');
    surface.dataset.testid = 'editor-surface-wysiwyg';
    const proseMirror = document.createElement('div');
    proseMirror.className = 'ProseMirror';
    proseMirror.tabIndex = -1;
    surface.appendChild(proseMirror);
    document.body.appendChild(surface);

    expect(
      focusActiveEditor({
        currentMode: 'Wysiwyg',
        sourceEditorView: null,
        sourceEditorContainer: null,
      }),
    ).toBe(true);
    expect(document.activeElement).toBe(proseMirror);
  });

  it('focuses CodeMirror before falling back to the source textarea', () => {
    const sourceEditorView = {
      focus: vi.fn(),
    };

    expect(
      focusActiveEditor({
        currentMode: 'Editor',
        sourceEditorView,
        sourceEditorContainer: null,
      }),
    ).toBe(true);
    expect(sourceEditorView.focus).toHaveBeenCalled();
  });

  it('falls back to a textarea in the source editor container', () => {
    const container = document.createElement('div');
    const textarea = document.createElement('textarea');
    container.appendChild(textarea);
    document.body.appendChild(container);

    expect(
      focusActiveEditor({
        currentMode: 'SplitView',
        sourceEditorView: null,
        sourceEditorContainer: container,
      }),
    ).toBe(true);
    expect(document.activeElement).toBe(textarea);
  });
});
