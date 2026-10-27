// Background noise handling for the microphone.
//   off      - no browser processing: the natural sound of a good mic
//   standard - the browser's call-style noise suppression and level control
//   strong   - standard, plus RNNoise (an open-source noise remover that runs
//              in the page) on the recorded audio, which also removes voices
//              in the room, keyboard clicks and barking.
// The RNNoise files are copied into public/vendor/rnnoise (see SOURCE.txt).
export type NoiseMode = 'off' | 'standard' | 'strong';

export const NOISE_MODES: { value: NoiseMode; label: string; hint: string }[] = [
  { value: 'off', label: 'Noise: off', hint: 'Natural sound. Best with a good mic in a quiet room.' },
  { value: 'standard', label: 'Noise: standard', hint: 'Removes steady hum like fans and AC.' },
  { value: 'strong', label: 'Noise: strong', hint: 'Also removes voices, clicks and barking from the recording.' },
];

export const NOISE_MODE_KEY = 'ft_noise_mode';

export function readNoiseMode(): NoiseMode {
  try {
    const saved = localStorage.getItem(NOISE_MODE_KEY);
    if (saved === 'off' || saved === 'standard' || saved === 'strong') return saved;
  } catch {
    // storage blocked: use the default
  }
  return 'standard';
}

// Audio constraints for getUserMedia.
export function micAudioConstraints(mode: NoiseMode): MediaTrackConstraints {
  const processing = mode !== 'off';
  return { echoCancellation: processing, noiseSuppression: processing, autoGainControl: processing };
}

const RNNOISE_PROCESSOR = '@sapphi-red/web-noise-suppressor/rnnoise';
const VENDOR = '/vendor/rnnoise';

// WebAssembly SIMD support check (the same bytes wasm-feature-detect uses).
const SIMD_PROBE = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);

export interface DenoisedAudio {
  track: MediaStreamTrack;
  close: () => void;
}

// Runs a microphone track through RNNoise and returns the cleaned track.
// RNNoise works at 48 kHz, so it gets its own AudioContext at that rate.
// Throws if the browser can't run it; callers fall back to the raw track.
export async function createDenoisedAudio(input: MediaStreamTrack): Promise<DenoisedAudio> {
  const ctx = new AudioContext({ sampleRate: 48000 });
  try {
    const wasmUrl = WebAssembly.validate(SIMD_PROBE) ? `${VENDOR}/rnnoise_simd.wasm` : `${VENDOR}/rnnoise.wasm`;
    const [wasmBinary] = await Promise.all([
      fetch(wasmUrl).then((r) => {
        if (!r.ok) throw new Error(`RNNoise download failed (${r.status})`);
        return r.arrayBuffer();
      }),
      ctx.audioWorklet.addModule(`${VENDOR}/rnnoise-worklet.js`),
    ]);
    const source = ctx.createMediaStreamSource(new MediaStream([input]));
    const node = new AudioWorkletNode(ctx, RNNOISE_PROCESSOR, {
      channelCount: 1,
      channelCountMode: 'explicit',
      processorOptions: { maxChannels: 1, wasmBinary },
    });
    const destination = ctx.createMediaStreamDestination();
    source.connect(node).connect(destination);
    if (ctx.state === 'suspended') await ctx.resume();
    const track = destination.stream.getAudioTracks()[0];
    return {
      track,
      close: () => {
        node.port.postMessage('destroy');
        source.disconnect();
        track.stop();
        ctx.close().catch(() => {});
      },
    };
  } catch (err) {
    ctx.close().catch(() => {});
    throw err;
  }
}
