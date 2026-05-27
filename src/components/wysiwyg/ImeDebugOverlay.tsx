import { useEffect, useState } from 'react';

import {
  clearImeLog,
  imeDebugEnabled,
  subscribeImeLog,
  type ImeLogEntry,
} from '@/lib/imeDebug';

/**
 * Dev-only floating panel that shows the recent IME event stream so the CJK
 * composition sequence in Tauri's WebKit can be captured with a screenshot
 * (no devtools required). Renders nothing unless IME debug is enabled
 * (Vite dev build, or the `markdowner:imeDebug` localStorage flag), so it
 * never appears in production.
 */
export function ImeDebugOverlay() {
  const [entries, setEntries] = useState<ImeLogEntry[]>([]);
  const enabled = imeDebugEnabled();

  useEffect(() => {
    if (!enabled) return;
    return subscribeImeLog(setEntries);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      data-testid="ime-debug-overlay"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        zIndex: 9999,
        width: 360,
        maxHeight: 320,
        overflow: 'auto',
        background: 'rgba(20,20,24,0.92)',
        color: '#d6e2ff',
        font: '11px/1.45 ui-monospace, Menlo, monospace',
        border: '1px solid #3a3f4b',
        borderRadius: 8,
        padding: 8,
        boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <strong style={{ color: '#8fb6ff' }}>IME debug ({entries.length})</strong>
        <button
          type="button"
          onClick={clearImeLog}
          style={{
            background: '#2a2f3a',
            color: '#d6e2ff',
            border: '1px solid #3a3f4b',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 10,
            padding: '1px 6px',
          }}
        >
          clear
        </button>
      </div>
      {entries.length === 0 ? (
        <div style={{ opacity: 0.6 }}>
          Type Korean in a table cell — events appear here.
        </div>
      ) : (
        entries.map((e) => (
          <div key={e.seq} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <span style={{ color: '#7fd6a0' }}>{e.label}</span> {e.detail}
          </div>
        ))
      )}
    </div>
  );
}

export default ImeDebugOverlay;
