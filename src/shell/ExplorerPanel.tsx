import {
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  FilePlus,
  FileText,
  FolderOpen,
  ListCollapse,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { OpenEditorItem } from '@/lib/shellModel';
import { cn } from '@/lib/utils';

type ExplorerSectionId = 'editors' | 'workspace' | 'recent';
type ExplorerRenameScope = 'open-editor' | 'recent';

const COLLAPSED_SECTIONS_STORAGE_KEY = 'markdowner.explorer.collapsedSections';

export type { OpenEditorItem } from '@/lib/shellModel';

export interface ExplorerPanelProps {
  busy: boolean;
  workspaceName: string | null;
  workspaceFilter: string;
  onWorkspaceFilterChange: (value: string) => void;
  workspaceTreeLength: number;
  filteredWorkspaceTreeLength: number;
  openEditors: OpenEditorItem[];
  recentDocuments: string[];
  activeDocumentPath: string | null;
  rootDir: string | null;
  onNewDocument?: () => void;
  onOpenDocument?: () => void;
  onOpenWorkspace?: () => void;
  onCollapseWorkspaceFolders?: () => void;
  onSelectOpenEditor: (id: string) => void;
  onCloseOpenEditor: (id: string) => void;
  onOpenRecentDocument: (path: string) => void;
  onRenameFile: (path: string, newName: string) => Promise<void> | void;
  renderWorkspaceTreeNodes: () => ReactNode;
  displayFileName: (path: string) => string;
  displayWorkspacePath: (path: string, rootDir: string | null) => string;
}

export function ExplorerPanel({
  busy,
  workspaceName,
  workspaceFilter,
  onWorkspaceFilterChange,
  workspaceTreeLength,
  filteredWorkspaceTreeLength,
  openEditors,
  recentDocuments,
  activeDocumentPath,
  rootDir,
  onNewDocument,
  onOpenDocument,
  onOpenWorkspace,
  onCollapseWorkspaceFolders,
  onSelectOpenEditor,
  onCloseOpenEditor,
  onOpenRecentDocument,
  onRenameFile,
  renderWorkspaceTreeNodes,
  displayFileName,
  displayWorkspacePath,
}: ExplorerPanelProps) {
  const workspaceSectionTitle = workspaceName ? workspaceName.toUpperCase() : 'NO FOLDER OPENED';
  const [collapsedSections, setCollapsedSections] = useState<Record<ExplorerSectionId, boolean>>(
    readCollapsedSections,
  );
  const [renameState, setRenameState] = useState<{
    scope: ExplorerRenameScope;
    path: string;
    value: string;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    scope: ExplorerRenameScope;
    path: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const contextMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const submittingRenameKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        COLLAPSED_SECTIONS_STORAGE_KEY,
        JSON.stringify(collapsedSections),
      );
    } catch {
      // Ignore quota / privacy-mode errors.
    }
  }, [collapsedSections]);

  useEffect(() => {
    if (!contextMenu) return;

    contextMenuButtonRef.current?.focus();

    const closeContextMenu = () => setContextMenu(null);
    const closeContextMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('click', closeContextMenu);
    window.addEventListener('keydown', closeContextMenuOnEscape);
    return () => {
      window.removeEventListener('click', closeContextMenu);
      window.removeEventListener('keydown', closeContextMenuOnEscape);
    };
  }, [contextMenu]);

  const toggleSection = useCallback((id: ExplorerSectionId) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const openContextMenu = (
    scope: ExplorerRenameScope,
    path: string | null,
    name: string,
    event: ReactMouseEvent<HTMLElement>,
  ) => {
    if (!path) return;
    event.preventDefault();
    event.stopPropagation();
    clearBrowserTextSelection();
    setContextMenu({
      scope,
      path,
      name,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const renameKey = (scope: ExplorerRenameScope, path: string) => `${scope}:${path}`;

  const cancelRename = (scope: ExplorerRenameScope, path: string) => {
    if (submittingRenameKeyRef.current === renameKey(scope, path)) return;
    setRenameState((current) =>
      current?.scope === scope && current.path === path ? null : current,
    );
  };

  const commitRename = async (scope: ExplorerRenameScope, path: string, originalName: string) => {
    const value =
      renameState?.scope === scope && renameState.path === path ? renameState.value.trim() : '';
    if (!value || value === originalName) {
      setRenameState((current) =>
        current?.scope === scope && current.path === path ? null : current,
      );
      return;
    }

    const key = renameKey(scope, path);
    submittingRenameKeyRef.current = key;
    try {
      await onRenameFile(path, value);
    } finally {
      submittingRenameKeyRef.current = null;
      setRenameState((current) =>
        current?.scope === scope && current.path === path ? null : current,
      );
    }
  };

  const editorsCollapsed = collapsedSections.editors;
  const workspaceCollapsed = collapsedSections.workspace;
  const recentCollapsed = collapsedSections.recent;

  return (
    <div className="flex min-h-0 flex-1 select-none flex-col" onKeyDown={handleExplorerKeyDown}>
      <div className="flex h-9 shrink-0 items-center justify-between px-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground">
          EXPLORER
        </div>
        <div className="flex items-center gap-0.5">
          {onNewDocument ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="New File in Explorer"
              title="New File"
              disabled={busy}
              onClick={onNewDocument}
              className="h-6 w-6 rounded"
            >
              <FilePlus className="size-3.5" />
            </Button>
          ) : null}
          {onOpenDocument ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Open File"
              title="Open File"
              disabled={busy}
              onClick={onOpenDocument}
              className="h-6 w-6 rounded"
            >
              <FileText className="size-3.5" />
            </Button>
          ) : null}
          {onOpenWorkspace ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Open Workspace"
              title="Open Workspace"
              disabled={busy}
              onClick={onOpenWorkspace}
              className="h-6 w-6 rounded"
            >
              <FolderOpen className="size-3.5" />
            </Button>
          ) : null}
          {onCollapseWorkspaceFolders ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Collapse All"
              title="Collapse All"
              disabled={busy || workspaceTreeLength === 0}
              onClick={onCollapseWorkspaceFolders}
              className="h-6 w-6 rounded"
            >
              <ListCollapse className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <section className="explorer-section border-t border-sidebar-border/70">
        <button
          type="button"
          className="explorer-section-header w-full text-left hover:bg-sidebar-accent/40"
          aria-expanded={!editorsCollapsed}
          aria-controls="explorer-section-editors"
          onClick={() => toggleSection('editors')}
        >
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform',
              editorsCollapsed && '-rotate-90',
            )}
            aria-hidden="true"
          />
          <span className="truncate">OPEN EDITORS</span>
        </button>
        {editorsCollapsed ? null : (
          <div
            id="explorer-section-editors"
            data-testid="explorer-open-editors"
            className="flex flex-col py-1"
          >
            {openEditors.length === 0 ? (
              <p className="px-5 py-1.5 text-xs text-muted-foreground/70">No open editors</p>
            ) : (
              openEditors.map((item) => {
                const itemPath = item.path;
                const activeRenameState =
                  itemPath &&
                  renameState?.scope === 'open-editor' &&
                  renameState.path === itemPath
                    ? renameState
                    : null;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group flex min-h-6 items-center gap-1.5 px-2 text-xs',
                      item.isActive && 'bg-accent text-accent-foreground',
                    )}
                  >
                    {activeRenameState && itemPath ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left">
                        <FileText
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <ExplorerRenameInput
                          scope="open-editor"
                          path={itemPath}
                          value={activeRenameState.value}
                          label={`Rename ${item.name}`}
                          originalName={item.name}
                          onValueChange={(value) =>
                            setRenameState((current) =>
                              current?.scope === 'open-editor' && current.path === itemPath
                                ? { ...current, value }
                                : current,
                            )
                          }
                          onCancel={cancelRename}
                          onCommit={commitRename}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
                        aria-label="Switch to open editor"
                        data-explorer-row=""
                        title={item.path ?? item.name}
                        onClick={() => onSelectOpenEditor(item.id)}
                        onMouseDown={(event) => {
                          if (event.button === 2) {
                            openContextMenu('open-editor', item.path, item.name, event);
                          }
                        }}
                        onContextMenu={(event) =>
                          openContextMenu('open-editor', item.path, item.name, event)
                        }
                      >
                        <FileText
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className={cn('truncate', item.missing && 'line-through opacity-70')}>
                          {item.name}
                        </span>
                        {item.isDirty ? <span aria-label="Unsaved changes">•</span> : null}
                      </button>
                    )}
                    <button
                      type="button"
                      className="flex size-5 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100"
                      aria-label="Close open editor"
                      title={`Close ${item.name}`}
                      onClick={() => onCloseOpenEditor(item.id)}
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      <section
        className={cn(
          'explorer-section flex flex-col border-t border-sidebar-border/70',
          workspaceCollapsed ? 'shrink-0' : 'min-h-0 flex-1',
        )}
      >
        <button
          type="button"
          className="explorer-section-header w-full text-left hover:bg-sidebar-accent/40"
          aria-expanded={!workspaceCollapsed}
          aria-controls="explorer-section-workspace"
          onClick={() => toggleSection('workspace')}
        >
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform',
              workspaceCollapsed && '-rotate-90',
            )}
            aria-hidden="true"
          />
          <span className="truncate">{workspaceSectionTitle}</span>
        </button>
        {workspaceCollapsed ? null : workspaceTreeLength === 0 ? (
          <p className="px-5 py-1.5 text-xs text-muted-foreground/70">
            Open a folder to populate the file tree.
          </p>
        ) : (
          <>
            <Input
              type="text"
              value={workspaceFilter}
              onChange={(event) => onWorkspaceFilterChange(event.target.value)}
              placeholder="Filter files"
              disabled={busy}
              aria-label="Filter files"
              data-explorer-filter=""
              className="mx-3 mb-1 h-7 w-[calc(100%-1.5rem)] select-text rounded-sm text-xs"
            />
            {filteredWorkspaceTreeLength === 0 ? (
              <p className="px-3 text-xs text-muted-foreground">No files match this filter.</p>
            ) : (
              <ScrollArea className="min-h-0 flex-1">
                <div
                  id="explorer-section-workspace"
                  data-testid="explorer-workspace-tree"
                  className="flex flex-col py-1"
                >
                  {renderWorkspaceTreeNodes()}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </section>

      <Separator />

      <section className="explorer-section flex shrink-0 flex-col border-t border-sidebar-border/70">
        <button
          type="button"
          className="explorer-section-header w-full text-left hover:bg-sidebar-accent/40"
          aria-expanded={!recentCollapsed}
          aria-controls="explorer-section-recent"
          onClick={() => toggleSection('recent')}
        >
          <ChevronDown
            className={cn(
              'size-3.5 shrink-0 transition-transform',
              recentCollapsed && '-rotate-90',
            )}
            aria-hidden="true"
          />
          <span className="truncate">RECENT</span>
        </button>
        {recentCollapsed ? null : recentDocuments.length === 0 ? (
          <p className="px-5 py-1.5 text-xs text-muted-foreground/70">
            Recent documents will appear here.
          </p>
        ) : (
          <div id="explorer-section-recent" className="flex flex-col py-1">
            {recentDocuments.slice(0, 5).map((path) => {
              const isActive = path === activeDocumentPath;
              const name = displayFileName(path);
              const activeRenameState =
                renameState?.scope === 'recent' && renameState.path === path ? renameState : null;

              if (activeRenameState) {
                return (
                  <div
                    key={path}
                    className={cn(
                      'explorer-tree-row flex w-full items-center gap-1.5 text-left text-xs',
                      isActive && 'bg-accent text-accent-foreground',
                    )}
                    title={path}
                  >
                    <FileText
                      className="size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <ExplorerRenameInput
                      scope="recent"
                      path={path}
                      value={activeRenameState.value}
                      label={`Rename ${name}`}
                      originalName={name}
                      onValueChange={(value) =>
                        setRenameState((current) =>
                          current?.scope === 'recent' && current.path === path
                            ? { ...current, value }
                            : current,
                        )
                      }
                      onCancel={cancelRename}
                      onCommit={commitRename}
                    />
                  </div>
                );
              }

              return (
                <button
                  key={path}
                  type="button"
                  className={cn(
                    'explorer-tree-row flex w-full items-center gap-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50',
                    isActive && 'bg-accent text-accent-foreground',
                  )}
                  data-explorer-row=""
                  onClick={() => onOpenRecentDocument(path)}
                  onMouseDown={(event) => {
                    if (event.button === 2) {
                      openContextMenu('recent', path, name, event);
                    }
                  }}
                  onContextMenu={(event) => openContextMenu('recent', path, name, event)}
                  disabled={busy}
                  title={path}
                >
                  <FileText
                    className="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">{name}</span>
                  <span className="sr-only" aria-hidden="true">
                    {displayWorkspacePath(path, rootDir)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
      {contextMenu
        ? createPortal(
            <div
              role="menu"
              aria-label={`File actions for ${contextMenu.name}`}
              className="fixed z-[1000] min-w-32 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <button
                ref={contextMenuButtonRef}
                type="button"
                role="menuitem"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                onClick={() => {
                  setRenameState({
                    scope: contextMenu.scope,
                    path: contextMenu.path,
                    value: contextMenu.name,
                  });
                  setContextMenu(null);
                }}
              >
                Rename
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ExplorerRenameInput({
  scope,
  path,
  value,
  label,
  originalName,
  onValueChange,
  onCancel,
  onCommit,
}: {
  scope: ExplorerRenameScope;
  path: string;
  value: string;
  label: string;
  originalName: string;
  onValueChange: (value: string) => void;
  onCancel: (scope: ExplorerRenameScope, path: string) => void;
  onCommit: (scope: ExplorerRenameScope, path: string, originalName: string) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      aria-label={label}
      className="min-w-0 flex-1 select-text rounded-sm border border-ring bg-background px-1 py-0 text-xs text-foreground outline-none"
      onChange={(event) => onValueChange(event.target.value)}
      onBlur={() => onCancel(scope, path)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel(scope, path);
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          void onCommit(scope, path, originalName);
        }
      }}
    />
  );
}

function clearBrowserTextSelection() {
  window.getSelection()?.removeAllRanges();
}

function readCollapsedSections(): Record<ExplorerSectionId, boolean> {
  const defaults: Record<ExplorerSectionId, boolean> = {
    editors: false,
    workspace: false,
    recent: false,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(COLLAPSED_SECTIONS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<ExplorerSectionId, boolean>>;
    return {
      editors: Boolean(parsed.editors),
      workspace: Boolean(parsed.workspace),
      recent: Boolean(parsed.recent),
    };
  } catch {
    return defaults;
  }
}

function handleExplorerKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
  if (
    event.key === 'ArrowDown' &&
    (event.metaKey || event.ctrlKey) &&
    !event.altKey &&
    !event.shiftKey
  ) {
    const active = (event.target as HTMLElement | null) ?? null;
    if (active?.matches('[data-explorer-row]')) {
      event.preventDefault();
      active.click();
    }
    return;
  }

  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const root = event.currentTarget;
  const active = (event.target as HTMLElement | null) ?? null;
  if (!active) return;
  const onFilter = active.matches('[data-explorer-filter]');
  const onRow = active.matches('[data-explorer-row]');
  if (!onFilter && !onRow) return;

  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-explorer-row]'));
  if (rows.length === 0) return;

  if (onFilter) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      rows[0].focus();
    }
    return;
  }

  const currentIndex = rows.indexOf(active);
  if (currentIndex < 0) return;

  if (event.key === 'ArrowDown') {
    const next = rows[Math.min(currentIndex + 1, rows.length - 1)];
    if (next && next !== active) {
      event.preventDefault();
      next.focus();
    }
    return;
  }

  if (currentIndex === 0) {
    const filter = root.querySelector<HTMLInputElement>('[data-explorer-filter]');
    if (filter) {
      event.preventDefault();
      filter.focus();
      filter.select();
    }
    return;
  }

  const prev = rows[currentIndex - 1];
  if (prev) {
    event.preventDefault();
    prev.focus();
  }
}
