import { describe, expect, it } from 'vitest';
import { previewParagraphs } from './scriptPreview';

describe('previewParagraphs', () => {
  it('splits paragraphs on blank lines, like the prompter', () => {
    expect(previewParagraphs('One.\n\nTwo three.')).toHaveLength(2);
  });

  it('marks [notes] and *stress* the way the prompter shows them', () => {
    const [words] = previewParagraphs('Say [PAUSE 2s] *this* now');
    expect(words.map((w) => w.display)).toEqual(['Say', '[PAUSE', '2s]', 'this', 'now']);
    expect(words.map((w) => w.cue)).toEqual([false, true, true, false, false]);
    expect(words.map((w) => w.emphasis)).toEqual([false, false, false, true, false]);
  });

  it('gives nothing for blank text', () => {
    expect(previewParagraphs('  \n\n ')).toEqual([]);
  });
});
