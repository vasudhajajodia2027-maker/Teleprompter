// Free-tier allowance, counted per browser in localStorage so the demo keeps
// working without an account. Pro users skip these checks entirely.
//   - recording on up to 10 different scripts (deleting a script does not
//     give its slot back; more takes on a counted script are always fine)
//   - 3 take downloads
// If storage can't be read or written, the action is allowed rather than
// blocked: a broken browser setting must never stop someone recording.
export const FREE_SCRIPT_LIMIT = 10;
export const FREE_DOWNLOAD_LIMIT = 3;
export const RECORDED_SCRIPTS_KEY = 'ft_free_recorded_scripts';
export const DOWNLOADS_KEY = 'ft_free_downloads';

export type LimitStore = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStore(): LimitStore | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// IDs of scripts that have had a take started, or null when unreadable.
function readRecorded(store: LimitStore | null): string[] | null {
  if (!store) return null;
  try {
    const raw = store.getItem(RECORDED_SCRIPTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return null;
  }
}

// Downloads used so far, or null when unreadable.
function readDownloads(store: LimitStore | null): number | null {
  if (!store) return null;
  try {
    const n = parseInt(store.getItem(DOWNLOADS_KEY) ?? '0', 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return null;
  }
}

export function canRecordScript(scriptId: string, store = defaultStore()): boolean {
  const recorded = readRecorded(store);
  return !recorded || recorded.includes(scriptId) || recorded.length < FREE_SCRIPT_LIMIT;
}

export function markScriptRecorded(scriptId: string, store = defaultStore()): void {
  const recorded = readRecorded(store);
  if (!store || !recorded || recorded.includes(scriptId)) return;
  try {
    store.setItem(RECORDED_SCRIPTS_KEY, JSON.stringify([...recorded, scriptId]));
  } catch {
    // storage full or blocked: the take still records
  }
}

export function scriptsLeft(store = defaultStore()): number {
  const recorded = readRecorded(store);
  return recorded ? Math.max(0, FREE_SCRIPT_LIMIT - recorded.length) : FREE_SCRIPT_LIMIT;
}

export function canDownload(store = defaultStore()): boolean {
  const used = readDownloads(store);
  return used === null || used < FREE_DOWNLOAD_LIMIT;
}

export function markDownloaded(store = defaultStore()): void {
  const used = readDownloads(store);
  if (!store || used === null) return;
  try {
    store.setItem(DOWNLOADS_KEY, String(used + 1));
  } catch {
    // storage full or blocked: the download already happened
  }
}

export function downloadsLeft(store = defaultStore()): number {
  const used = readDownloads(store);
  return used === null ? FREE_DOWNLOAD_LIMIT : Math.max(0, FREE_DOWNLOAD_LIMIT - used);
}
