// Chrome and Edge 139+ can run speech recognition on the computer itself
// (`processLocally`), with no round trip to Google's servers: results arrive
// sooner and keep working offline. On-device recognition can also be biased
// toward the script's own words (`phrases`). Other browsers keep using the
// standard (cloud) recognizer.

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface SpeechRecognitionStatics {
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<Availability>;
  install?: (options: { langs: string[]; processLocally: boolean }) => Promise<boolean>;
}

function statics(): SpeechRecognitionStatics | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window.SpeechRecognition || window.webkitSpeechRecognition) as SpeechRecognitionStatics | undefined;
}

// 'available' means the on-device model for `lang` is installed and ready.
export async function onDeviceStatus(lang: string): Promise<Availability> {
  const SR = statics();
  if (!SR?.available) return 'unavailable';
  try {
    return await SR.available({ langs: [lang], processLocally: true });
  } catch {
    return 'unavailable';
  }
}

// Downloads the on-device model (Chrome may require a click to allow this, so
// call it from a button handler). Resolves true once it is ready.
export async function installOnDevice(lang: string): Promise<boolean> {
  const SR = statics();
  if (!SR?.install) return false;
  try {
    return await SR.install({ langs: [lang], processLocally: true });
  } catch {
    return false;
  }
}

// Words worth biasing recognition toward: the script's longer and unusual
// words (names, product terms), which general recognizers get wrong most.
// Short common words need no help.
export function scriptPhrases(words: string[], max = 60): string[] {
  const counts = new Map<string, number>();
  for (const raw of words) {
    const w = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (w.length < 6 || !/\p{L}/u.test(w)) continue;
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[0].length - a[0].length || b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}
