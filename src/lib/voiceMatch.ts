// Contractions, numbers, and filler dictionaries for robust normalization
const CONTRACTIONS: Record<string, string> = {
  "don't": "do not", "dont": "do not",
  "doesn't": "does not", "doesnt": "does not",
  "didn't": "did not", "didnt": "did not",
  "it's": "it is", "its": "it is",
  "that's": "that is", "thats": "that is",
  "what's": "what is", "whats": "what is",
  "there's": "there is", "theres": "there is",
  "we're": "we are", "were": "we are",
  "they're": "they are", "theyre": "they are",
  "you're": "you are", "youre": "you are",
  "i'm": "i am", "im": "i am",
  "can't": "cannot", "cant": "cannot",
  "won't": "will not", "wont": "will not",
  "i've": "i have", "ive": "i have",
  "we've": "we have", "weve": "we have",
  "you've": "you have", "youve": "you have",
  "isn't": "is not", "isnt": "is not",
  "aren't": "are not", "arent": "are not",
  "wasn't": "was not", "wasnt": "was not",
  "weren't": "were not", "werent": "were not",
  "i'll": "i will", "ill": "i will",
  "you'll": "you will", "youll": "you will",
  "we'll": "we will", "well": "we will",
  "they'll": "they will", "theyll": "they will",
};

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
  "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
  "10": "ten", "11": "eleven", "12": "twelve", "13": "thirteen",
  "14": "fourteen", "15": "fifteen", "16": "sixteen", "17": "seventeen",
  "18": "eighteen", "19": "nineteen", "20": "twenty", "30": "thirty",
  "40": "forty", "50": "fifty", "60": "sixty", "70": "seventy",
  "80": "eighty", "90": "ninety", "100": "hundred", "1000": "thousand",
};

const FILLER_WORDS = new Set(["um", "uh", "like", "so", "you know", "ah", "er"]);

export function normalizeText(text: string): string[] {
  let lower = text.toLowerCase();

  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    const reg = new RegExp(`\\b${contraction}\\b`, 'gi');
    lower = lower.replace(reg, expansion);
  }

  lower = lower.replace(/\b\d+\b/g, (match) => NUMBER_WORDS[match] || match);
  const clean = lower.replace(/[^a-z0-9\s]/g, ' ');
  return clean.split(/\s+/).filter((t) => t && !FILLER_WORDS.has(t));
}

function phoneticKey(word: string): string {
  if (!word) return '';
  const first = word[0];
  const rest = word.slice(1).replace(/[aeiouy]/g, '');
  return (first + rest).replace(/(.)\1+/g, '$1');
}

function levenshtein(a: string, b: string): number {
  const an = a.length, bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;
  if (Math.abs(an - bn) > 2) return Math.abs(an - bn);
  const matrix: number[][] = [];
  for (let i = 0; i <= an; i++) matrix[i] = [i];
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;
  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[an][bn];
}

