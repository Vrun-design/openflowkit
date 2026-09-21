import { useState } from 'react';
import { IconArrowsRightLeft, IconBold, IconItalic, IconUnderline } from '@tabler/icons-react';
import type { ScenePage } from '../../domain/document/types';
import type { DocumentCommand } from '../../domain/commands/types';
import { resolveConnectorPresentation } from '../../domain/connectors/presentation';
import type { ConnectorMarkerGlyph } from '../../domain/connectors/types';
import {
  buildStyleConnectorCommand,
  type ConnectorDashStyle,
  type ConnectorMarkerEnd,
  type ConnectorStylePatch,
} from '../../domain/commands/styleConnectors';
import { STYLE_LIMITS, type FontFamilyKey } from '../../domain/nodes/nodeStyle';
import { Button, ColorPicker, Icon, NumberField, Segmented } from '../design-system';
import { INK_PRESETS, PALETTE_LABELS } from '../../domain/nodes/nodePalette';
import { ChoiceRow, PanelRow, StyleButton, SwatchGrid, ToggleRow } from './V2StyleControls';

interface V2ConnectorStyleProps {
  readonly page: ScenePage;
  readonly connectorId: string;
  readonly commit: (command: DocumentCommand) => void;
  /** Sticky defaults for the next connector. */
  readonly onCommitted: (patch: ConnectorStylePatch) => void;
}

type Panel = 'line' | 'ends' | 'label';
type RouteChoice = 'orthogonal' | 'direct' | 'bezier';

const MARKERS: readonly { value: ConnectorMarkerEnd; label: string }[] = [
  { value: 'none', label: 'None' }, { value: 'arrow', label: 'Arrow' }, { value: 'dot', label: 'Dot' }, { value: 'cross', label: 'Cross' },
];
const WIDTH_PRESETS = [1, 2, 3, 4].map((value) => ({
  value, label: <span className="ofk-width-glyph" style={{ height: value }} />, title: `${value}px`,
}));
const INK = INK_PRESETS.map(({ key, hex }) => ({ id: hex, label: PALETTE_LABELS[key], color: hex }));

function markerValue(markers: readonly ConnectorMarkerGlyph[]): ConnectorMarkerEnd | '' {
  if (markers.length === 0) return 'none';
  if (markers.includes('arrow')) return 'arrow';
  if (markers.includes('circle')) return 'dot';
  if (markers.includes('cross')) return 'cross';
  return '';
}

function dashValue(dash: readonly number[]): ConnectorDashStyle {
  if (dash.length === 0) return 'solid';
  return dash[0] <= 2 ? 'dotted' : 'dashed';
}

