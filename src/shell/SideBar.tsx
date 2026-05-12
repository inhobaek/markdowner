import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export type SideBarPanel = 'files' | 'outline';

export interface OutlineItem {
  id: string;
  title: string;
  depth: number;
  titleStart: number;
  titleEnd: number;
  selectionStart: number;
  selectionEnd: number;
}

export interface SideBarProps {
  panel: SideBarPanel;
  isOpen: boolean;
  busy: boolean;
  workspaceFilter: string;
  onWorkspaceFilterChange: (value: string) => void;
  workspaceTreeLength: number;
  filteredWorkspaceTreeLength: number;
  recentDocuments: string[];
  activeDocumentPath: string | null;
  rootDir: string | null;
  onOpenRecentDocument: (path: string) => void;
  renderWorkspaceTreeNodes: () => ReactNode;
  displayFileName: (path: string) => string;
  displayWorkspacePath: (path: string, rootDir: string | null) => string;
  outlineItems: OutlineItem[];
  outlineFontSize: number;
  outlineRowSpacing: number;
  onSelectOutlineItem?: (item: OutlineItem) => void;
}

export function SideBar({
  panel,
  isOpen,
  busy,
  workspaceFilter,
  onWorkspaceFilterChange,
  workspaceTreeLength,
  filteredWorkspaceTreeLength,
  recentDocuments,
  activeDocumentPath,
  rootDir,
  onOpenRecentDocument,
  renderWorkspaceTreeNodes,
  displayFileName,
  displayWorkspacePath,
  outlineItems,
  outlineFontSize,
  outlineRowSpacing,
  onSelectOutlineItem,
}: SideBarProps) {
  const showOutline = panel === 'outline';
  const outlinePaddingY = Math.max(2, outlineRowSpacing + 2);

  return (
    <aside
      className={cn(
        'flex min-h-0 flex-col gap-5 overflow-y-auto border-r border-border bg-sidebar p-5 text-sidebar-foreground transition-opacity duration-300 ease-in-out',
        !isOpen && 'opacity-0 invisible overflow-hidden p-0 border-r-0',
      )}
    >
      {showOutline ? (
        <section className="flex min-h-0 flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Outline
          </div>
          {outlineItems.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No headings
            </p>
          ) : (
            <ScrollArea className="max-h-[520px] pr-2">
              <div
                data-testid="outline-list"
                className="flex flex-col"
                style={{ gap: `${outlineRowSpacing}px` }}
              >
                {outlineItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center rounded-md border border-transparent px-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      fontSize: `${outlineFontSize}px`,
                      lineHeight: 1.25,
                      paddingTop: `${outlinePaddingY}px`,
                      paddingBottom: `${outlinePaddingY}px`,
                      paddingLeft: `${8 + Math.max(0, item.depth - 1) * 12}px`,
                    }}
                    disabled={busy}
                    onClick={() => onSelectOutlineItem?.(item)}
                  >
                    <span className="truncate font-medium">{item.title}</span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </section>
      ) : (
        <>
          <section className="flex min-h-0 flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Files
            </div>
            {workspaceTreeLength === 0 ? (
              <p className="text-xs text-muted-foreground">
                Open a folder to populate the file tree.
              </p>
            ) : (
              <>
                <Input
                  type="text"
                  value={workspaceFilter}
                  onChange={(event) => onWorkspaceFilterChange(event.target.value)}
                  placeholder="Search this workspace"
                  disabled={busy}
                  aria-label="Filter files"
                />
                {filteredWorkspaceTreeLength === 0 ? (
                  <p className="text-xs text-muted-foreground">No files match this filter.</p>
                ) : (
                  <ScrollArea className="max-h-[360px] pr-2">
                    <div className="flex flex-col gap-1">
                      {renderWorkspaceTreeNodes()}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </section>

          <Separator />

          <section className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent
            </div>
            {recentDocuments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Recent documents will appear here.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {recentDocuments.slice(0, 5).map((path) => {
                  const isActive = path === activeDocumentPath;
                  return (
                    <button
                      key={path}
                      type="button"
                      className={cn(
                        'flex w-full flex-col items-start gap-1 rounded-md border border-transparent px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50',
                        isActive && 'border-border bg-accent text-accent-foreground',
                      )}
                      onClick={() => onOpenRecentDocument(path)}
                      disabled={busy}
                      title={path}
                    >
                      <span className="w-full font-medium leading-snug break-all">
                        {displayFileName(path)}
                      </span>
                      <span className="w-full text-xs leading-snug text-muted-foreground break-all">
                        {displayWorkspacePath(path, rootDir)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </aside>
  );
}
