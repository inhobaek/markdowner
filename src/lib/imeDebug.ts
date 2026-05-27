/**
 * Lightweight IME diagnostics for the CJK-in-table input bugs that only
 * reproduce in Tauri's real WebKit engine (not Chrome, and not via synthetic
 * composition events — verified). To capture the real event sequence without
 * needing devtools, the events are mirrored into an in-app overlay that is
 * shown automatically in dev (`pnpm tauri dev`) and never in production
 * builds.
 *
 * Enable logging when EITHER:
 *   - the app is running a Vite dev build (`import.meta.env.DEV`), or
 *   - `localStorage['markdowner:imeDebug'] === '1'` (manual opt-in anywhere).
 */
export interface ImeLogEntry {
  seq: number;
  label: string;
  detail: string;
}

let cachedEnabled: boolean | null = null;
let seq = 0;
const ring: ImeLogEntry[] = [];
const RING_MAX = 60;
const listeners = new Set<(entries: ImeLogEntry[]) => void>();

function devMode(): boolean {
  try {
    // import.meta.env.DEV is true under the Vite dev server (pnpm tauri dev),
    // false in production bundles.
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

export function imeDebugEnabled(): boolean {
  if (cachedEnabled !== null) return cachedEnabled;
  let flag = false;
  try {
    flag =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('markdowner:imeDebug') === '1';
  } catch {
    flag = false;
  }
  cachedEnabled = flag || devMode();
  return cachedEnabled;
}

export function subscribeImeLog(listener: (entries: ImeLogEntry[]) => void): () => void {
  listeners.add(listener);
  listener(ring.slice());
  return () => {
    listeners.delete(listener);
  };
}

export function getImeLog(): ImeLogEntry[] {
  return ring.slice();
}

export function clearImeLog(): void {
  ring.length = 0;
  for (const l of listeners) l(ring.slice());
}

/**
 * Log an IME-related event with the current selection so we can see exactly
 * where each composed syllable lands in WebKit. `extra` carries
 * event-specific fields (composed data, key, etc.).
 */
export function imeLog(
  label: string,
  view: { state?: { selection?: { from?: number; to?: number } } } | null | undefined,
  extra: Record<string, unknown> = {},
): void {
  if (!imeDebugEnabled()) return;
  const sel = view?.state?.selection;
  const detail = JSON.stringify({ from: sel?.from, to: sel?.to, ...extra });
  // eslint-disable-next-line no-console
  console.log(`[IME] ${label}`, detail);
  ring.push({ seq: (seq += 1), label, detail });
  if (ring.length > RING_MAX) ring.shift();
  for (const l of listeners) l(ring.slice());
}
