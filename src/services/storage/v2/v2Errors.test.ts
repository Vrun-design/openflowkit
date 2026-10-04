import { describe, expect, it } from 'vitest';
import { V2StorageError, V2StorageQuotaError, V2StorageUnavailableError, describeStorageFailure } from './v2Errors';

describe('describeStorageFailure', () => {
  it('names blocked storage and how to allow it, never the developer message', () => {
    const described = describeStorageFailure(new V2StorageUnavailableError());
    expect(described.blocked).toBe(true);
    expect(described.message).toMatch(/blocking site storage/);
    expect(described.message).not.toMatch(/IndexedDB|v2/);
  });

  it('tells a full store apart from a flaky one', () => {
    expect(describeStorageFailure(new V2StorageQuotaError()).message).toMatch(/full/);
    expect(describeStorageFailure(new DOMException('x', 'QuotaExceededError')).message).toMatch(/full/);
    const other = describeStorageFailure(new V2StorageError('v2 document load failed.'));
    expect(other).toEqual({ blocked: false, message: expect.stringMatching(/Try again/) });
    expect(describeStorageFailure('weird').blocked).toBe(false);
  });
});
