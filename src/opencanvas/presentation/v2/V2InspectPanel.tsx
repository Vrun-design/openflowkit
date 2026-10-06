import { useState } from 'react';
import { Button, Panel } from '../design-system';
import type { InspectReport } from '../../domain/scene/inspect';

export interface V2InspectPanelProps {
  readonly report: InspectReport;
  readonly onClose: () => void;
  /** Selects the node at the other end of a connection. */
  readonly onSelectNode: (nodeId: string) => void;
  readonly onShowCode: (frameId: string) => void;
  readonly onOpenModel: () => void;
}

/** Read-only facts about the selection; click a value to copy it. Follows the selection while open. */
export function V2InspectPanel(props: V2InspectPanelProps): React.JSX.Element {
  const [status, setStatus] = useState('');
  const { report } = props;
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setStatus(`Copied ${value}`); }
    catch { setStatus('Could not copy.'); }
  };
  return (
    <Panel title="Inspect" onClose={props.onClose} closeLabel="Close inspect" className="ofk-v2-workspace-panel ofk-v2-inspect-panel">
      {report.kind === 'empty' ? (
        <p className="ofk-v2-inspect-empty">Select a shape or connector to see its details.</p>
      ) : report.kind === 'many' ? (
        <section className="ofk-v2-inspect-group" aria-label="Selection">
          <h3>{report.items.length} selected</h3>
          <ul className="ofk-v2-model-list">
            {report.items.map((item) => <li key={item.id} className="ofk-v2-inspect-item">{item.name}</li>)}
          </ul>
        </section>
      ) : (
        <>
          <header className="ofk-v2-inspect-head">
            <h3>{report.title}</h3>
            <span>{report.subtitle}</span>
          </header>
          {report.sections.map((section) => (
            <section key={section.title} className="ofk-v2-inspect-group" aria-label={section.title}>
              <h4>{section.title}</h4>
              <dl>
                {section.rows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>
                      <button type="button" title={`Copy ${row.label}`} onClick={() => { void copy(row.value); }}>
                        {row.swatch ? <i className="ofk-v2-inspect-swatch" style={{ background: row.swatch }} aria-hidden="true" /> : null}
                        {row.value || '—'}
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          {report.kind === 'node' ? (
            <section className="ofk-v2-inspect-group" aria-label="Connections">
              <h4>Connections · {report.connections.length}</h4>
              {report.connections.length === 0 ? <p className="ofk-v2-inspect-empty">None</p> : (
                <ul className="ofk-v2-model-list">
                  {report.connections.map((link, index) => (
                    <li key={`${link.direction}:${link.nodeId ?? index}:${index}`}>
                      <button type="button" className="ofk-v2-model-row" disabled={!link.nodeId}
                        onClick={(event) => {
                          if (!link.nodeId) return;
                          // The list re-renders for the new node; keep focus in the panel, not on <body>, so shortcuts still reach the editor.
                          event.currentTarget.closest<HTMLElement>('.ofk-v2-inspect-panel')?.focus();
                          props.onSelectNode(link.nodeId);
                        }}>
                        <span className="ofk-v2-model-kind">{link.direction === 'in' ? 'In' : 'Out'}</span>
                        <span className="ofk-v2-model-name">{link.name}</span>
                        {link.label ? <span className="ofk-v2-model-tech">{link.label}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
          <section className="ofk-v2-inspect-group" aria-label="Code">
            <h4>Code</h4>
            {report.code ? (
              <>
                <pre className="ofk-v2-inspect-code"><span>{report.code.line}</span>{report.code.text}</pre>
                <Button variant="quiet" onClick={() => props.onShowCode(report.code!.frameId)}>Show in code</Button>
              </>
            ) : <p className="ofk-v2-inspect-empty">Not in code. Drawn on the canvas.</p>}
          </section>
          {report.elementId ? (
            <section className="ofk-v2-inspect-group" aria-label="Model">
              <h4>Model</h4>
              <p className="ofk-v2-inspect-empty">Element <code>{report.elementId}</code></p>
              <Button variant="quiet" onClick={props.onOpenModel}>Open in model</Button>
            </section>
          ) : null}
        </>
      )}
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </Panel>
  );
}
