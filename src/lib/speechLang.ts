// The languages voice follow can listen for, in the order the picker shows them.
export const SPEECH_LANGS = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'hi-IN', label: 'Hindi' },
] as const;

const FALLBACK = 'en-IN';

const isOffered = (lang: string) => SPEECH_LANGS.some((l) => l.value === lang);

// A saved choice wins; otherwise the first browser language we offer (any
// Hindi counts as hi-IN, English variants must match exactly); else en-IN.
export function defaultSpeechLang(saved: string | null, browserLangs: readonly string[]): string {
  if (saved && isOffered(saved)) return saved;
  for (const lang of browserLangs) {
    if (/^hi(-|$)/i.test(lang)) return 'hi-IN';
    if (isOffered(lang)) return lang;
  }
  return FALLBACK;
}
