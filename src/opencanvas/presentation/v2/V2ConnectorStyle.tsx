import { useRef, useState } from 'react';
import type { ScenePage } from '../../domain/document/types';
import type { DocumentCommand } from '../../domain/commands/types';
import { resolveConnectorPresentation } from '../../domain/connectors/presentation';
import {
  buildStyleConnectorCommand,
  type ConnectorDashStyle,
  type ConnectorMarkerEnd,
} from '../../domain/commands/styleConnectors';
import { Button, ColorPicker, ColorSwatch, NumberField, Popover, PopoverHeader, Segmented } from '../design-system';

interface V2ConnectorStyleProps {
  readonly page: ScenePage;
  readonly connectorId: string;
  readonly commit: (command: DocumentCommand) => void;
}

const PRESETS = ['#64748b', '#252724', '#e95420', '#b91c1c', '#15803d', '#2563eb'];

function markerValue(markers: readonly string[]): ConnectorMarkerEnd | '' {
  if (markers.includes('arrow')) return 'arrow';
  if (markers.includes('circle')) return 'dot';
  return markers.length === 0 ? 'none' : '';
}

export function V2ConnectorStyle({ page, connectorId, commit }: V2ConnectorStyleProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const swatchRef = useRef<HTMLButtonElement>(null);
  const connector = page.connectors.find((candidate) => candidate.id === connectorId);
  if (!connector) return null;
  const presentation = resolveConnectorPresentation(connector);
  const dash: ConnectorDashStyle = presentation.stroke.dash.length > 0 ? 'dashed' : 'solid';

  function apply(patch: Parameters<typeof buildStyleConnectorCommand>[2]): void {
    setDraftWidth(null);
    setDraftColor(null);
    const command = buildStyleConnectorCommand(page, connectorId, patch);
    if (command) commit(command);
  }
  function close(): void {
    setDraftWidth(null);
    setDraftColor(null);
    setOpen(false);
  }
  return (
    <>
      <ColorSwatch ref={swatchRef} label="Line" color={draftColor ?? presentation.stroke.color}
        onClick={() => { close(); setOpen(true); }} />
      <Popover role="dialog" aria-label="Line" open={open} anchorRef={swatchRef} onClose={close} placement="bottom-start"
        onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <PopoverHeader title="Line" close={<Button variant="quiet" onClick={close}>Done</Button>} />
        <div className="ofk-v2-properties">
          <Segmented<ConnectorMarkerEnd | ''> label="Start marker"
            value={markerValue(presentation.sourceMarkers)}
            onChange={(marker) => { if (marker) apply({ markerStart: marker }); }}
            options={[{ value: 'none', label: 'None' }, { value: 'arrow', label: 'Arrow' }, { value: 'dot', label: 'Dot' }]} />
          <Segmented<ConnectorMarkerEnd | ''> label="End marker"
            value={markerValue(presentation.targetMarkers)}
            onChange={(marker) => { if (marker) apply({ markerEnd: marker }); }}
            options={[{ value: 'none', label: 'None' }, { value: 'arrow', label: 'Arrow' }, { value: 'dot', label: 'Dot' }]} />
          <Segmented<ConnectorDashStyle> label="Line style" value={dash}
            onChange={(style) => apply({ dash: style })}
            options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }]} />
          <NumberField label="Stroke width" value={draftWidth ?? presentation.stroke.width}
            min={0.5} max={8} step={0.5} unit="px" onChange={setDraftWidth}
            onCommit={(value) => apply({ strokeWidth: value })} />
          <ColorPicker value={draftColor ?? presentation.stroke.color} presets={PRESETS}
            onChange={setDraftColor} onCommit={(value) => apply({ color: value })} />
        </div>
      </Popover>
    </>
  );
}
