import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markTipSeen, mayShowTip, recordTipShown, resetTipsForTest, tipSeen } from './v2FeatureTips';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetTipsForTest();
});

describe('feature tip rules', () => {
  it('shows one tip per session, and each tip once ever', () => {
    expect(mayShowTip('code')).toBe(true);
    recordTipShown('code');
    expect(mayShowTip('connect')).toBe(false);

    // A new session (new tab): another tip may show, the seen one never again.
    sessionStorage.clear();
    resetTipsForTest();
    expect(mayShowTip('code')).toBe(false);
    expect(mayShowTip('connect')).toBe(true);
  });

  it('never explains a feature already used', () => {
    markTipSeen('assistant');
    expect(mayShowTip('assistant')).toBe(false);
    expect(JSON.parse(localStorage.getItem('ofk.tips.seen')!)).toEqual(['assistant']);
  });

  it('survives storage that throws or holds junk', () => {
    localStorage.setItem('ofk.tips.seen', '{not json');
    expect(tipSeen('code')).toBe(false);
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(mayShowTip('motion')).toBe(true);
    recordTipShown('motion');
    // Without storage the page load still keeps the promise.
    expect(mayShowTip('mermaid')).toBe(false);
    expect(tipSeen('motion')).toBe(true);
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
