import type { EditorMode } from './desktop';

type RequestFrame = (callback: FrameRequestCallback) => number;

type FocusOptions = {
  doc?: Document;
  requestFrame?: RequestFrame;
};

type FocusActiveEditorInput = FocusOptions & {
  currentMode: EditorMode;
  sourceEditorView: { focus: () => void } | null;
  sourceEditorContainer: HTMLElement | null;
};

function getDocument(doc?: Document): Document {
  return doc ?? document;
}

function getRequestFrame(requestFrame?: RequestFrame): RequestFrame {
  return requestFrame ?? requestAnimationFrame;
}

export function focusExplorerTree(
  rememberedElement: HTMLElement | null,
  options: FocusOptions = {},
): boolean {
  const doc = getDocument(options.doc);

  const restoreLast = () => {
    if (
      rememberedElement &&
      rememberedElement.isConnected &&
      rememberedElement.closest('[data-explorer-root]')
    ) {
      rememberedElement.focus({ preventScroll: false });
      return true;
    }
    return false;
  };

  const focusFallback = () => {
    const root = doc.querySelector<HTMLElement>('[data-explorer-root]');
    if (!root) return false;
    const firstTreeButton = root.querySelector<HTMLButtonElement>(
      '[data-testid="explorer-workspace-tree"] button',
    );
    if (firstTreeButton) {
      firstTreeButton.focus();
      return true;
    }
    const firstOpenEditor = root.querySelector<HTMLButtonElement>(
      '[data-testid="explorer-open-editors"] button',
    );
    if (firstOpenEditor) {
      firstOpenEditor.focus();
      return true;
    }
    const filter = root.querySelector<HTMLInputElement>('[data-explorer-filter]');
    if (filter) {
      filter.focus();
      return true;
    }
    return false;
  };

  if (restoreLast() || focusFallback()) return true;
  getRequestFrame(options.requestFrame)(() => {
    if (restoreLast()) return;
    focusFallback();
  });
  return false;
}

export function focusOutlineTree(
  rememberedElement: HTMLElement | null,
  options: FocusOptions = {},
): boolean {
  const doc = getDocument(options.doc);

  const tryFocus = () => {
    const root = doc.querySelector<HTMLElement>('[data-outline-root]');
    if (!root) return false;

    if (
      rememberedElement &&
      rememberedElement.isConnected &&
      rememberedElement.closest('[data-outline-root]')
    ) {
      rememberedElement.focus({ preventScroll: false });
      return true;
    }

    const firstOutlineRow = root.querySelector<HTMLButtonElement>('[data-outline-row]');
    if (firstOutlineRow) {
      firstOutlineRow.focus();
      return true;
    }

    root.focus({ preventScroll: false });
    return true;
  };

  if (tryFocus()) return true;
  getRequestFrame(options.requestFrame)(() => {
    tryFocus();
  });
  return false;
}

export function focusExplorerFilter(options: FocusOptions = {}): void {
  const doc = getDocument(options.doc);

  getRequestFrame(options.requestFrame)(() => {
    const input = doc.querySelector<HTMLInputElement>(
      '[data-explorer-root] [data-explorer-filter]',
    );
    if (input) {
      input.focus();
      input.select();
    }
  });
}

export function focusActiveEditor(input: FocusActiveEditorInput): boolean {
  const doc = getDocument(input.doc);

  const tryFocus = () => {
    if (input.currentMode === 'Wysiwyg') {
      const proseMirror = doc.querySelector<HTMLElement>(
        '[data-testid="editor-surface-wysiwyg"] .ProseMirror',
      );
      if (proseMirror) {
        proseMirror.focus();
        return true;
      }
      return false;
    }
    if (input.sourceEditorView) {
      input.sourceEditorView.focus();
      return true;
    }
    const sourceTextarea = input.sourceEditorContainer?.querySelector('textarea');
    if (sourceTextarea instanceof HTMLTextAreaElement) {
      sourceTextarea.focus();
      return true;
    }
    return false;
  };

  if (tryFocus()) return true;
  getRequestFrame(input.requestFrame)(() => {
    tryFocus();
  });
  return false;
}
