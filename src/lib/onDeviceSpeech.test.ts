import { describe, expect, it } from 'vitest';
import { onDeviceStatus, scriptPhrases } from './onDeviceSpeech';

describe('scriptPhrases', () => {
  it('keeps long words without punctuation, once each, longest first', () => {
    const words = 'Welcome to Teleprompter, the teleprompter for founders. Teleprompter!'.split(' ');
    expect(scriptPhrases(words)).toEqual(['Teleprompter', 'teleprompter', 'founders', 'Welcome']);
  });

  it('skips short words and numbers', () => {
    expect(scriptPhrases(['the', 'and', '123456', 'quick'])).toEqual([]);
  });

  it('caps the list', () => {
    const words = Array.from({ length: 100 }, (_, i) => `wordnumber${i}`);
    expect(scriptPhrases(words, 10)).toHaveLength(10);
  });
});

describe('onDeviceStatus', () => {
  it('is unavailable where the browser has no on-device recognizer', async () => {
    expect(await onDeviceStatus('en-US')).toBe('unavailable');
  });
});
