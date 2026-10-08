import type { ScenePage } from '../../opencanvas/domain/document/types';
import { isJsonObject } from '../../opencanvas/domain/document/json';
import { archModelOfPage } from './model';

/** DSL is user-editable: only an https URL may become an anchor. */
export const safeHttpsUrl = (value: string): string | null => value.startsWith('https://') ? value : null;

/** "path:line" for a GitHub blob URL (`…/blob/<ref>/<path>#L68`), else host + path; anything unparseable is shown as written. */
export function relationSourceLabel(link: string): string {
  let url: URL;
  try { url = new URL(link); } catch { return link; }
  // ponytail: a ref with slashes (feature/x) shows from its second segment — resolving it needs the repo's branch list.
  const blob = /^\/[^/]+\/[^/]+\/blob\/[^/]+\/(.+)$/.exec(url.pathname);
  if (url.hostname === 'github.com' && blob) {
    const lines = /^#L(\d+)(?:-L?(\d+))?/.exec(url.hash);
    let path = blob[1]!;
    try { path = decodeURIComponent(path); } catch { /* malformed escape: show it as written */ }
    return lines ? `${path}:${lines[1]}${lines[2] ? `-${lines[2]}` : ''}` : path;
  }
  return `${url.host}${url.pathname === '/' ? '' : url.pathname}`;
}

export interface ConnectorSource { readonly from: string; readonly to: string; readonly link: string }

/** The `link` of the model relation a connector draws, with its endpoint names; null when it has none. */
export function connectorSource(page: ScenePage, connectorId: string): ConnectorSource | null {
  const meta = page.connectors.find((connector) => connector.id === connectorId)?.metadata.model;
  const relationId = isJsonObject(meta) ? meta.relationId : undefined;
  if (typeof relationId !== 'string') return null;
  const model = archModelOfPage(page);
  const relation = model?.relations.find((entry) => entry.id === relationId);
  if (!model || !relation?.link) return null;
  const name = (id: string) => model.elements.find((element) => element.id === id)?.name ?? id;
  return { from: name(relation.from), to: name(relation.to), link: relation.link };
}
