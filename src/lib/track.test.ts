import { afterEach, describe, expect, it, vi } from 'vitest';
import { track } from './track';

const g = globalThis as unknown as { window?: { clarity?: (...args: unknown[]) => void } };

afterEach(() => {
  delete g.window;
});

describe('track', () => {
  it('sends a Clarity custom event when Clarity is loaded', () => {
    const clarity = vi.fn();
    g.window = { clarity };
    track('take_downloaded');
    expect(clarity).toHaveBeenCalledWith('event', 'take_downloaded');
  });

  it('does nothing when Clarity is not loaded (no consent)', () => {
    g.window = {};
    expect(() => track('prompter_started')).not.toThrow();
  });

  it('never throws, even if Clarity does', () => {
    g.window = { clarity: () => { throw new Error('boom'); } };
    expect(() => track('checkout_started')).not.toThrow();
  });
});
