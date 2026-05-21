import type { OpenTabsPayload } from './desktop';
import type { DocumentTab } from './documentTabs';
import type { SourceCursorLocation } from './modeCursor';

type BuildOpenTabsPayloadInput = {
  tabs: readonly DocumentTab[];
  activeTabId: string | null;
  cursorPositions: ReadonlyMap<string, SourceCursorLocation>;
};

export function buildOpenTabsPayload(
  input: BuildOpenTabsPayloadInput,
): OpenTabsPayload {
  const openTabs = input.tabs
    .filter((tab): tab is DocumentTab & { kind: 'document'; path: string } => {
      return tab.kind === 'document' && tab.path !== null;
    })
    .map((tab) => tab.path);
  const openTabSet = new Set(openTabs);
  const activeTabPath =
    input.activeTabId === null
      ? null
      : input.tabs.find(
          (tab) =>
            tab.id === input.activeTabId &&
            tab.kind === 'document' &&
            tab.path !== null,
        )?.path ?? null;
  const cursorPositions: OpenTabsPayload['cursorPositions'] = {};

  for (const [path, location] of input.cursorPositions.entries()) {
    if (!openTabSet.has(path)) continue;
    cursorPositions[path] = {
      line: location.line,
      column: location.column,
    };
  }

  return {
    openTabs,
    activeTabPath,
    cursorPositions,
  };
}