export function fuzzyWordMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) {
    return true;
  }
  if (a.length >= 3 && b.length >= 3 && phoneticKey(a) === phoneticKey(b)) {
    return true;
  }
  const minLen = Math.min(a.length, b.length);
  if (minLen >= 4 && minLen <= 6) {
    return levenshtein(a, b) <= 1;
  }
  if (minLen >= 7) {
    return levenshtein(a, b) <= 2;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Word-position tracking
//
// The script and the speech recognizer's transcript go through the SAME
// normalizeText(), so contractions ("don't" -> "do not"), numbers and dropped
// filler words line up on both sides. Each spoken-form token remembers which
// displayed word it came from, so a match can be shown on screen.
// ---------------------------------------------------------------------------

export interface SpeechToken {
  norm: string;
  wordIndex: number; // index into the displayed word list
}

// Bracketed cues such as [PAUSE 2s] or [HOOK: 3-5 SECONDS] are read silently.
export function cueWordFlags(words: string[]): boolean[] {
  const flags: boolean[] = [];
  let inCue = false;
  for (const w of words) {
    if (w.startsWith('[')) inCue = true;
    flags.push(inCue);
    if (w.includes(']')) inCue = false;
  }
  return flags;
}

export interface WordStyle {
  display: string; // text shown in the prompter (stress asterisks removed)
  emphasis: boolean; // inside *stress* marks from the editor's Stress button
  cue: boolean; // inside a [bracketed note], shown but never read aloud
}

// How each script word is shown. "*really important*," shows as
// "really important," in bold; asterisks never reach the screen.
export function describeWords(words: string[]): WordStyle[] {
  const isCue = cueWordFlags(words);
  let inEmphasis = false;
  return words.map((word, i) => {
    if (isCue[i]) return { display: word, emphasis: false, cue: true };
    const opens = /^[^\p{L}\p{N}*]*\*/u.test(word);
    const closes = /\*[^\p{L}\p{N}*]*$/u.test(word.replace(/^[^\p{L}\p{N}*]*\*/u, ''));
    if (opens) inEmphasis = true;
    const emphasis = inEmphasis;
    if (closes || (opens && /\*.*\*/.test(word))) inEmphasis = false;
    return { display: word.replace(/\*/g, ''), emphasis, cue: false };
  });
}

export function buildSpeechTokens(words: string[]): SpeechToken[] {
  const isCue = cueWordFlags(words);
  const tokens: SpeechToken[] = [];
  words.forEach((word, wordIndex) => {
    if (isCue[wordIndex]) return;
    for (const norm of normalizeText(word)) tokens.push({ norm, wordIndex });
  });
  return tokens;
}

// One normalized token from what the speaker said. `word` is the index of the
// spoken word it came from: a contraction like "it's" becomes two tokens
// ("it", "is") from ONE spoken word, and must count as one word of evidence.
export interface HeardToken {
  norm: string;
  word: number;
}

// Last few tokens from a recognition event, newest last. Uses only the top
// guess of each result and includes unfinished (interim) results, so the
// script keeps moving mid-sentence instead of waiting for a pause.
export function tailTokensFromResults(transcripts: string[], count = 8): HeardToken[] {
  const all: HeardToken[] = [];
  let word = 0;
  for (const t of transcripts) {
    for (const spoken of t.trim().split(/\s+/).filter(Boolean)) {
      const norms = normalizeText(spoken);
      if (norms.length === 0) continue;
      for (const norm of norms) all.push({ norm, word });
      word++;
    }
  }
  return all.slice(-count);
}

// Matches within this many tokens ahead count as "reading on".
const NEAR_WINDOW = 40;
// A jump further ahead (the speaker skipped a section) needs at least this many
// spoken words in a row matching the script, since short phrases repeat.
const FAR_MIN_WORDS = 4;

// Returns the new position (index of the next speech token to say). Never moves
// backward; returns `position` unchanged when the heard words don't match.
// Evidence is counted in spoken words, so one off-script contraction can't
// count as a two-word match.
export function advanceSpeechPosition(
  tokens: SpeechToken[],
  position: number,
  heardInput: HeardToken[] | string[]
): number {
  const heard: HeardToken[] = heardInput.map((h, i) =>
    typeof h === 'string' ? { norm: h, word: i } : h
  );
  if (heard.length === 0 || tokens.length === 0) return position;
  const last = heard[heard.length - 1];
  const lastWordLength = heard.filter((h) => h.word === last.word).reduce((n, h) => n + h.norm.length, 0);
  let near = { pos: position, words: 0 };
  let far = { pos: position, words: 0 };

  // Try each script token as the landing spot for the newest heard token.
  for (let j = Math.max(0, position - 1); j < tokens.length; j++) {
    let run = 0;
    while (
      run < heard.length &&
      j - run >= 0 &&
      fuzzyWordMatch(heard[heard.length - 1 - run].norm, tokens[j - run].norm)
    ) {
      run++;
    }
    if (run === 0) continue;
    const words = new Set(heard.slice(heard.length - run).map((h) => h.word)).size;

    if (j - position <= NEAR_WINDOW) {
      // One spoken word is only trusted when it is long and right next to us.
      const trustedSingle = words === 1 && lastWordLength >= 5 && j - position <= 2;
      if ((words >= 2 || trustedSingle) && words > near.words) near = { pos: j + 1, words };
    } else if (words >= FAR_MIN_WORDS && words > far.words) {
      // Earliest strongest match wins, so a later repeat of the phrase doesn't.
      far = { pos: j + 1, words };
    }
  }

  // Reading on is the usual case; jump ahead only when the far match is
  // clearly better than anything nearby.
  let best = near.pos;
  if (far.words > 0 && (near.words === 0 || far.words >= near.words + 2)) best = far.pos;
  return Math.max(position, Math.min(best, tokens.length));
}
