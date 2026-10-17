import { describe, expect, it } from 'vitest';
import { advanceSpeechPosition, buildSpeechTokens, describeWords, tailTokensFromResults } from './voiceMatch';
import { DEFAULT_SCRIPTS } from '../data/defaultScripts';

// The shipped sample script: what a first-time user reads in the prompter.
const words = DEFAULT_SCRIPTS[0].content.split(/\s+/).filter(Boolean);
const tokens = buildSpeechTokens(words);

// Feed one recognition result and return the next displayed word to say.
const say = (position: number, transcript: string) =>
  advanceSpeechPosition(tokens, position, tailTokensFromResults([transcript]));
const wordAt = (position: number) =>
  position >= tokens.length ? '(end)' : words[tokens[position].wordIndex];

// Simulates the browser delivering a sentence word by word, as interim results.
const sayProgressively = (position: number, sentence: string) => {
  const parts = sentence.split(' ');
  let p = position;
  for (let i = 1; i <= parts.length; i++) p = say(p, parts.slice(0, i).join(' '));
  return p;
};

describe('voice follow: reading in order', () => {
  it('moves forward word by word while the speaker is mid-sentence', () => {
    const p = sayProgressively(0, "most creators don't realize this but the reason your videos feel robotic");
    expect(wordAt(p)).toBe("isn't");
  });

  it('stays put when the speaker ad-libs words that are not in the script', () => {
    const p = say(0, 'most creators');
    expect(say(p, 'okay let me tell you about my dog')).toBe(p);
  });

  it('picks up again after an ad-lib', () => {
    const p = say(0, "most creators don't realize this");
    expect(wordAt(say(p, 'but the reason your videos'))).toBe('feel');
  });

  it('never moves backward on its own', () => {
    const p = say(0, "most creators don't realize this but the reason your videos feel robotic");
    expect(say(p, "most creators don't realize")).toBe(p);
  });

  it('does not move on a single short common word', () => {
    expect(say(0, 'the')).toBe(0);
  });

  it('tolerates small mishearings such as realise/realize', () => {
    expect(wordAt(say(0, 'most creators dont realise this'))).toBe('but');
  });

  it('skips bracketed notes like [PAUSE 2s] without waiting for them to be read', () => {
    const p = say(0, "and it certainly isn't your studio lighting it is your teleprompter setup");
    expect(wordAt(say(p, 'traditional software rolls'))).toBe('at');
  });
});

describe('voice follow: skipping ahead', () => {
  const start = say(0, "most creators don't realize this but the reason your videos feel robotic");

  it('jumps to a sentence much further down when it is clearly spoken', () => {
    expect(wordAt(say(start, 'so your eyes stay near the lens you sound like yourself'))).toBe('and');
  });

  it('does not jump far on a short phrase that appears elsewhere', () => {
    expect(say(start, 'so your eyes')).toBe(start);
  });

  it('prefers reading on over a far match of similar strength', () => {
    expect(wordAt(say(start, "isn't your camera lens"))).toBe('It');
  });
});

describe('voice follow: contractions said off script', () => {
  // Review finding #3: one spoken "it's" used to count as the two words "it is"
  // and jump the script to the next "It is" / "It isn't" within 40 words.
  it('does not jump when the speaker ad-libs a single contraction', () => {
    // Next script word is "but"; "It is your teleprompter setup" and
    // "It isn't your microphone" are a few lines further down.
    const p = say(0, "most creators don't realize this");
    expect(wordAt(p)).toBe('but');
    expect(say(p, "it's")).toBe(p);
    expect(say(p, "don't")).toBe(p);
    expect(say(p, 'well')).toBe(p);
  });

  it('still follows contractions that are read from the script', () => {
    const p = say(0, 'most creators');
    expect(wordAt(say(p, "don't realize this"))).toBe('but');
  });

  it('counts a contraction as one spoken word when building the heard tail', () => {
    const heard = tailTokensFromResults(["it's fine"]);
    expect(heard.map((h) => h.norm)).toEqual(['it', 'is', 'fine']);
    expect(new Set(heard.map((h) => h.word)).size).toBe(2);
  });
});

describe('voice follow: edges', () => {
  it('stays at the end of the script once it is reached', () => {
    const end = tokens.length;
    expect(say(end, 'most creators')).toBe(end);
  });

  it('ignores empty results', () => {
    expect(say(5, '   ')).toBe(5);
  });
});

describe('how script words are shown', () => {
  const show = (text: string) =>
    describeWords(text.split(' ')).map((w) => (w.emphasis ? `B:${w.display}` : w.cue ? `N:${w.display}` : w.display));

  it('shows *stressed* words in bold without the asterisks', () => {
    expect(show('say *this* now')).toEqual(['say', 'B:this', 'now']);
    expect(show('*really important*, ok')).toEqual(['B:really', 'B:important,', 'ok']);
  });

  it('marks [bracketed notes] so they show as small labels', () => {
    expect(show('[CAMERA LOOK] hello')).toEqual(['N:[CAMERA', 'N:LOOK]', 'hello']);
  });

  it('stresses to the end of the line when the closing asterisk is missing', () => {
    expect(show('plain *open never')).toEqual(['plain', 'B:open', 'B:never']);
  });

  it('still matches stressed words when they are spoken', () => {
    const w = 'say *this* now please'.split(' ');
    const t = buildSpeechTokens(w);
    expect(w[t[advanceSpeechPosition(t, 0, tailTokensFromResults(['say this']))].wordIndex]).toBe('now');
  });
});
