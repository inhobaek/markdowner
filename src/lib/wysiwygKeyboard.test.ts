import { describe, expect, it, vi } from 'vitest';

import {
  focusCodeBlockLanguageSelectorOnArrowUp,
  shouldSuppressSyntheticImeEnter,
} from './wysiwygKeyboard';

describe('shouldSuppressSyntheticImeEnter', () => {
  it('suppresses synthetic Enter during an active composition', () => {
    const event = new Event('keydown') as KeyboardEvent;
    Object.defineProperty(event, 'key', { value: 'Enter' });

    expect(
      shouldSuppressSyntheticImeEnter(event, { isComposing: true, viewComposing: false }),
    ).toBe(true);
  });

  it('does not suppress real KeyboardEvent Enter presses', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });

    expect(
      shouldSuppressSyntheticImeEnter(event, { isComposing: true, viewComposing: true }),
    ).toBe(false);
  });

  it('uses the recent composition-end window for synthetic Enter', () => {
    const event = new Event('keydown') as KeyboardEvent;
    Object.defineProperty(event, 'key', { value: 'Enter' });

    expect(
      shouldSuppressSyntheticImeEnter(event, {
        isComposing: false,
        viewComposing: false,
        lastCompositionEndAt: 1_000,
        now: 1_250,
      }),
    ).toBe(true);
  });
});

describe('focusCodeBlockLanguageSelectorOnArrowUp', () => {
  it('focuses the code block language selector from the first line', () => {
    const trigger = document.createElement('button');
    trigger.dataset.codeBlockLanguageSelect = '';
    trigger.focus = vi.fn();
    const dom = document.createElement('div');
    dom.append(trigger);
    const event = {
      key: 'ArrowUp',
      altKey: false,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    const view = {
      state: {
        selection: {
          $from: {
            depth: 2,
            parentOffset: 0,
            parent: {
              type: { name: 'codeBlock' },
              textContent: 'const value = 1;',
            },
            before: vi.fn(() => 10),
          },
        },
      },
      nodeDOM: vi.fn(() => dom),
    };

    expect(focusCodeBlockLanguageSelectorOnArrowUp(view, event)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(trigger.focus).toHaveBeenCalled();
    expect(view.nodeDOM).toHaveBeenCalledWith(10);
  });

  it('ignores code block ArrowUp after the first line', () => {
    const event = {
      key: 'ArrowUp',
      altKey: false,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    const view = {
      state: {
        selection: {
          $from: {
            depth: 2,
            parentOffset: 12,
            parent: {
              type: { name: 'codeBlock' },
              textContent: 'first line\nsecond line',
            },
            before: vi.fn(),
          },
        },
      },
      nodeDOM: vi.fn(),
    };

    expect(focusCodeBlockLanguageSelectorOnArrowUp(view, event)).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(view.nodeDOM).not.toHaveBeenCalled();
  });
});
