import { describe, expect, it } from 'vitest';
import { buildCanonicalRepairBackupName } from './canonicalRepairBackup';

describe('canonical repair backup', () => {
  it('builds a safe and recognizable original-source filename', () => {
    expect(buildCanonicalRepairBackupName('My Repairable Diagram.JSON'))
      .toBe('my-repairable-diagram-before-repair.json');
    expect(buildCanonicalRepairBackupName('..json'))
      .toBe('openflowkit-diagram-before-repair.json');
  });
});
