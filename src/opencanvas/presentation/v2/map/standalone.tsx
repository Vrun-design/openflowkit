// Entry of the one-file map (`openflowkit map <dir> --html`). The model and the repo's GitHub address are inlined in
// <script type="application/json" id="ofk-map-data">; nothing is fetched. Imports nothing from src/services/map.
import { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { SystemRoot } from '../../design-system';
import type { Depth, MapModel } from '../../../../dsl/map/types';
import { githubEvidenceLink, type RepoRef } from '../../../../services/discovery/githubRepo';
import { useV2Appearance } from '../useV2Appearance';
import { saveDepth } from './mapDepth';
import { MapSurface } from './MapSurface';
import './map.css';

interface MapData {
  model: MapModel;
  /** Present only when links to GitHub are right: an origin on github.com, the checkout root, the commit HEAD points to. */
  repo: RepoRef | null;
  name: string;
  /** The preset the CLI's --depth chose; the map opens at it on every load. */
  depth: Depth;
}

function Standalone({ data }: { data: MapData }): React.JSX.Element {
  const appearance = useV2Appearance('system');
  // Stable across a theme flip, so the surface never sees a new function and starts over.
  const evidenceLink = useMemo(() => {
    const link = data.repo ? githubEvidenceLink(data.repo) : null;
    return (file: string, line: number): string | null => link?.({ file, line }) ?? null;
  }, [data.repo]);
  return (
    <SystemRoot appearance={appearance} density="comfortable" className="map-root" data-testid="v2-map">
      <MapSurface model={data.model} storageKey={data.name} evidenceLink={evidenceLink} />
    </SystemRoot>
  );
}

const raw = document.getElementById('ofk-map-data')?.textContent;
const root = document.getElementById('root');
if (raw && root) {
  const data = JSON.parse(raw) as MapData;
  document.title = `${data.name} · map`;
  saveDepth(data.name, data.depth); // once, before MapSurface reads it
  createRoot(root).render(<Standalone data={data} />);
}
