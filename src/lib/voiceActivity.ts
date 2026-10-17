// Decides from microphone loudness (RMS, 0..1) whether the speaker is talking.
// Used for the "Speaking" indicator, and to scroll when word recognition is
// unavailable. Pure logic: feed it samples with timestamps, no browser APIs.

const CALIBRATION_MS = 1000;
const FLOOR_MIN = 0.003;
const FLOOR_MAX = 0.08;
const SPEECH_RATIO = 2.5; // speaking = louder than 2.5x the room's quiet level
const ATTACK_MS = 150; // must stay loud this long to count as speech
const RELEASE_MS = 600; // stays "speaking" this long after it goes quiet

export interface VoiceActivityState {
  floor: number; // estimated loudness of the quiet room
  calibrating: boolean;
  speaking: boolean;
}

export function createVoiceActivityDetector() {
  let floor = 0.008;
  let calibrationStart: number | null = null;
  let samples: number[] = [];
  let firstLoudAt: number | null = null;
  let lastLoudAt = -Infinity;
  let speaking = false;

  const clampFloor = (v: number) => Math.min(FLOOR_MAX, Math.max(FLOOR_MIN, v));

  return {
    reset() {
      calibrationStart = null;
      samples = [];
      firstLoudAt = null;
      lastLoudAt = -Infinity;
      speaking = false;
    },

    update(rms: number, now: number): VoiceActivityState {
      // Calibration: the quiet level is the low end of the first second, so a
      // speaker who starts talking immediately does not count as "silence".
      if (calibrationStart === null) calibrationStart = now;
      const calibrating = now - calibrationStart < CALIBRATION_MS;
      if (calibrating) {
        samples.push(rms);
      } else if (samples.length > 0) {
        const sorted = [...samples].sort((a, b) => a - b);
        floor = clampFloor(sorted[Math.floor(sorted.length * 0.2)]);
        samples = [];
      }

      const loud = rms > floor * SPEECH_RATIO;
      if (loud) {
        if (firstLoudAt === null) firstLoudAt = now;
        if (now - firstLoudAt >= ATTACK_MS) lastLoudAt = now;
      } else {
        firstLoudAt = null;
      }
      speaking = now - lastLoudAt <= RELEASE_MS;

      // Keep tracking the room after calibration: drop quickly when it gets
      // quieter, creep up slowly when steady background noise grows (a fan),
      // and never learn from speech itself.
      if (!calibrating && !loud) {
        floor = clampFloor(rms < floor ? floor * 0.9 + rms * 0.1 : floor + (rms - floor) * 0.002);
      }

      return { floor, calibrating, speaking };
    },
  };
}
