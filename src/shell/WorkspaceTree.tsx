import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, FileText, FolderOpen } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { WorkspaceTreeNode } from '@/lib/workspaceTree';

type WorkspaceTreeProps = {
  nodes: readonly WorkspaceTreeNode[];
  activePath: string | null;
  collapsedKeys: readonly string[];
  filtering: boolean;
  onToggleFolder: (key: string) => void;
  onOpenFile: (path: string) => void;
  onRenameFile: (path: string, newName: string) => Promise<void> | void;
};

export function WorkspaceTree({
  nodes,
  activePath,
  collapsedKeys,
  filtering,
  onToggleFolder,
  onOpenFile,
  onRenameFile,
}: WorkspaceTreeProps) {
  const [renameState, setRenameState] = useState<{ path: string; value: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    path: string;
    name: string;
    x: number;
    y: number;
  } | null>(null);
  const submittingRenamePathRef = useRef<string | null>(null);
  const contextMenuButtonRef = useRef<HTMLButtonElement | null>(null);

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

  const cancelRename = (path: string) => {
    if (submittingRenamePathRef.current === path) return;
    setRenameState((current) => (current?.path === path ? null : current));
  };

  const commitRename = async (path: string, originalName: string) => {
    const value = renameState?.path === path ? renameState.value.trim() : '';
    if (!value || value === originalName) {
      setRenameState((current) => (current?.path === path ? null : current));
      return;
    }

    submittingRenamePathRef.current = path;
    try {
      await onRenameFile(path, value);
    } finally {
      submittingRenamePathRef.current = null;
      setRenameState((current) => (current?.path === path ? null : current));
    }
  };

  return (
    <>
      {nodes.map((node) => (
        <WorkspaceTreeNodeView
          key={node.key}
          node={node}
          depth={0}
          activePath={activePath}
          collapsedKeys={collapsedKeys}
          filtering={filtering}
          onToggleFolder={onToggleFolder}
          onOpenFile={onOpenFile}
          onRenameFile={onRenameFile}
          renameState={renameState}
          onRenameValueChange={(value) =>
            setRenameState((current) => (current ? { ...current, value } : current))
          }
          onCancelRename={cancelRename}
          onCommitRename={commitRename}
          onOpenContextMenu={(node, event) => {
            event.preventDefault();
            event.stopPropagation();
            clearBrowserTextSelection();
            setContextMenu({
              path: node.path,
              name: node.name,
              x: event.clientX,
              y: event.clientY,
            });
          }}
        />
      ))}
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
                    path: contextMenu.path,
                    value: fileNameWithoutExtension(contextMenu.name),
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
    </>
  );
}

type WorkspaceTreeNodeViewProps = Omit<WorkspaceTreeProps, 'nodes'> & {
  node: WorkspaceTreeNode;
  depth: number;
  renameState: { path: string; value: string } | null;
  onRenameValueChange: (value: string) => void;
  onCancelRename: (path: string) => void;
  onCommitRename: (path: string, originalName: string) => Promise<void>;
  onOpenContextMenu: (
    node: Extract<WorkspaceTreeNode, { kind: 'file' }>,
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void;
};

function WorkspaceTreeNodeView({
  node,
  depth,
  activePath,
  collapsedKeys,
  filtering,
  onToggleFolder,
  onOpenFile,
  onRenameFile,
  renameState,
  onRenameValueChange,
  onCancelRename,
  onCommitRename,
  onOpenContextMenu,
}: WorkspaceTreeNodeViewProps) {
  const activeRenameState =
    node.kind === 'file' && renameState?.path === node.path ? renameState : null;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeRenameState) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [activeRenameState]);

  if (node.kind === 'folder') {
    const collapsed = !filtering && collapsedKeys.includes(node.key);

    return (
      <div className="flex flex-col">
        <button
          type="button"
          className="explorer-tree-row flex w-full items-center gap-1.5 text-left text-xs text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-expanded={!collapsed}
          data-explorer-row=""
          onClick={() => onToggleFolder(node.key)}
          style={{ paddingLeft: `${4 + depth * 12}px` }}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <FolderOpen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{node.name}</span>
        </button>
        {!collapsed ? (
          <div className="flex flex-col">
            {node.children.map((child) => (
              <WorkspaceTreeNodeView
                key={child.key}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                collapsedKeys={collapsedKeys}
                filtering={filtering}
                onToggleFolder={onToggleFolder}
                onOpenFile={onOpenFile}
                onRenameFile={onRenameFile}
                renameState={renameState}
                onRenameValueChange={onRenameValueChange}
                onCancelRename={onCancelRename}
                onCommitRename={onCommitRename}
                onOpenContextMenu={onOpenContextMenu}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  const isActive = node.path === activePath;

  if (activeRenameState) {
    return (
      <div
        className={cn(
          'explorer-tree-row flex w-full items-center gap-1.5 text-xs',
          isActive && 'bg-accent text-accent-foreground',
        )}
        style={{ paddingLeft: `${24 + depth * 12}px` }}
      >
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={activeRenameState.value}
          aria-label={`Rename ${node.name}`}
          className="min-w-0 flex-1 select-text rounded-sm border border-ring bg-background px-1 py-0 text-xs text-foreground outline-none"
          onChange={(event) => onRenameValueChange(event.target.value)}
          onBlur={() => onCancelRename(node.path)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              onCancelRename(node.path);
              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              event.stopPropagation();
              void onCommitRename(node.path, node.name);
            }
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        'explorer-tree-row flex w-full items-center gap-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground',
      )}
      data-explorer-row=""
      onClick={() => onOpenFile(node.path)}
      onMouseDown={(event) => {
        if (event.button === 2) {
          onOpenContextMenu(node, event);
        }
      }}
      onContextMenu={(event) => onOpenContextMenu(node, event)}
      style={{ paddingLeft: `${24 + depth * 12}px` }}
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="truncate">{node.name}</span>
      <span className="sr-only" aria-hidden="true">
        {node.relativePath}
      </span>
    </button>
  );
}

function clearBrowserTextSelection() {
  window.getSelection()?.removeAllRanges();
}

function fileNameWithoutExtension(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}
