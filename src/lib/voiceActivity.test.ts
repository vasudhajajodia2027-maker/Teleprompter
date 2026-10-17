import { describe, expect, it } from 'vitest';
import { createVoiceActivityDetector } from './voiceActivity';

const QUIET = 0.005;
const VOICE = 0.06;
const FRAME = 16; // ~60 frames per second

// Feed `ms` of a constant level starting at `t`; returns the last state and end time.
function feed(d: ReturnType<typeof createVoiceActivityDetector>, level: number, t: number, ms: number) {
  let state = d.update(level, t);
  for (let now = t + FRAME; now <= t + ms; now += FRAME) state = d.update(level, now);
  return { state, end: t + ms };
}

describe('voice activity', () => {
  it('is not speaking in a quiet room', () => {
    const d = createVoiceActivityDetector();
    expect(feed(d, QUIET, 0, 3000).state.speaking).toBe(false);
  });

  it('detects speech after a quiet start', () => {
    const d = createVoiceActivityDetector();
    const quiet = feed(d, QUIET, 0, 1200);
    expect(feed(d, VOICE, quiet.end + FRAME, 400).state.speaking).toBe(true);
  });

  it('ignores a click shorter than 150 ms', () => {
    const d = createVoiceActivityDetector();
    const quiet = feed(d, QUIET, 0, 1200);
    expect(feed(d, VOICE, quiet.end + FRAME, 80).state.speaking).toBe(false);
  });

  it('keeps "speaking" through a short breath, then stops after 600 ms', () => {
    const d = createVoiceActivityDetector();
    const quiet = feed(d, QUIET, 0, 1200);
    const talk = feed(d, VOICE, quiet.end + FRAME, 500);
    expect(feed(d, QUIET, talk.end + FRAME, 300).state.speaking).toBe(true);
    expect(feed(d, QUIET, talk.end + FRAME + 300, 800).state.speaking).toBe(false);
  });

  // The old detector averaged the first second: talking right away made the
  // speaker's own voice the "silence" level and speech was never detected.
  it('still detects speech when the speaker talks during calibration', () => {
    const d = createVoiceActivityDetector();
    // 30% quiet, then talking for the rest of the first second
    const quiet = feed(d, QUIET, 0, 300);
    const talk = feed(d, VOICE, quiet.end + FRAME, 1500);
    expect(talk.state.floor).toBeLessThan(VOICE / 2.5);
    expect(talk.state.speaking).toBe(true);
  });

  it('adapts when steady background noise appears, without learning speech', () => {
    const d = createVoiceActivityDetector();
    const quiet = feed(d, QUIET, 0, 1200);
    const talk = feed(d, VOICE, quiet.end + FRAME, 5000);
    expect(talk.state.floor).toBeLessThan(0.01);
    expect(talk.state.speaking).toBe(true);
  });
});
