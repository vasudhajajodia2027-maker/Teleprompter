// How My Scripts groups, orders and searches the library.

import { Script } from '../types';
import { editedTime } from './scriptTime';

export type LibrarySort = 'lastEdited' | 'az';

// Templates are starting points, not the user's own scripts.
export function splitTemplates(scripts: Script[]): { own: Script[]; templates: Script[] } {
  return {
    own: scripts.filter((s) => s.category !== 'template'),
    templates: scripts.filter((s) => s.category === 'template'),
  };
}

// Newest edit first (unknown edit times last), or A-Z by title. Returns a new list.
export function sortScripts(scripts: Script[], sort: LibrarySort): Script[] {
  const sorted = [...scripts];
  if (sort === 'az') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  } else {
    sorted.sort((a, b) => editedTime(b.updatedAt) - editedTime(a.updatedAt));
  }
  return sorted;
}

// The title for a duplicate: "Title (copy)", then "Title (copy 2)", ... Copying a
// copy numbers from the original name, and old "Copy of " prefixes are dropped.
export function copyTitle(title: string, existingTitles: string[]): string {
  const base =
    title
      .replace(/^(copy of\s+)+/i, '')
      .replace(/\s*\(copy(?:\s+\d+)?\)\s*$/i, '')
      .trim() || 'Untitled';
  const taken = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  let n = 1;
  let candidate = `${base} (copy)`;
  while (taken.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `${base} (copy ${n})`;
  }
  return candidate;
}

// Scripts whose title or text contains the query, ignoring case.
export function searchScripts(scripts: Script[], query: string): Script[] {
  const q = query.trim().toLowerCase();
  if (!q) return scripts;
  return scripts.filter((s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q));
}
