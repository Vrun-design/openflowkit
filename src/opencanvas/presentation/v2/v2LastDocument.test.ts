import { describe, expect, it } from 'vitest';
import { lastDocumentId, rememberLastDocument } from './v2Document';

describe('last document', () => {
  it('round-trips the id and starts empty', () => {
    localStorage.removeItem('ofk:last-document');
    expect(lastDocumentId()).toBeNull();
    rememberLastDocument('doc-1');
    expect(lastDocumentId()).toBe('doc-1');
  });
});
