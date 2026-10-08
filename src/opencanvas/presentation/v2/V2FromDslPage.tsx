import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, ErrorState, Spinner } from '../design-system';
import { decodeDslPayload } from '../../../services/discovery/dslLink';
import { mintV2Id, type V2StartIntent } from './v2Document';
import { V2StateHero } from './V2StateHero';
import './v2EditorPage.css';

/** `#/from/dsl?d=<payload>`: the MCP viewer's "Open in OpenFlowKit" link. Decode the DSL and hand it to the editor. */
export function V2FromDslPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [failure, setFailure] = useState<{ search: string; message: string } | null>(null);
  useEffect(() => {
    let live = true;
    decodeDslPayload(new URLSearchParams(search).get('d')).then(
      (source) => { if (live) navigate(`/d/${mintV2Id('doc')}`, { replace: true, state: { source } satisfies V2StartIntent }); },
      (error: unknown) => { if (live) setFailure({ search, message: error instanceof Error ? error.message : 'This link could not be read.' }); },
    );
    return () => { live = false; };
  }, [search, navigate]);
  const home = <Button variant="quiet" onClick={() => navigate('/home')}>Back to home</Button>;
  return (
    <div className="ofk-v2-center" data-testid="v2-from-dsl">
      {failure?.search === search ? (
        <ErrorState hero={<V2StateHero kind="lost-link" />} title="This diagram link could not be opened." description={failure.message} secondary={home} />
      ) : <div role="status"><Spinner label="Opening the diagram" />{home}</div>}
    </div>
  );
}
