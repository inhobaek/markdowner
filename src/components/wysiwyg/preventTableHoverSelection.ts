import { Extension } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

const pluginKey = new PluginKey('preventTableHoverSelection');
const normalizeKey = new PluginKey('normalizeSingleCellSelection');

/**
 * Drops `mousemove` events inside `<table>` regions when no mouse button is
 * held. prosemirror-tables' built-in cell-selection plugin tracks
 * mousedown/mousemove pairs to extend a CellSelection — when its mouseup
 * handler is missed (e.g. focus loss, the cursor leaving the editor between
 * gestures) the next idle mousemove can extend a stale selection. Swallowing
 * idle moves makes cell selection achievable only by explicit click + drag
 * or by Shift+arrow keys, matching the user expectation.
 *
 * The handler returns `false` (does not swallow) when any button is held so
 * legitimate drag selections still reach the table extension. Outside of
 * tables it is a complete no-op.
 *
 * Additionally registers a second plugin that normalises a *single-cell*
 * `CellSelection` down to a plain `TextSelection` inside that cell. A
 * single-cell CellSelection paints the `.selectedCell` overlay
 * (`color-mix(var(--primary) ...)`) across the whole cell, so when the user
 * clicks a cell and starts typing, the glyphs render against the primary
 * tint and look "inverted" — exactly the "테이블 생성 후 텍스트 입력할 때
 * 글자가 반전되는" report. Multi-cell selections (an intentional drag across
 * 2+ cells, used for row/column operations) are left untouched.
 */
export const PreventTableHoverSelection = Extension.create({
  name: 'preventTableHoverSelection',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleDOMEvents: {
            mousemove(_view, event) {
              const mouseEvent = event as MouseEvent;
              if (mouseEvent.buttons !== 0) return false;
              const target = mouseEvent.target as HTMLElement | null;
              if (!target) return false;
              if (target.closest('table')) {
                return true;
              }
              return false;
            },
          },
        },
      }),
      new Plugin({
        key: normalizeKey,
        // Re-map a single-cell CellSelection to a TextSelection at the head
        // cell on the next tick. We do it in appendTransaction so it runs
        // after prosemirror-tables has created the CellSelection (e.g. a
        // plain click some WebKit builds resolve to a one-cell
        // CellSelection) and before the view paints the overlay.
        appendTransaction: (_transactions, _oldState, newState) => {
          const { selection } = newState;
          if (!(selection instanceof CellSelection)) return null;
          // Preserve genuine multi-cell selections (row/column ops).
          if (selection.$anchorCell.pos !== selection.$headCell.pos) return null;
          // Land a text cursor at the start of the single selected cell's
          // content. `+1` steps inside the cell node onto its first child.
          const inside = selection.$headCell.pos + 1;
          const resolved = newState.doc.resolve(
            Math.min(inside, newState.doc.content.size),
          );
          return newState.tr.setSelection(TextSelection.near(resolved));
        },
      }),
    ];
  },
});
