import { normalizeFinalNewline } from './sourceText';

export type DocumentTabKind = 'document' | 'settings';

export type DocumentTab = {
  id: string;
  kind: DocumentTabKind;
  path: string | null;
  name: string;
  source: string;
  draft: string;
  missing: boolean;
};

export const SETTINGS_TAB_ID = '__markdowner_settings__';
export const SETTINGS_TAB_NAME = 'Settings';

type TabIdEntropy = {
  randomUUID?: (() => string) | null;
  now?: () => number;
  random?: () => number;
};

type CreateDocumentTabInput = {
  id: string;
  path: string | null;
  name?: string | null;
  source?: string | null;
  draft?: string | null;
  missing?: boolean;
};

type TabDirtyContext = {
  activeTabId: string | null;
  localDraft: string;
};

export function generateDocumentTabId(entropy: TabIdEntropy = {}): string {
  const randomUUID =
    'randomUUID' in entropy
      ? entropy.randomUUID
      : typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID.bind(crypto)
        : undefined;

  if (randomUUID) {
    return randomUUID();
  }

  const now = entropy.now ?? Date.now;
  const random = entropy.random ?? Math.random;
  return `tab-${now()}-${random().toString(36).slice(2)}`;
}

export function createDocumentTab(input: CreateDocumentTabInput): DocumentTab {
  const source = input.source ?? '';
  return {
    id: input.id,
    kind: 'document',
    path: input.path,
    name: input.name ?? 'Untitled',
    source,
    draft: input.draft ?? source,
    missing: input.missing ?? false,
  };
}

export function createSettingsTab(): DocumentTab {
  return {
    id: SETTINGS_TAB_ID,
    kind: 'settings',
    path: null,
    name: SETTINGS_TAB_NAME,
    source: '',
    draft: '',
    missing: false,
  };
}

export function findDocumentTabByPath(
  tabs: readonly DocumentTab[],
  path: string | null,
): DocumentTab | undefined {
  return tabs.find((tab) => tab.kind === 'document' && tab.path === path);
}

export function isDocumentTabDirty(tab: DocumentTab, context: TabDirtyContext): boolean {
  if (tab.kind !== 'document') return false;
  const live = tab.id === context.activeTabId ? context.localDraft : tab.draft;
  return normalizeFinalNewline(live) !== normalizeFinalNewline(tab.source);
}
