import { describe, expect, it } from 'vitest';
import { pauseSeconds, previewText, readSeconds, spokenWordCount, stripMarkdown } from './scriptText';

describe('previewText', () => {
  it('drops [notes] and stress marks, with no ellipsis when nothing was cut', () => {
    expect(previewText('Hi [PAUSE 2s] there **now**', 100)).toBe('Hi there now');
  });

  it('cuts long text at a word boundary and ends it with an ellipsis', () => {
    const long = 'word '.repeat(60).trim(); // 299 characters
    const preview = previewText(long, 160);
    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(161);
    expect(preview.slice(0, -1).endsWith('word')).toBe(true);
  });

  it('joins lines into one line of text', () => {
    expect(previewText('First line.\n\n*Second* line.', 100)).toBe('First line. Second line.');
  });
});

describe('stripMarkdown', () => {
  it('removes headings, bullets, quotes, rules and code marks', () => {
    const md = [
      '# My talk',
      '',
      '## Part one',
      '- first point',
      '* second point',
      '1. numbered point',
      '> a quote',
      '---',
      'Run `npm start` now.',
    ].join('\n');
    expect(stripMarkdown(md)).toBe(
      ['My talk', '', 'Part one', 'first point', 'second point', 'numbered point', 'a quote', 'Run npm start now.'].join('\n')
    );
  });

  it('turns **bold** into *stress* and keeps link text without brackets', () => {
    expect(stripMarkdown('This is **really** important, see [the docs](https://x.y).')).toBe(
      'This is *really* important, see the docs.'
    );
  });

  it('keeps [notes] and *stress* written for the prompter', () => {
    expect(stripMarkdown('Hello *there*.\n\n[PAUSE 2s]')).toBe('Hello *there*.\n\n[PAUSE 2s]');
  });
});

describe('spokenWordCount', () => {
  it('skips notes and symbol-only words', () => {
    expect(spokenWordCount('# Hello there — friend [PAUSE 2s] again - ok')).toBe(5);
  });

  it('counts stressed words', () => {
    expect(spokenWordCount('This is *really* it')).toBe(4);
  });

  it('is zero for empty text', () => {
    expect(spokenWordCount('   ')).toBe(0);
  });
});

describe('pauseSeconds and readSeconds', () => {
  it('adds up written pauses', () => {
    expect(pauseSeconds('a [PAUSE 2s] b [pause 1.5 sec] c [PAUSE] d [CAMERA LOOK]')).toBe(3.5);
  });

  it('includes pauses in the read time', () => {
    // 150 words at 150 wpm = 60 s, plus a 2 s pause
    const text = `${'word '.repeat(150)}[PAUSE 2s]`;
    expect(readSeconds(text, 150)).toBe(62);
  });
});
