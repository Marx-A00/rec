import { describe, it, expect } from 'vitest';

import { cn, sanitizeArtistName } from '@/lib/utils';

describe('cn (className merger)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'visible', false && 'hidden')).toBe(
      'base visible'
    );
  });

  it('should merge tailwind classes correctly', () => {
    // tailwind-merge should dedupe conflicting utilities
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle undefined and null values', () => {
    expect(cn('base', undefined, null, 'extra')).toBe('base extra');
  });

  it('should handle empty strings', () => {
    expect(cn('base', '', 'extra')).toBe('base extra');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });
});

describe('sanitizeArtistName', () => {
  it('should remove Discogs disambiguation numbers', () => {
    expect(sanitizeArtistName('Danny Brown (2)')).toBe('Danny Brown');
    expect(sanitizeArtistName('Future (3)')).toBe('Future');
    expect(sanitizeArtistName('The Beatles (123)')).toBe('The Beatles');
  });

  it('should not modify names without disambiguation numbers', () => {
    expect(sanitizeArtistName('Radiohead')).toBe('Radiohead');
    expect(sanitizeArtistName('The Rolling Stones')).toBe('The Rolling Stones');
  });

  it('should handle empty strings', () => {
    expect(sanitizeArtistName('')).toBe('');
  });

  it('should handle null/undefined gracefully', () => {
    // @ts-expect-error - testing runtime behavior with null
    expect(sanitizeArtistName(null)).toBe(null);
    // @ts-expect-error - testing runtime behavior with undefined
    expect(sanitizeArtistName(undefined)).toBe(undefined);
  });

  it('should not remove parenthetical content that is not a number', () => {
    expect(sanitizeArtistName('Dinosaur Jr.')).toBe('Dinosaur Jr.');
    expect(sanitizeArtistName('!!!Chk Chk Chk!!!')).toBe('!!!Chk Chk Chk!!!');
    expect(sanitizeArtistName('The XX (UK)')).toBe('The XX (UK)');
    expect(sanitizeArtistName('Sunn O)))')).toBe('Sunn O)))');
  });

  it('should only remove trailing parenthetical numbers', () => {
    // Numbers in the middle should stay
    expect(sanitizeArtistName('Blink (182) Band')).toBe('Blink (182) Band');
    // But trailing numbers get removed
    expect(sanitizeArtistName('Blink 182 (2)')).toBe('Blink 182');
  });

  it('should trim whitespace after removal', () => {
    expect(sanitizeArtistName('Artist Name (5)')).toBe('Artist Name');
    expect(sanitizeArtistName('Artist Name  (5)')).toBe('Artist Name');
    expect(sanitizeArtistName('  Artist Name (5)')).toBe('Artist Name');
  });
});
