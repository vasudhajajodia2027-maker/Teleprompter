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

export function buildSpeechTokens(words: string[]): SpeechToken[] {
  const isCue = cueWordFlags(words);
  const tokens: SpeechToken[] = [];
  words.forEach((word, wordIndex) => {
    if (isCue[wordIndex]) return;
    for (const norm of normalizeText(word)) tokens.push({ norm, wordIndex });
  });
  return tokens;
}

// Last few normalized words from a recognition event, newest last. Uses only
// the top guess of each result and includes unfinished (interim) results, so
// the script keeps moving mid-sentence instead of waiting for a pause.
export function tailTokensFromResults(transcripts: string[], count = 6): string[] {
  const all: string[] = [];
  for (const t of transcripts) all.push(...normalizeText(t));
  return all.slice(-count);
}

// How far ahead of the current position a heard phrase may match.
const LOOKAHEAD = 40;

// Returns the new position (index of the next speech token to say). Never moves
// backward; returns `position` unchanged when the heard words don't match.
export function advanceSpeechPosition(tokens: SpeechToken[], position: number, heard: string[]): number {
  if (heard.length === 0 || tokens.length === 0) return position;
  const end = Math.min(tokens.length - 1, position + LOOKAHEAD);
  const last = heard[heard.length - 1];
  let best = position;
  let bestRun = 0;

  // Try each script token as the landing spot for the newest heard word.
  for (let j = Math.max(0, position - 1); j <= end; j++) {
    let run = 0;
    while (
      run < heard.length &&
      j - run >= 0 &&
      fuzzyWordMatch(heard[heard.length - 1 - run], tokens[j - run].norm)
    ) {
      run++;
    }
    if (run === 0) continue;

    // One matching word is only trusted when it is long and right next to us.
    const trustedSingle = run === 1 && last.length >= 5 && j - position <= 2;
    if (run < 2 && !trustedSingle) continue;

    if (run > bestRun) {
      bestRun = run;
      best = j + 1;
    }
  }

  return Math.max(position, Math.min(best, tokens.length));
}
