import { Button } from '../../opencanvas/presentation/design-system';

/** "Showing 18 of 43 links · Show all": the map leaves its weakest arrows undrawn until asked. Nothing when none were left out. */
export function MapLinksChip({ shown, total, minor, all, onToggle }: { shown: number; total: number; minor: number; all: boolean; onToggle: () => void }): React.JSX.Element | null {
  if (minor === 0) return null;
  return (
    <div className="map-links-chip" role="group" aria-label="Arrows shown">
      <span>{all ? `Showing all ${total} links` : `Showing ${shown} of ${total} links`}</span>
      <Button variant="quiet" selected={all} onClick={onToggle}>{all ? 'Show fewer' : 'Show all'}</Button>
    </div>
  );
}
