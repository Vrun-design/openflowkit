import type { DocumentValidationIssue } from '../../domain/document/validation';
import { Button, ErrorState, Spinner } from '../design-system';

interface V2LoadCenterProps {
  readonly phase: 'loading' | 'ready' | 'corrupt' | 'failed';
  readonly documentId: string | undefined;
  readonly corruptIssues: readonly DocumentValidationIssue[];
  readonly loadError: string | null;
  readonly onRetry: () => void;
  readonly onDownloadDiagnostic: () => void;
}

// Full-viewport load states: spinner, failed with retry, corrupt with a
// diagnostic download. Recovery and read-only notices live in the doc bar.
export function V2LoadCenter(props: V2LoadCenterProps): React.JSX.Element {
  return (
    <div className="ofk-v2-center" role="status">
      {props.phase === 'failed' ? (
        <ErrorState
          title="Document could not be loaded"
          description={props.loadError ?? undefined}
          onRetry={props.onRetry}
        />
      ) : props.phase === 'corrupt' ? (
        <ErrorState
          title="This document is damaged"
          description="The last good content could not be read. Your work may still be recoverable."
          action={<Button onClick={props.onDownloadDiagnostic}>Download diagnostic report</Button>}
        />
      ) : (
        <Spinner label="Loading diagram" />
      )}
    </div>
  );
}
