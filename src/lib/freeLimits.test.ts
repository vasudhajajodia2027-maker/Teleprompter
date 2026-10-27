import { describe, expect, it } from 'vitest';
import {
  canDownload,
  canRecordScript,
  downloadsLeft,
  DOWNLOADS_KEY,
  markDownloaded,
  markScriptRecorded,
  RECORDED_SCRIPTS_KEY,
  scriptsLeft,
  type LimitStore,
} from './freeLimits';

const memoryStore = (initial: Record<string, string> = {}): LimitStore & { data: Record<string, string> } => {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
};

const brokenStore: LimitStore = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

const recordTen = (store: LimitStore) => {
  for (let i = 1; i <= 10; i++) markScriptRecorded(`s${i}`, store);
};

describe('script recording limit', () => {
  it('starts with all 10 scripts available', () => {
    const store = memoryStore();
    expect(scriptsLeft(store)).toBe(10);
    expect(canRecordScript('s1', store)).toBe(true);
  });

  it('counts each script once, however many takes it has', () => {
    const store = memoryStore();
    markScriptRecorded('s1', store);
    markScriptRecorded('s1', store);
    expect(scriptsLeft(store)).toBe(9);
    expect(JSON.parse(store.data[RECORDED_SCRIPTS_KEY])).toEqual(['s1']);
  });

  it('blocks an 11th new script', () => {
    const store = memoryStore();
    recordTen(store);
    expect(scriptsLeft(store)).toBe(0);
    expect(canRecordScript('s11', store)).toBe(false);
  });

  it('still allows more takes on a script already counted', () => {
    const store = memoryStore();
    recordTen(store);
    expect(canRecordScript('s3', store)).toBe(true);
  });

  it('treats a corrupted list as empty', () => {
    const store = memoryStore({ [RECORDED_SCRIPTS_KEY]: '{not json' });
    expect(canRecordScript('s1', store)).toBe(true);
    expect(scriptsLeft(memoryStore({ [RECORDED_SCRIPTS_KEY]: '{"a":1}' }))).toBe(10);
  });

  it('allows recording when storage is blocked', () => {
    expect(canRecordScript('s1', brokenStore)).toBe(true);
    expect(() => markScriptRecorded('s1', brokenStore)).not.toThrow();
    expect(scriptsLeft(brokenStore)).toBe(10);
    expect(canRecordScript('s1', null)).toBe(true);
  });
});

describe('download limit', () => {
  it('allows 3 downloads and blocks the 4th', () => {
    const store = memoryStore();
    for (let i = 0; i < 3; i++) {
      expect(canDownload(store)).toBe(true);
      markDownloaded(store);
    }
    expect(store.data[DOWNLOADS_KEY]).toBe('3');
    expect(downloadsLeft(store)).toBe(0);
    expect(canDownload(store)).toBe(false);
  });

  it('counts down the downloads left', () => {
    const store = memoryStore();
    markDownloaded(store);
    expect(downloadsLeft(store)).toBe(2);
  });

  it('treats a nonsense counter as zero', () => {
    expect(downloadsLeft(memoryStore({ [DOWNLOADS_KEY]: 'abc' }))).toBe(3);
    expect(downloadsLeft(memoryStore({ [DOWNLOADS_KEY]: '-4' }))).toBe(3);
  });

  it('allows downloads when storage is blocked', () => {
    expect(canDownload(brokenStore)).toBe(true);
    expect(() => markDownloaded(brokenStore)).not.toThrow();
    expect(downloadsLeft(brokenStore)).toBe(3);
  });
});
