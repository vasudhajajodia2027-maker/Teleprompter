import { cueWordFlags } from './voiceMatch';

// Turn a Markdown file into plain script text. Headings, bullets, quotes,
// rules and code marks are removed, links keep their text (brackets would
// otherwise turn them into silent notes), and **bold** becomes *stress*.
export function stripMarkdown(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => !/^\s*(```|~~~)/.test(line)) // code fence lines
    .filter((line) => !/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) // --- rules
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, '') // # headings
        .replace(/\s+#+\s*$/, '') // closing #s of a heading
        .replace(/^\s*>\s?/, '') // > quotes
        .replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, '') // bullets, 1. lists, [ ] tasks
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '') // images
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url)
        .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '*$2*') // **bold** -> *stress*
        .replace(/~~(.+?)~~/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A one-line preview of what is read aloud: no [notes], no *stress* marks.
// Cut at a word boundary, with "…" only when something was cut.
export function previewText(text: string, maxChars: number): string {
  const clean = text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= maxChars) return clean;
  const cut = clean.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : clean.slice(0, maxChars)).trimEnd()}…`;
}

// Words that are read aloud: not inside [notes], and containing at least one
// letter or digit (so "#", "—" and "-" don't count).
export function spokenWordCount(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  const isCue = cueWordFlags(words);
  return words.filter((w, i) => !isCue[i] && /[\p{L}\p{N}]/u.test(w)).length;
}

// Seconds of pauses written in the script: [PAUSE 2s], [PAUSE 1.5 sec],
// [pause 3 seconds]. A pause without a length adds nothing.
export function pauseSeconds(text: string): number {
  let total = 0;
  for (const m of text.matchAll(/\[\s*pause\b[^\]\d]*(\d+(?:\.\d+)?)\s*(?:s|secs?|seconds?)?\b[^\]]*\]/gi)) {
    total += parseFloat(m[1]);
  }
  return total;
}

// Spoken words at the given pace plus written pauses, in whole seconds.
export function readSeconds(text: string, wpm: number): number {
  return Math.round((spokenWordCount(text) / wpm) * 60 + pauseSeconds(text));
}

// "1m 05s", the format stored with each script.
export function formatStoredReadTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toString().padStart(2, '0')}s`;
}
