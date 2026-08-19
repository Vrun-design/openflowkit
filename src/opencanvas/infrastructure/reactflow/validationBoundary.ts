import type { SceneDocumentV1 } from '../../domain/document/types';
import {
  validateSceneDocumentV1,
  type DocumentValidationIssue,
} from '../../domain/document/validation';

export class ReactFlowProjectionError extends Error {
  readonly issues: readonly DocumentValidationIssue[];

  constructor(issues: readonly DocumentValidationIssue[]) {
    const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
    super(`React Flow projection produced an invalid OpenCanvas document: ${summary}`);
    this.name = 'ReactFlowProjectionError';
    this.issues = issues;
  }
}

export function requireValidSceneDocument(value: unknown): SceneDocumentV1 {
  const result = validateSceneDocumentV1(value);
  if (result.success === false) throw new ReactFlowProjectionError(result.issues);
  return result.document;
}
