import { useNavigate } from 'react-router-dom';
import type { DocumentValidationIssue } from '../../domain/document/validation';
import { Button, ErrorState, Spinner } from '../design-system';
import { V2StateHero } from './V2StateHero';
import { downloadRawRecords } from './v2Export';

interface V2LoadCenterProps {
  readonly phase: 'loading' | 'ready' | 'corrupt' | 'failed';
  readonly documentId: string | undefined;
  readonly corruptIssues: readonly DocumentValidationIssue[];
  readonly loadError: { readonly blocked: boolean; readonly message: string } | null;
  readonly onRetry: () => void;
  readonly onDownloadDiagnostic: () => void;
}

// Full-viewport load states: spinner, failed with retry, corrupt with a
// diagnostic download. Both failures keep a way back to the list.
export function V2LoadCenter(props: V2LoadCenterProps): React.JSX.Element {
  const navigate = useNavigate();
  const home = <Button variant="quiet" onClick={() => navigate('/home')}>Back to home</Button>;
  const downloadRaw = (): void => downloadRawRecords(props.documentId ?? 'document', 'raw-data');
  return (
    <div className="ofk-v2-center" role="status">
      {props.phase === 'failed' ? (
        <ErrorState
          hero={<V2StateHero kind="torn-page" />}
          title={props.loadError?.blocked ? 'Diagrams can’t be opened here.' : 'This diagram didn’t open.'}
          description={props.loadError?.message}
          onRetry={props.onRetry}
          secondary={home}
        />
      ) : props.phase === 'corrupt' ? (
        <ErrorState
          hero={<V2StateHero kind="torn-page" />}
          title="This diagram is damaged."
          description="We couldn’t read it or its last good copy. Download its raw data to keep it; a diagnostic report can help recover it."
          action={<>
            <Button variant="primary" onClick={downloadRaw}>Download raw data</Button>
            <Button variant="quiet" onClick={props.onDownloadDiagnostic}>Download diagnostic report</Button>
          </>}
          secondary={home}
        />
      ) : (
        <Spinner label="Loading diagram" />
      )}
    </div>
  );
}
