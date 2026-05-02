interface StatusBarProps {
  mode: string;
  theme: string;
  isDirty: boolean;
  workspaceName?: string | null;
  activeDocumentLabel?: string | null;
}

export function StatusBar({
  mode,
  theme,
  isDirty,
  workspaceName,
  activeDocumentLabel,
}: StatusBarProps) {
  return (
    <footer className="flex items-center justify-between px-3 py-1 border-t border-border bg-muted/50 text-xs text-muted-foreground h-6">
      <div className="flex items-center gap-4 min-w-0">
        <span>{isDirty ? 'Unsaved Changes' : 'Saved'}</span>
        {activeDocumentLabel ? (
          <span className="truncate" title={activeDocumentLabel}>
            {activeDocumentLabel}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span>{mode}</span>
        <span className="uppercase">{theme}</span>
        {workspaceName ? (
          <span title={`Workspace: ${workspaceName}`}>{workspaceName}</span>
        ) : null}
      </div>
    </footer>
  );
}
