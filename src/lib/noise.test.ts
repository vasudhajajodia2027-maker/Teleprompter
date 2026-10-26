import { describe, expect, it } from 'vitest';
import { micAudioConstraints, NOISE_MODES } from './noise';

describe('micAudioConstraints', () => {
  it('turns all browser processing off for "off"', () => {
    expect(micAudioConstraints('off')).toEqual({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  });

  it('keeps browser processing on for standard and strong', () => {
    for (const mode of ['standard', 'strong'] as const) {
      expect(micAudioConstraints(mode)).toEqual({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
    }
  });
});

describe('NOISE_MODES', () => {
  it('lists the three modes in order', () => {
    expect(NOISE_MODES.map((m) => m.value)).toEqual(['off', 'standard', 'strong']);
  });
});
