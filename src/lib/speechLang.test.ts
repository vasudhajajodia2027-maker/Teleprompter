import { describe, expect, it } from 'vitest';
import { defaultSpeechLang } from './speechLang';

describe('defaultSpeechLang', () => {
  it('keeps a saved choice over the browser language', () => {
    expect(defaultSpeechLang('en-GB', ['hi-IN'])).toBe('en-GB');
  });

  it('uses the first browser language that matches', () => {
    expect(defaultSpeechLang(null, ['en-US', 'en'])).toBe('en-US');
  });

  it('treats any Hindi browser language as hi-IN', () => {
    expect(defaultSpeechLang(null, ['hi'])).toBe('hi-IN');
  });

  it('falls back to English (India) when nothing matches', () => {
    expect(defaultSpeechLang(null, ['fr-FR', 'en-AU'])).toBe('en-IN');
  });

  it('ignores a saved value that is not one of the offered languages', () => {
    expect(defaultSpeechLang('xx-YY', ['en-GB'])).toBe('en-GB');
  });

  it('falls back to English (India) with no saved value and no browser languages', () => {
    expect(defaultSpeechLang(null, [])).toBe('en-IN');
  });
});
