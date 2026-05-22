import type { Ref } from 'react';
import type { EditorView } from '@uiw/react-codemirror';

import { SourceEditorView } from '@/components/SourceEditorView';
import type { ThemeKind } from '@/lib/desktop';

interface SourceEditorPaneProps {
  value: string;
  extensions: unknown[];
  themeKind: ThemeKind;
  onChange: (value: string) => void;
  onStatistics: (stats: unknown) => void;
  onCreateEditor: (view: EditorView) => void;
  containerRef?: Ref<HTMLDivElement>;
}

export function SourceEditorPane({
  value,
  extensions,
  themeKind,
  onChange,
  onStatistics,
  onCreateEditor,
  containerRef,
}: SourceEditorPaneProps) {
  return (
    <SourceEditorView
      value={value}
      extensions={extensions}
      theme={themeKind === 'BuiltInDark' ? 'dark' : 'light'}
      onChange={onChange}
      onStatistics={onStatistics}
      onCreateEditor={onCreateEditor}
      containerRef={containerRef}
    />
  );
}
