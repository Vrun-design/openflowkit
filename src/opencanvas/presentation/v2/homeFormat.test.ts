import { describe, expect, it } from 'vitest';
import { savedWhen } from './homeFormat';

const NOW = Date.parse('2026-10-04T12:00:00Z');
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

describe('savedWhen', () => {
  it('reads like a person would say it', () => {
    expect(savedWhen(ago(20), NOW).relative).toBe('just now');
    expect(savedWhen(ago(5 * 60), NOW).relative).toBe('5 minutes ago');
    expect(savedWhen(ago(2 * 3600), NOW).relative).toBe('2 hours ago');
    expect(savedWhen(ago(26 * 3600), NOW).relative).toBe('yesterday');
    expect(savedWhen(ago(3 * 86400), NOW).relative).toBe('3 days ago');
    expect(savedWhen(ago(400 * 86400), NOW).relative).toBe('last year');
  });

  it('keeps the exact time for the tooltip and survives a bad date', () => {
    expect(savedWhen(ago(60), NOW).absolute).toMatch(/2026/);
    expect(savedWhen('not a date', NOW)).toEqual({ relative: 'just now', absolute: '' });
  });
});
