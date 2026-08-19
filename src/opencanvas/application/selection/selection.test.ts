import { describe, expect, it } from 'vitest';
import {
  addToSelection,
  clearSelection,
  replaceSelection,
  selectionAnnouncement,
  toggleSelection,
} from './selection';

describe('canvas selection', () => {
  it('replaces and deduplicates in stable order', () => {
    expect(replaceSelection(['a', 'b', 'a'])).toEqual({ nodeIds: ['a', 'b'], primaryNodeId: 'b' });
  });

  it('adds and toggles without mutating input', () => {
    const initial = replaceSelection(['a']);
    expect(addToSelection(initial, ['b'])).toEqual({ nodeIds: ['a', 'b'], primaryNodeId: 'b' });
    expect(toggleSelection(initial, 'a')).toEqual(clearSelection());
    expect(initial.nodeIds).toEqual(['a']);
  });

  it('announces empty, singular, and plural selection', () => {
    expect(selectionAnnouncement(clearSelection())).toBe('Canvas selection cleared.');
    expect(selectionAnnouncement(replaceSelection(['a']))).toBe('1 node selected.');
    expect(selectionAnnouncement(replaceSelection(['a', 'b']))).toBe('2 nodes selected.');
  });
});
