import type { AppSnapshot } from './desktop';
import {
  createDocumentTab,
  findDocumentTabByPath,
  type DocumentTab,
} from './documentTabs';

type OpenSelectedDocumentTabsInput = {
  paths: readonly string[];
  currentTabs: readonly DocumentTab[];
  openPath: (path: string) => Promise<AppSnapshot>;
  createTabId: () => string;
  shouldAbort?: () => boolean;
};

type OpenSelectedDocumentTabsResult =
  | { kind: 'aborted' }
  | {
      kind: 'ready';
      additions: DocumentTab[];
      lastSnapshot: AppSnapshot | null;
      lastActiveId: string | null;
    };

export async function openSelectedDocumentTabs(
  input: OpenSelectedDocumentTabsInput,
): Promise<OpenSelectedDocumentTabsResult> {
  const additions: DocumentTab[] = [];
  let lastSnapshot: AppSnapshot | null = null;
  let lastActiveId: string | null = null;

  for (const path of input.paths) {
    const existing =
      findDocumentTabByPath(input.currentTabs, path) ??
      additions.find((tab) => tab.path === path);
    if (existing) {
      lastActiveId = existing.id;
      continue;
    }

    const next = await input.openPath(path);
    if (input.shouldAbort?.()) {
      return { kind: 'aborted' };
    }

    const tab = createDocumentTab({
      id: input.createTabId(),
      path: next.activeDocumentPath ?? path,
      name: next.activeDocumentName ?? path,
      source: next.activeDocumentSource ?? '',
    });
    additions.push(tab);
    lastSnapshot = next;
    lastActiveId = tab.id;
  }

  return {
    kind: 'ready',
    additions,
    lastSnapshot,
    lastActiveId,
  };
}
