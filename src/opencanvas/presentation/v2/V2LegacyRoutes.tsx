import { useEffect, useRef, useState } from 'react';
import { IconCopy } from '@tabler/icons-react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { legacyDocumentId } from '../../domain/document/legacyWorkspace';
import { Button, Icon, SystemRoot } from '../design-system';
import { decodeLegacyViewerParam } from '../../../services/storage/v2/legacyViewerLink';
import { runV1Import } from '../../../services/storage/v2/v1Import';
import { createV2Repository } from '../../../services/storage/v2/v2Repository';
import { useV2Appearance } from './useV2Appearance';
import { useV2Preferences } from './useV2Preferences';
import './v2EditorPage.css';

/** Home reads this from router state and shows it once. */
export interface HomeNotice { readonly notice: string }

/**
 * v1 `#/flow/:id` → `#/d/v1-:id`. The import may still be running on the first visit,
 * so a missing document waits for it once before sending the visitor home.
 */
export function LegacyFlowRedirect(): React.JSX.Element | null {
  const { flowId = '' } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    let live = true;
    const id = legacyDocumentId(flowId);
    const repository = createV2Repository(window.indexedDB);
    // v1 put a document id or one of its page ids in the URL; imported pages keep their v1 ids.
    const locate = () => repository.listDocuments().then(
      (documents) => documents.find((document) => document.id === id || (document.id.startsWith('v1-') && document.pageIds.includes(flowId)))?.id ?? null,
      () => null,
    );
    void (async () => {
      const found = (await locate()) ?? (await runV1Import().then(locate, () => null));
      if (!live) return;
      if (found) navigate(`/d/${found}`, { replace: true });
      else navigate('/home', { replace: true, state: { notice: "That diagram isn't in this browser." } satisfies HomeNotice });
    })();
    return () => { live = false; };
  }, [flowId, navigate]);
  return null;
}

/**
 * v1 `#/view?flow=` links hold v1 DSL, which v2 can't draw. The text stays copyable.
 * ponytail: explainer only — porting v1's DSL parser is the upgrade if these links get real traffic.
 */
export function LegacyViewPage(): React.JSX.Element {
  const flow = new URLSearchParams(useLocation().search).get('flow');
  return flow ? <LegacyViewText flow={flow} /> : <Navigate to="/home" replace />;
}

function LegacyViewText({ flow }: { readonly flow: string }): React.JSX.Element {
  const { preferences } = useV2Preferences();
  const appearance = useV2Appearance(preferences.theme);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState<'yes' | 'manual' | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // No clipboard API (plain-http self-host) or permission denied: select it for ⌘C / Ctrl+C.
  const copy = (value: string) => Promise.resolve()
    .then(() => navigator.clipboard.writeText(value))
    .then(() => setCopied('yes'), () => { textRef.current?.select(); setCopied('manual'); });
  useEffect(() => {
    let live = true;
    decodeLegacyViewerParam(flow).then((value) => live && setText(value), () => live && setText(''));
    return () => { live = false; };
  }, [flow]);
  return (
    <SystemRoot appearance={appearance} density={preferences.density}>
      <main className="ofk-home" data-testid="v2-legacy-view">
        <header className="ofk-home-header"><h1>Made with the previous editor</h1></header>
        <p className="ofk-home-notice">
          This link holds a diagram written in the previous OpenFlowKit’s text format, which this version can’t draw.
          Copy the text to keep it.
        </p>
        {text === '' ? <p role="alert">This link could not be read in this browser.</p> : null}
        {text ? (
          <>
            <textarea ref={textRef} className="ofk-legacy-text" readOnly value={text} aria-label="Diagram text" rows={14} />
            <Button onClick={() => void copy(text)}>
              <Icon icon={IconCopy} /> {copied === 'yes' ? 'Copied' : 'Copy text'}
            </Button>
            {copied === 'manual' ? <p role="status">Selected — press ⌘C or Ctrl+C to copy.</p> : null}
          </>
        ) : null}
        <p><Link to="/home">All diagrams</Link></p>
      </main>
    </SystemRoot>
  );
}
