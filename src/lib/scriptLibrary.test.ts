import { describe, expect, it } from 'vitest';
import { searchScripts, sortScripts, splitTemplates } from './scriptLibrary';
import { Script } from '../types';

const script = (over: Partial<Script>): Script => ({
  id: over.id ?? over.title ?? 'x',
  title: 'Untitled',
  category: 'draft',
  content: '',
  pacingWpm: 150,
  updatedAt: '',
  wordCount: 0,
  estimatedReadTime: '',
  ...over,
});

describe('splitTemplates', () => {
  it('separates templates from the user’s own scripts', () => {
    const list = [
      script({ title: 'a', category: 'template' }),
      script({ title: 'b', category: 'draft' }),
      script({ title: 'c', category: 'active' }),
      script({ title: 'd', category: 'template' }),
      script({ title: 'e', category: 'draft' }),
    ];
    const { own, templates } = splitTemplates(list);
    expect(own.map((s) => s.title)).toEqual(['b', 'c', 'e']);
    expect(templates.map((s) => s.title)).toEqual(['a', 'd']);
  });
});

describe('sortScripts', () => {
  it('puts the most recently edited first, and unknown edit times last', () => {
    const list = [
      script({ title: 'old', updatedAt: '2026-01-01T10:00:00Z' }),
      script({ title: 'unknown', updatedAt: '' }),
      script({ title: 'new', updatedAt: '2026-10-01T10:00:00Z' }),
    ];
    expect(sortScripts(list, 'lastEdited').map((s) => s.title)).toEqual(['new', 'old', 'unknown']);
  });

  it('sorts A-Z by title regardless of case', () => {
    const list = [script({ title: 'cherry' }), script({ title: 'apple' }), script({ title: 'Banana' })];
    expect(sortScripts(list, 'az').map((s) => s.title)).toEqual(['apple', 'Banana', 'cherry']);
  });

  it('does not change the list it was given', () => {
    const list = [script({ title: 'b' }), script({ title: 'a' })];
    sortScripts(list, 'az');
    expect(list.map((s) => s.title)).toEqual(['b', 'a']);
  });
});

describe('searchScripts', () => {
  const list = [
    script({ title: 'Launch day', content: 'Big news.' }),
    script({ title: 'Weekly update', content: 'Before the launch we tested.' }),
    script({ title: 'Recipe', content: 'Flour and eggs.' }),
  ];

  it('matches title or text, ignoring case', () => {
    expect(searchScripts(list, 'LAUNCH').map((s) => s.title)).toEqual(['Launch day', 'Weekly update']);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchScripts(list, 'zzz')).toEqual([]);
  });

  it('returns every script for an empty or blank query', () => {
    expect(searchScripts(list, '   ')).toHaveLength(3);
  });
});
