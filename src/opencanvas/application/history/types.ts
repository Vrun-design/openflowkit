import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1 } from '../../domain/document/types';

export interface DocumentHistoryEntry {
  readonly command: DocumentCommand;
  readonly inverse: DocumentCommand;
}

export interface DocumentHistoryState {
  readonly present: SceneDocumentV1;
  readonly past: readonly DocumentHistoryEntry[];
  readonly future: readonly DocumentHistoryEntry[];
  readonly limit: number;
}
