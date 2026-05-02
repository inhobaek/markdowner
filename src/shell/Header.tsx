import { ReactNode } from 'react';

interface HeaderProps {
  title?: ReactNode;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

export function Header({ title = 'Markdowner', leftContent, rightContent }: HeaderProps) {
  return (
    <header data-tauri-drag-region className="flex items-center justify-between px-4 border-b border-border bg-background select-none h-12 shrink-0">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        {/* Custom Window Controls spacer for macOS */}
        <div className="w-16 shrink-0" />
        {leftContent}
      </div>
      <div className="flex-1 text-center truncate px-2 font-semibold text-sm">
        {title}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 min-w-0">
        {rightContent}
      </div>
    </header>
  );
}
