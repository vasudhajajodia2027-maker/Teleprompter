// Scripts store `updatedAt` as an ISO timestamp. Older saves hold fixed text
// such as "Just now" that never changed, so those count as "unknown".

export function nowStamp(): string {
  return new Date().toISOString();
}

export function editedTime(updatedAt: string | undefined): number {
  if (!updatedAt) return 0;
  const t = Date.parse(updatedAt);
  return Number.isNaN(t) ? 0 : t;
}

// "Edited 5 min ago", "Edited yesterday", "Edited 3 Oct"; '' when unknown.
export function formatEdited(updatedAt: string | undefined, now = Date.now()): string {
  const t = editedTime(updatedAt);
  if (!t) return '';
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return 'Edited just now';
  if (mins < 60) return `Edited ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Edited ${hours} hr ago`;
  if (hours < 48) return 'Edited yesterday';
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `Edited ${d.toLocaleDateString(undefined, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// "57 sec", "1 min 14 sec", "3 min"
export function formatReadTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} sec` : `${m} min`;
}
