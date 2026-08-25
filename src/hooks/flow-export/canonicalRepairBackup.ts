import { buildVariantExportFileName } from '@/lib/exportFileName';
import { createDownload } from './exportCapture';

export function buildCanonicalRepairBackupName(fileName: string): string {
  const baseName = fileName.replace(/\.json$/i, '');
  return buildVariantExportFileName(baseName, 'before-repair', 'json');
}

export function downloadCanonicalRepairBackup(sourceJson: string, fileName: string): void {
  createDownload(
    new Blob([sourceJson], { type: 'application/json' }),
    buildCanonicalRepairBackupName(fileName)
  );
}
