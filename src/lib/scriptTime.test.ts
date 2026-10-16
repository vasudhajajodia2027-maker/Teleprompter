import { describe, expect, it } from 'vitest';
import { editedTime, formatEdited, formatReadTime } from './scriptTime';

const NOW = Date.parse('2026-10-16T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;

describe('edit times on the Library page', () => {
  it('shows recent edits relative to now', () => {
    expect(formatEdited(ago(10_000), NOW)).toBe('Edited just now');
    expect(formatEdited(ago(5 * MIN), NOW)).toBe('Edited 5 min ago');
    expect(formatEdited(ago(3 * 60 * MIN), NOW)).toBe('Edited 3 hr ago');
    expect(formatEdited(ago(30 * 60 * MIN), NOW)).toBe('Edited yesterday');
  });

  it('shows a date for older edits', () => {
    expect(formatEdited(ago(10 * 24 * 60 * MIN), NOW)).toMatch(/^Edited \d+ \w+|^Edited \w+ \d+/);
  });

  // Scripts saved before this change stored fixed text that never updated.
  it('shows nothing for old fixed labels or missing dates', () => {
    for (const legacy of ['Just now', 'Edited 10 mins ago', 'Saved preset', '', undefined]) {
      expect(formatEdited(legacy, NOW)).toBe('');
      expect(editedTime(legacy)).toBe(0);
    }
  });

  it('sorts real dates ahead of unknown ones', () => {
    expect(editedTime(ago(MIN))).toBeGreaterThan(editedTime('Just now'));
  });
});

describe('read time', () => {
  it('formats seconds and minutes', () => {
    expect(formatReadTime(57)).toBe('57 sec');
    expect(formatReadTime(74)).toBe('1 min 14 sec');
    expect(formatReadTime(180)).toBe('3 min');
  });
});
