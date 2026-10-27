import { describe, expect, it } from 'vitest';
import { cleanRef } from './referral';

describe('cleanRef', () => {
  it('keeps a plain source tag, lowercased', () => {
    expect(cleanRef('Reddit-NewTubers')).toBe('reddit-newtubers');
  });

  it('drops anything with other characters', () => {
    expect(cleanRef('<script>')).toBeNull();
    expect(cleanRef('a b')).toBeNull();
  });

  it('drops empty and overlong values', () => {
    expect(cleanRef(null)).toBeNull();
    expect(cleanRef('')).toBeNull();
    expect(cleanRef('x'.repeat(41))).toBeNull();
  });
});
