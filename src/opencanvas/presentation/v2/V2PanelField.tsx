import type { ReactNode } from 'react';
import './v2PanelPolish.css';

/** Visible context for controls that already own their accessible label. */
export function V2PanelField({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
  return <div className="ofk-v2-panel-field"><span className="ofk-v2-field-label">{label}</span>{children}</div>;
}
