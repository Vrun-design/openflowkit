import { useId, useMemo, useState, type RefObject } from 'react';
import { search } from '../../../../dsl/map/view';
import type { MapModel } from '../../../../dsl/map/types';
import { Field } from '../../design-system';

/** Search field with a result list (engine `search`, at most 8). Enter or click reveals; Escape clears. */
export function MapSearch({ model, inputRef, onReveal }: { model: MapModel; inputRef: RefObject<HTMLInputElement | null>; onReveal: (id: string) => void }): React.JSX.Element {
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const list = useId();
  const results = useMemo(() => search(model, q), [model, q]);
  const pick = (id: string) => { onReveal(id); setQ(''); inputRef.current?.blur(); };
  return (
    <div className="map-search">
      <Field ref={inputRef} label="Search the map" placeholder="Search  /" autoComplete="off" spellCheck={false} role="combobox" aria-expanded={results.length > 0} aria-controls={list}
        aria-activedescendant={results[at] ? `${list}-${at}` : undefined} value={q} onChange={(e) => { setQ(e.target.value); setAt(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setAt((i) => Math.max(0, Math.min(results.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))); }
          else if (e.key === 'Enter' && results[at]) { e.preventDefault(); pick(results[at]!); }
          else if (e.key === 'Escape') { e.stopPropagation(); setQ(''); e.currentTarget.blur(); }
        }} />
      <div className="map-sr" role="status" aria-live="polite">{q.trim() ? (results.length ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'No matches') : ''}</div>
      {q.trim() && results.length === 0 ? <div className="map-results map-empty">No matches</div> : null}
      {results.length > 0 ? (
        <ul className="map-results" id={list} role="listbox" aria-label="Search results">
          {results.map((id, i) => (
            <li key={id} id={`${list}-${i}`} role="option" aria-selected={i === at} onMouseDown={(e) => { e.preventDefault(); pick(id); }}>
              <span>{model.nodes[id].name}</span><span className="map-result-path">{model.nodes[id].path ?? id}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
