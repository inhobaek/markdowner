import type { DocumentTab } from './documentTabs';
import { displayWorkspacePath } from './workspaceTree';

export interface OpenEditorItem {
  id: string;
  name: string;
  path: string | null;
  isActive: boolean;
  isDirty: boolean;
  missing: boolean;
}

export interface TabStripItem {
  id: string;
  kind: DocumentTab['kind'];
  name: string;
  isDirty: boolean;
  missing: boolean;
  shortcutLabel: string | null;
}

type DirtyResolver = (tab: DocumentTab) => boolean;

export function buildOpenEditorItems({
  tabs,
  activeTabId,
  isDirty,
}: {
  tabs: readonly DocumentTab[];
  activeTabId: string | null;
  isDirty: DirtyResolver;
}): OpenEditorItem[] {
  return tabs.map((tab) => ({
    id: tab.id,
    name: tab.name,
    path: tab.path,
    isActive: tab.id === activeTabId,
    isDirty: isDirty(tab),
    missing: tab.missing,
  }));
}

export function buildTabStripItems({
  tabs,
  isDirty,
}: {
  tabs: readonly DocumentTab[];
  isDirty: DirtyResolver;
}): TabStripItem[] {
  return tabs.map((tab, index) => ({
    id: tab.id,
    kind: tab.kind,
    name: tab.name,
    isDirty: isDirty(tab),
    missing: tab.missing,
    shortcutLabel: index < 9 ? `⌘${index + 1}` : index === 9 ? '⌘0' : null,
  }));
}

export function buildDocumentMeta({
  activeDocumentPath,
  rootDir,
  activeDocumentOpen,
}: {
  activeDocumentPath: string | null;
  rootDir: string | null;
  activeDocumentOpen: boolean;
}): string {
  if (activeDocumentPath) {
    return displayWorkspacePath(activeDocumentPath, rootDir);
  }
  if (activeDocumentOpen) {
    return 'Save As to choose where this draft lives.';
  }
  return 'Open a workspace or a Markdown file to begin.';
}
