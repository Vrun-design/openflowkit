import type { SceneDocumentV1 } from '../../domain/document/types';
import type { DocumentHistoryState } from '../history/types';

export interface DocumentSession {
  readonly document: SceneDocumentV1;
  readonly revision: number;
  readonly history: DocumentHistoryState;
}