export function V2ConnectorStyle({ page, connectorId, commit, onCommitted }: V2ConnectorStyleProps): React.JSX.Element | null {
  const [open, setOpen] = useState<Panel | null>(null);
  const connector = page.connectors.find((candidate) => candidate.id === connectorId);
  if (!connector) return null;
  const presentation = resolveConnectorPresentation(connector);
  const label = presentation.label;
  const route: RouteChoice = connector.route.kind === 'polyline' ? 'direct' : connector.route.kind;

  function apply(patch: ConnectorStylePatch): void {
    const command = buildStyleConnectorCommand(page, connectorId, patch);
    if (command) commit(command);
    const { reverse: _reverse, route: _route, ...sticky } = patch;
    if (Object.keys(sticky).length) onCommitted(sticky);
  }
  const toggle = (panel: Panel) => setOpen((current) => (current === panel ? null : panel));
  const close = () => setOpen(null);

  return (
    <>
      <StyleButton label="Line" open={open === 'line'} onToggle={() => toggle('line')} onClose={close}
        preview={<span className="ofk-style-line" style={{ borderTopColor: presentation.stroke.color, borderTopWidth: Math.min(4, presentation.stroke.width),
          borderTopStyle: dashValue(presentation.stroke.dash) === 'solid' ? 'solid' : dashValue(presentation.stroke.dash) }} />}>
        <PanelRow label="Color">
          <SwatchGrid label="Line colour" options={INK} selected={presentation.stroke.color.toLowerCase()}
            onPick={(id) => apply({ color: id })} />
        </PanelRow>
        <details className="ofk-style-more">
          <summary className="ofk-caption">Custom</summary>
          <ColorPicker value={presentation.stroke.color} presets={[]} onChange={() => undefined}
            onCommit={(hex) => apply({ color: hex })} />
        </details>
        <PanelRow label="Width">
          <ChoiceRow label="Width preset" value={presentation.stroke.width} options={WIDTH_PRESETS}
            onChange={(value) => apply({ strokeWidth: value })} />
          <NumberField label="Line width" hideLabel value={presentation.stroke.width} min={0.5} max={8} step={0.5} unit="px"
            onChange={() => undefined} onCommit={(value) => apply({ strokeWidth: value })} />
        </PanelRow>
        <PanelRow label="Style">
          <Segmented<ConnectorDashStyle> label="Line style" value={dashValue(presentation.stroke.dash)}
            onChange={(dash) => apply({ dash })}
            options={[{ value: 'solid', label: '—' }, { value: 'dashed', label: '- -' }, { value: 'dotted', label: '···' }]} />
        </PanelRow>
        <PanelRow label="Path">
          <Segmented<RouteChoice> label="Path" value={route} onChange={(value) => apply({ route: value })}
            options={[{ value: 'orthogonal', label: 'Elbow' }, { value: 'direct', label: 'Straight' }, { value: 'bezier', label: 'Curve' }]} />
        </PanelRow>
        {route === 'orthogonal' ? (
          <PanelRow label="Corners">
            <NumberField label="Corner radius" hideLabel value={presentation.cornerRadius} min={0} max={24} step={2} unit="px"
              onChange={() => undefined} onCommit={(value) => apply({ cornerRadius: value })} />
          </PanelRow>
        ) : null}
        <PanelRow label="Opacity">
          <NumberField label="Opacity" hideLabel value={Math.round(presentation.stroke.opacity * 100)} min={10} max={100} step={10} unit="%"
            onChange={() => undefined} onCommit={(value) => apply({ opacity: value / 100 })} />
        </PanelRow>
      </StyleButton>

      <StyleButton label="Ends" open={open === 'ends'} onToggle={() => toggle('ends')} onClose={close}
        preview={<span className="ofk-style-text">{markerValue(presentation.sourceMarkers) === 'none' ? '—' : '←'}{markerValue(presentation.targetMarkers) === 'none' ? '—' : '→'}</span>}>
        <PanelRow label="Start">
          <Segmented<ConnectorMarkerEnd | ''> label="Start marker" value={markerValue(presentation.sourceMarkers)}
            onChange={(marker) => { if (marker) apply({ markerStart: marker }); }} options={MARKERS} />
        </PanelRow>
        <PanelRow label="End">
          <Segmented<ConnectorMarkerEnd | ''> label="End marker" value={markerValue(presentation.targetMarkers)}
            onChange={(marker) => { if (marker) apply({ markerEnd: marker }); }} options={MARKERS} />
        </PanelRow>
        <PanelRow>
          <Button variant="secondary" onClick={() => apply({ reverse: true })}>
            <Icon icon={IconArrowsRightLeft} /> Reverse direction
          </Button>
        </PanelRow>
      </StyleButton>

      <StyleButton label="Label" open={open === 'label'} onToggle={() => toggle('label')} onClose={close}
        preview={<span className="ofk-style-glyph" style={{ color: label.textColor }}>A</span>}>
        <PanelRow label="Color">
          <SwatchGrid label="Label colour" options={INK} selected={label.textColor} onPick={(id) => apply({ labelColor: id })} />
        </PanelRow>
        <PanelRow label="Background">
          <SwatchGrid label="Label background"
            options={[{ id: 'transparent', label: 'None', color: 'transparent' }, { id: '#ffffff', label: 'White', color: '#ffffff', border: '#cbd5e1' }, ...INK]}
            selected={label.fill} onPick={(id) => apply({ labelBackground: id })} />
        </PanelRow>
        <PanelRow label="Font">
          <Segmented<FontFamilyKey> label="Label font" value={label.fontFamily} onChange={(value) => apply({ labelFontFamily: value })}
            options={[
              { value: 'sans', label: <span className="ofk-font-sans">Aa</span>, title: 'Sans' },
              { value: 'serif', label: <span className="ofk-font-serif">Aa</span>, title: 'Serif' },
              { value: 'mono', label: <span className="ofk-font-mono">Aa</span>, title: 'Mono' },
              { value: 'hand', label: <span className="ofk-font-hand">Aa</span>, title: 'Hand' },
            ]} />
        </PanelRow>
        <PanelRow label="Size">
          <NumberField label="Label size" hideLabel value={label.fontSize} min={STYLE_LIMITS.fontSize.min} max={48} step={1} unit="px"
            onChange={() => undefined} onCommit={(value) => apply({ labelFontSize: value })} />
        </PanelRow>
        <PanelRow label="Style">
          <ToggleRow label="Label style" onToggle={(id) => {
            if (id === 'bold') apply({ labelFontWeight: label.fontWeight === 700 ? 400 : 700 });
            else if (id === 'italic') apply({ labelFontStyle: label.fontStyle === 'italic' ? 'normal' : 'italic' });
            else apply({ labelTextDecoration: label.textDecoration === 'underline' ? 'none' : 'underline' });
          }} options={[
            { id: 'bold', label: 'Bold', icon: <Icon icon={IconBold} />, on: label.fontWeight === 700 },
            { id: 'italic', label: 'Italic', icon: <Icon icon={IconItalic} />, on: label.fontStyle === 'italic' },
            { id: 'underline', label: 'Underline', icon: <Icon icon={IconUnderline} />, on: label.textDecoration === 'underline' },
          ]} />
        </PanelRow>
      </StyleButton>
    </>
  );
}
