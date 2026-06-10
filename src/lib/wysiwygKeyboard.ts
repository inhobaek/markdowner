type KeyboardLikeEvent = {
  key?: string;
  altKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  isTrusted?: boolean;
  preventDefault?: () => void;
};

type CompositionState = {
  isComposing: boolean;
  viewComposing?: boolean;
  lastCompositionEndAt?: number;
  now?: number;
};

type DuplicateImeTextInputState = {
  from: number;
  to: number;
  text: string;
  isComposing: boolean;
  lastCompositionEndAt?: number;
  /**
   * Latest `compositionupdate` data of the IN-FLIGHT composition; null or
   * undefined when no composition is active. Distinguishes the WebKit echo
   * (which re-inserts the PREVIOUS syllable while the current composition
   * holds different data) from a legitimately repeated character, whose
   * insertion IS the current composition's data (ㅐㅐㅐ, ㅋㅋㅋ, 나나).
   */
  compositionData?: string | null;
  /** `compositionend` data of the most recently committed composition. */
  lastCompositionData?: string;
  now?: number;
  textBetween: (from: number, to: number, blockSeparator?: string, leafText?: string) => string;
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
const DUPLICATE_TEXT_INPUT_COMPOSITION_WINDOW_MS = 200;

export function shouldSuppressSyntheticImeEnter(
  event: KeyboardLikeEvent,
  state: CompositionState,
): boolean {
  if (event.key !== 'Enter') return false;
  // Real keyboard presses are never suppressed. We accept TWO signals as
  // proof of "this is a real Enter":
  //
  //   (1) `event instanceof KeyboardEvent` — the original guard. Synthetic
  //       Enters from ProseMirror's `readDOMChange` are built via
  //       `document.createEvent("Event")` and fail this check.
  //   (2) `event.isTrusted === true` — a fallback for WebViews where the
  //       constructor check is unreliable (some Tauri/WKWebView builds
  //       wrap keydown events). Synthetic `createEvent` events have
  //       isTrusted === false, so this is still a strict distinction.
  //
  // Either signal alone is sufficient; we used to require (1) and that
  // false-negatived enough real Enter presses after Korean IME to leave
  // users staring at a caret that wouldn't insert a newline.
  if (isNativeKeyboardEvent(event)) return false;
  if (event.isTrusted === true) return false;

  const now = state.now ?? Date.now();
  const lastCompositionEndAt = state.lastCompositionEndAt ?? Number.NEGATIVE_INFINITY;
  return (
    state.isComposing ||
    Boolean(state.viewComposing) ||
    now - lastCompositionEndAt < SYNTHETIC_ENTER_COMPOSITION_WINDOW_MS
  );
}

/**
 * WebKit's Korean IME can dispatch an extra pure insertion immediately after
 * the legitimate replacement that commits a syllable. When the inserted text
 * exactly matches the text before the cursor during the composition window,
 * swallowing it prevents `# 안녕하세요` from becoming `# 안안녕하세요`.
 *
 * The echo must be told apart from the user legitimately typing the same
 * character twice in a row — ㅐㅐㅐ ("ooo" on a 2-set layout), ㅋㅋㅋ, the
 * second 나 of 바나나 — which produces the exact same "pure insertion equal to
 * the preceding text" shape. Two discriminators, both rooted in what the echo
 * IS (a stray copy of the just-committed syllable):
 *
 *   - While a composition is in flight, a legitimate repeat's insertion IS
 *     that composition's own data (compositionupdate fires before the DOM
 *     mutation), whereas the echo replays the PREVIOUS syllable while the
 *     current composition holds different data. Equal data ⇒ keep.
 *   - With no composition in flight (the post-commit tail window), only the
 *     just-committed syllable can echo, so the insertion must match the last
 *     compositionend data to be suppressed.
 */
export function shouldSuppressDuplicateImeTextInput(
  state: DuplicateImeTextInputState,
): boolean {
  if (state.from !== state.to || state.text.length === 0) return false;

  const now = state.now ?? Date.now();
  const lastCompositionEndAt = state.lastCompositionEndAt ?? Number.NEGATIVE_INFINITY;
  const isInCompositionWindow =
    state.isComposing ||
    now - lastCompositionEndAt < DUPLICATE_TEXT_INPUT_COMPOSITION_WINDOW_MS;

  if (!isInCompositionWindow) return false;

  if (state.compositionData != null) {
    if (state.compositionData === state.text) return false;
  } else if (state.lastCompositionData !== undefined) {
    if (state.lastCompositionData !== state.text) return false;
  }

  const start = Math.max(0, state.from - state.text.length);
  return state.textBetween(start, state.from, '\n', '\n') === state.text;
}

type TableCaretCorrectionInput = {
  /** Caret position captured at compositionstart, or null if it began outside a cell. */
  anchor: number | null;
  /** Length of the text committed by this composition (compositionend `data`). */
  committedLength: number;
  /** Where the caret actually sits now (after WebKit may have moved it). */
  currentCaret: number;
  /** Current document size, used to keep the corrected position in range. */
  docSize: number;
  /** Whether the caret is still inside a table cell. */
  insideTableCell: boolean;
};

/**
 * Core primitive: if the caret has jumped BACKWARD to before `expected` while
 * inside a table cell, return `expected` (clamped to the doc); otherwise null.
 * This is a strict no-op in the healthy case — in Chrome / plain text the caret
 * already sits at or past `expected`, so nothing moves and composition is never
 * disturbed.
 */
function repairBackwardJump(
  expected: number | null,
  currentCaret: number,
  docSize: number,
  insideTableCell: boolean,
): number | null {
  if (expected === null || !insideTableCell) return null;
  if (currentCaret < expected && expected <= docSize) return expected;
  return null;
}

/**
 * Decide whether — and where — to repair the caret AFTER a CJK composition in a
 * table cell (`compositionend`). WebKit can reset the caret to the cell start
 * after committing the first syllable in a previously-empty cell, so the next
 * syllable lands in front of it and "안녕하세요" comes out "녕하세요안".
 *
 * Used as a fallback for the final syllable (which has no subsequent
 * compositionstart). See computeTableCaretCarryForward for the primary repair.
 */
export function computeTableCaretCorrection(input: TableCaretCorrectionInput): number | null {
  const { anchor, committedLength, currentCaret, docSize, insideTableCell } = input;
  if (anchor === null || committedLength <= 0) return null;
  return repairBackwardJump(anchor + committedLength, currentCaret, docSize, insideTableCell);
}

type TableCaretCarryForwardInput = {
  /** Where the PREVIOUS composition in this cell left the caret (anchor + len). */
  expectedEnd: number | null;
  /** Where the caret sits now, at the start of the NEXT composition. */
  currentCaret: number;
  docSize: number;
  insideTableCell: boolean;
};

/**
 * Primary repair for the WebKit table-cell reversal. WebKit resets the caret to
 * the cell start once, right after the first syllable commits, and the
 * `view.composing` flag stays true between syllables — so a compositionend-time
 * fix never runs during continuous typing. Instead we repair at the NEXT
 * syllable's compositionstart: if the caret has jumped back to before where the
 * previous syllable ended, move it forward to `expectedEnd` BEFORE the new
 * syllable composes, so it lands in the right place and the cascade is broken.
 *
 * Strict no-op when the caret is already at/after `expectedEnd` (Chrome, and
 * every syllable after the reset), so healthy composition is never touched.
 */
export function computeTableCaretCarryForward(
  input: TableCaretCarryForwardInput,
): number | null {
  const { expectedEnd, currentCaret, docSize, insideTableCell } = input;
  return repairBackwardJump(expectedEnd, currentCaret, docSize, insideTableCell);
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
