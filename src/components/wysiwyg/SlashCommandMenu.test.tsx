import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SlashCommandMenu } from './SlashCommandMenu';

function createSlashEditor(
  coords: { top: number; bottom: number; left: number; right: number } = {
    top: 24,
    bottom: 42,
    left: 18,
    right: 18,
  },
) {
  const handlers = new Map<string, Set<() => void>>();
  const dom = document.createElement('div');

  const editor: any = {
    state: {
      selection: {
        from: 2,
        to: 2,
        empty: true,
        $from: {
          depth: 1,
          start: () => 1,
        },
      },
      doc: {
        textBetween: () => '/',
      },
    },
    view: {
      dom,
      coordsAtPos: () => coords,
    },
    on: vi.fn((name: string, handler: () => void) => {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name)?.add(handler);
    }),
    off: vi.fn((name: string, handler: () => void) => {
      handlers.get(name)?.delete(handler);
    }),
    emit: (name: string) => {
      handlers.get(name)?.forEach((handler) => handler());
    },
  };

  return editor;
}

function setSlashTextBefore(editor: any, textBefore: string) {
  const from = 1 + textBefore.length;
  editor.state.selection = {
    from,
    to: from,
    empty: true,
    $from: {
      depth: 1,
      start: () => 1,
    },
  };
  editor.state.doc.textBetween = () => textBefore;
}

describe('SlashCommandMenu', () => {
  const scrollCalls: Array<{ text: string; options: ScrollIntoViewOptions | boolean | undefined }> =
    [];
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;

  beforeEach(() => {
    scrollCalls.length = 0;
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(function scrollIntoView(
        this: HTMLElement,
        options?: ScrollIntoViewOptions | boolean,
      ) {
        scrollCalls.push({ text: this.textContent ?? '', options });
      }),
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: originalScrollIntoView,
    });
  });

  it('scrolls the newly active item into view while navigating with arrow keys', async () => {
    const editor = createSlashEditor();

    render(<SlashCommandMenu editor={editor} />);

    act(() => {
      editor.emit('update');
    });

    expect(await screen.findByRole('menu', { name: /insert block/i })).toBeInTheDocument();

    for (let index = 0; index < 10; index += 1) {
      fireEvent.keyDown(editor.view.dom, { key: 'ArrowDown' });
    }

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /table/i })).toHaveAttribute(
        'data-active',
        'true',
      );
    });

    const lastScrollCall = scrollCalls[scrollCalls.length - 1];
    expect(lastScrollCall?.text).toMatch(/table/i);
    expect(lastScrollCall?.options).toEqual({ block: 'nearest' });
  });

  it('does not open for API route slashes after an HTTP method', async () => {
    const editor = createSlashEditor();
    setSlashTextBefore(editor, 'DELETE /api');

    render(<SlashCommandMenu editor={editor} />);

    act(() => {
      editor.emit('update');
    });

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: /insert block/i })).not.toBeInTheDocument();
    });
  });

  it('flips the menu above the caret when there is no room below', async () => {
    // Caret near the bottom of the viewport: ~12px of space below, ~744px above.
    // jsdom defaults innerHeight=768; the menu needs the room above to avoid clipping.
    const editor = createSlashEditor({ top: 740, bottom: 756, left: 18, right: 18 });

    // jsdom doesn't compute layout; stub offsetHeight so the placement effect
    // sees a non-zero menu height.
    const offsetHeightSpy = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(360);

    render(<SlashCommandMenu editor={editor} />);

    act(() => {
      editor.emit('update');
    });

    const menu = await screen.findByRole('menu', { name: /insert block/i });
    await waitFor(() => {
      expect(menu).toHaveAttribute('data-placement', 'above');
    });
    expect(menu.style.bottom).not.toBe('');
    expect(menu.style.top).toBe('');

    // Item order should be preserved — Text is still first, not reversed.
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveTextContent(/text/i);

    offsetHeightSpy.mockRestore();
  });

  it('keeps the menu below the caret when there is room', async () => {
    const editor = createSlashEditor({ top: 24, bottom: 42, left: 18, right: 18 });
    const offsetHeightSpy = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockReturnValue(360);

    render(<SlashCommandMenu editor={editor} />);

    act(() => {
      editor.emit('update');
    });

    const menu = await screen.findByRole('menu', { name: /insert block/i });
    await waitFor(() => {
      expect(menu).toHaveAttribute('data-placement', 'below');
    });
    expect(menu.style.top).not.toBe('');
    expect(menu.style.bottom).toBe('');

    offsetHeightSpy.mockRestore();
  });
});
