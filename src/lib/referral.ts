// Which shared link brought the visitor here (?ref=reddit-newtubers, ?ref=ph).
// Kept for the browser tab so it survives moving between pages, and saved
// with a waitlist email. Clarity only sees it if analytics was accepted.

const REF_KEY = 'ft_ref';

declare global {
  interface Window {
    clarity?: (...args: unknown[]) => void;
  }
}

// Lowercase letters, digits and dashes, at most 40 characters; else null.
export function cleanRef(raw: string | null): string | null {
  if (!raw) return null;
  const ref = raw.trim().toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(ref) ? ref : null;
}

export function captureRef(search: string): void {
  const ref = cleanRef(new URLSearchParams(search).get('ref'));
  if (!ref) return;
  try {
    sessionStorage.setItem(REF_KEY, ref);
  } catch {}
}

export function getRef(): string | null {
  try {
    return cleanRef(sessionStorage.getItem(REF_KEY));
  } catch {
    return null;
  }
}

// A Clarity custom event, tagged with the ref so takes can be split by source.
export function trackEvent(name: string): void {
  if (!window.clarity) return;
  const ref = getRef();
  if (ref) window.clarity('set', 'ref', ref);
  window.clarity('event', name);
}
