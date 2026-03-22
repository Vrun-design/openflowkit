import type { ImportFidelityReport } from '@/services/importFidelity';
import { summarizeImportReport } from '@/services/importFidelity';

export type OperationToastType = 'success' | 'error' | 'info' | 'warning';

export type OperationToast = (
  message: string,
  type?: OperationToastType,
  duration?: number
) => void;

export interface OperationOutcome {
  status: OperationToastType;
  summary: string;
  detail?: string;
  duration?: number;
}

export function notifyOperationOutcome(
  addToast: OperationToast,
  outcome: OperationOutcome
): void {
  addToast(outcome.summary, outcome.status, outcome.duration);
  if (outcome.detail && outcome.detail !== outcome.summary) {
    addToast(outcome.detail, outcome.status, outcome.duration);
  }
}

export function createImportReportOutcome(
  report: ImportFidelityReport,
  detail?: string
): OperationOutcome {
  const status: OperationToastType = report.summary.errorCount > 0
    ? 'error'
    : report.summary.warningCount > 0
      ? 'warning'
      : 'success';

  return {
    status,
    summary: summarizeImportReport(report),
    detail,
  };
}
