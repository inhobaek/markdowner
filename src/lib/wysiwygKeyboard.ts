type KeyboardLikeEvent = {
  key?: string;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  preventDefault?: () => void;
};

type CompositionState = {
  isComposing: boolean;
  viewComposing?: boolean;
  lastCompositionEndAt?: number;
  now?: number;
};

type ProseMirrorResolvedPos = {
  depth: number;
  parentOffset: number;
  parent?: {
    type?: { name?: string };
    textContent?: string;
  };
  before: (depth: number) => number;
};

type ProseMirrorKeyboardView = {
  state?: {
    selection?: {
      $from?: ProseMirrorResolvedPos;
    };
  };
  nodeDOM?: (pos: number) => Node | null;
};

const SYNTHETIC_ENTER_COMPOSITION_WINDOW_MS = 500;

export function shouldSuppressSyntheticImeEnter(
  event: KeyboardLikeEvent,
  state: CompositionState,
): boolean {
  if (event.key !== 'Enter') return false;
  if (isNativeKeyboardEvent(event)) return false;

  const now = state.now ?? Date.now();
  const lastCompositionEndAt = state.lastCompositionEndAt ?? Number.NEGATIVE_INFINITY;
  return (
    state.isComposing ||
    Boolean(state.viewComposing) ||
    now - lastCompositionEndAt < SYNTHETIC_ENTER_COMPOSITION_WINDOW_MS
  );
}

export function focusCodeBlockLanguageSelectorOnArrowUp(
  view: ProseMirrorKeyboardView,
  event: KeyboardLikeEvent,
): boolean {
  if (
    event.key !== 'ArrowUp' ||
    event.altKey ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return false;
  }

  const $from = view.state?.selection?.$from;
  const parent = $from?.parent;
  if (!parent || parent.type?.name !== 'codeBlock' || !$from) return false;

  const previousText = parent.textContent?.slice(0, $from.parentOffset) ?? '';
  const isAtFirstLine = $from.parentOffset === 0 || !previousText.includes('\n');
  if (!isAtFirstLine) return false;

  const dom = view.nodeDOM?.($from.before($from.depth));
  if (typeof HTMLElement === 'undefined' || !(dom instanceof HTMLElement)) return false;

  const trigger = dom.querySelector('[data-code-block-language-select]');
  if (
    typeof HTMLButtonElement === 'undefined' ||
    !(trigger instanceof HTMLButtonElement) ||
    trigger.disabled
  ) {
    return false;
  }

  event.preventDefault?.();
  trigger.focus();
  return true;
}

function isNativeKeyboardEvent(event: KeyboardLikeEvent): boolean {
  return typeof KeyboardEvent !== 'undefined' && event instanceof KeyboardEvent;
}
