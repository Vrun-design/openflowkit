import { useEffect, useState } from 'react';
import {
  IconAlignCenter, IconAlignLeft, IconAlignRight, IconArrowBarToDown, IconArrowBarToUp,
  IconArrowsVertical, IconChevronDown, IconBold, IconItalic, IconPhoto, IconStrikethrough, IconUnderline,
} from '@tabler/icons-react';

import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { JsonObject } from '../../domain/document/json';
import type { DocumentCommand } from '../../domain/commands/types';
import { buildStyleNodesCommand } from '../../domain/commands/styleNodes';
import { buildSetIconCommand } from '../../domain/commands/iconCommands';
import { buildSetInkCommand } from '../../domain/commands/inkCommands';
import { buildSetHeaderCommand } from '../../domain/commands/groupNodes';
import { resolveArchitectureNodePresentation } from '../../domain/nodes/architectureNodePresentation';
import { V2IconPicker } from './V2IconPicker';
import { resolveNodeStyle, STYLE_LIMITS, type NodeStyle } from '../../domain/nodes/nodeStyle';
import { isContainerNodeKind } from '../../domain/nodes/containerNodePresentation';
import { Icon, NumberField, Segmented } from '../design-system';
import {
  INK_PRESETS, PALETTE_KEYS, PALETTE_LABELS, paletteFillPatch, paletteKeyForFill, paletteSwatch, type PaletteMode,
} from '../../domain/nodes/nodePalette';
import { ChoiceRow, CustomColorSwatch, FontPicker, PanelRow, StyleButton, SwatchGrid, ToggleRow, useStyleDraft } from './V2StyleControls';

export type NodeStyleCommon = { readonly [K in keyof NodeStyle]: NodeStyle[K] | null };

/** Per-key common value across the selection; null where they differ. */
export function commonNodeStyle(nodes: readonly SceneNode[]): NodeStyleCommon {
  const styles = nodes.map((node) => resolveNodeStyle(node));
  const first = styles[0] ?? EMPTY_STYLE;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(first) as (keyof NodeStyle)[]) {
    const value = first[key];
    const same = styles.every((style) => Array.isArray(value)
      ? JSON.stringify(style[key]) === JSON.stringify(value) : style[key] === value);
    result[key] = same ? value : null;
  }
  return result as NodeStyleCommon;
}

const EMPTY_STYLE = resolveNodeStyle({
  id: '', kind: 'process', parentId: null, layerId: '', zIndex: 0,
  transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
  size: { width: 0, height: 0 }, content: {}, appearance: {}, ports: [], metadata: {}, extensions: {},
});

interface NodeStylePanelsProps {
  readonly page: ScenePage;
  readonly nodeIds: readonly string[];
  readonly commit: (command: DocumentCommand) => void;
  readonly onPreview: (patch: JsonObject | null) => void;
  /** Sticky defaults: every committed patch is reported so new shapes inherit it. */
  readonly onCommitted: (patch: JsonObject) => void;
}

type Panel = 'icon' | 'fill' | 'outline' | 'text' | 'ink';

const FONT_SIZE_PRESETS = [{ value: 12, label: 'XS' }, { value: 14, label: 'S' }, { value: 18, label: 'M' }, { value: 24, label: 'L' }];
const PADDING_PRESETS = [{ value: 8, label: 'S' }, { value: 16, label: 'M' }, { value: 24, label: 'L' }];
const LINE_HEIGHT_PRESETS = [1, 1.25, 1.5, 2].map((value) => ({ value, label: String(value) }));
const LETTER_SPACING_PRESETS = [{ value: 0, label: '–', title: 'None' }, { value: 0.02, label: 'S' }, { value: 0.05, label: 'M' }, { value: 0.1, label: 'L' }];
const WIDTH_PRESETS = [1, 2, 3, 4].map((value) => ({
  value, label: <span className="ofk-width-glyph" style={{ height: value }} />, title: `${value}px`,
}));

function inkOptions(): { id: string; label: string; color: string }[] {
  return INK_PRESETS.map(({ key, hex }) => ({ id: hex, label: PALETTE_LABELS[key], color: hex }));
}

export function V2NodeStylePanels({ page, nodeIds, commit, onPreview, onCommitted }: NodeStylePanelsProps): React.JSX.Element | null {
  const [open, setOpen] = useState<Panel | null>(null);
  const nodes = page.nodes.filter((node) => nodeIds.includes(node.id));
  const { draft, preview, apply, clear } = useStyleDraft<JsonObject>(onPreview, (patch) => {
    const command = buildStyleNodesCommand(page, nodeIds, patch);
    if (command) commit(command);
    onCommitted(patch);
  });
  const common = commonNodeStyle(nodes);
  const [mode, setMode] = useState<PaletteMode>(() => paletteKeyForFill(common.fill)?.mode ?? 'pastel');
  // ⌘G groups are invisible: nothing to paint.
  if (!nodes.length || nodes.every((node) => node.kind === 'group')) return null;
  const view = (key: keyof NodeStyle) => (draft && key in draft ? draft[key] : common[key]);
  const isText = nodes.every((node) => node.kind === 'text');
  // Freeform strokes carry their ink in content, not appearance.
  const isStroke = nodes.every((node) => node.kind === 'pen' || node.kind === 'highlighter'
    || node.kind === 'line' || node.kind === 'arrow');
  const inkColor = typeof nodes[0]?.content.strokeColor === 'string'
    ? nodes[0].content.strokeColor : '#334155';
  const inkWidth = typeof nodes[0]?.content.strokeWidth === 'number'
    ? nodes[0].content.strokeWidth : 3;
  const commitInk = (patch: { strokeColor?: string; strokeWidth?: number }) => {
    const command = buildSetInkCommand(page, nodeIds, patch);
    if (command) commit(command);
    onCommitted(patch);
  };
  // Containers carry a title band: vertical alignment and shadow do not apply.
  const isContainer = nodes.every((node) => isContainerNodeKind(node.kind));
  // Any shape can become an icon node; the current icon (one selected) shows in the button.
  const canPickIcon = !isText && !isContainer;
  const currentIcon = nodes.length === 1 ? resolveArchitectureNodePresentation(nodes[0])?.icon : undefined;
  const selectedIcon = currentIcon?.kind === 'provider' ? currentIcon : null;
  const textColorIsAuto = nodes.every((node) => node.appearance.textColor === undefined || node.appearance.textColor === 'auto');
  const toggle = (panel: Panel) => { clear(); setOpen((current) => (current === panel ? null : panel)); };
  const close = () => { clear(); setOpen(null); };
  const opacity = view('opacity') as number | null;

  const fill = view('fill') as string | null;
  const stroke = view('stroke') as string | null;
  const textColor = view('textColor') as string | null;
  const paletteHit = paletteKeyForFill(fill);
  const fillOptions = [
    { id: 'transparent', label: 'No fill', color: 'transparent' },
    ...PALETTE_KEYS.map((key) => {
      const swatch = paletteSwatch(key, mode);
      return { id: key, label: PALETTE_LABELS[key], color: swatch.fill, border: swatch.stroke };
    }),
  ];
  const fontWeight = view('fontWeight') as number | null;
  const fontStyle = view('fontStyle') as string | null;
  const decoration = view('textDecoration') as string | null;

  return (
    <>
      {canPickIcon ? (
        <StyleButton label="Icon" open={open === 'icon'} onToggle={() => toggle('icon')} onClose={close} panelClassName="ofk-style-panel--icons"
          preview={selectedIcon ? <IconSwatch packId={selectedIcon.packId} shapeId={selectedIcon.shapeId} /> : <Icon icon={IconPhoto} />}>
          <V2IconPicker selected={selectedIcon} onClose={close} onPick={(icon) => {
            const command = buildSetIconCommand(page, nodeIds, icon);
            if (command) commit(command);
            close();
          }} />
        </StyleButton>
      ) : null}
      {isStroke ? (
        <StyleButton label="Ink" open={open === 'ink'} onToggle={() => toggle('ink')} onClose={close}
          preview={<span className="ofk-style-line" style={{ borderTopColor: inkColor, borderTopWidth: Math.min(4, inkWidth) }} />}>
          <PanelRow label="Colour">
            <SwatchGrid label="Ink colour" options={inkOptions()} selected={inkColor}
              onPick={(id) => commitInk({ strokeColor: id })} />
          </PanelRow>
          <PanelRow label="Width">
            <ChoiceRow label="Ink width" value={inkWidth}
              options={[1, 2, 3, 4, 6, 8, 12, 16].map((value) => ({
                value, label: <span className="ofk-width-glyph" style={{ height: Math.min(6, value) }} />,
                title: `${value}px`,
              }))}
              onChange={(value) => commitInk({ strokeWidth: value })} />
          </PanelRow>
        </StyleButton>
      ) : null}
      {isStroke ? null : (
      <StyleButton label={isText ? 'Background' : 'Fill'} open={open === 'fill'} onToggle={() => toggle('fill')} onClose={close}
        preview={<span className="ofk-style-swatch" data-mixed={fill === null || undefined} data-transparent={fill === 'transparent' || undefined}
          style={fill && fill !== 'transparent' ? { background: fill, borderColor: stroke ?? fill } : undefined} />}>
        <PanelRow label="Style">
          <Segmented<PaletteMode> label="Palette mode" value={mode} onChange={setMode}
            options={[{ value: 'pastel', label: 'Pastel' }, { value: 'solid', label: 'Solid' }]} />
        </PanelRow>
        <PanelRow label="Color">
          <SwatchGrid label="Fill colour" options={fillOptions}
            selected={fill === 'transparent' ? 'transparent' : paletteHit?.mode === mode ? paletteHit.key : null}
            onPick={(id) => apply(paletteFillPatch(id as Parameters<typeof paletteFillPatch>[0], mode))}
            trailing={<CustomColorSwatch value={fill} onChange={(hex) => preview({ fill: hex })} onCommit={(hex) => apply({ fill: hex })} />} />
        </PanelRow>
        <PanelRow label="Corners">
          <NumberField stepper="stacked" label="Corner radius" hideLabel value={view('cornerRadius') as number | null}
            min={STYLE_LIMITS.cornerRadius.min} max={STYLE_LIMITS.cornerRadius.max} step={2} unit="px"
            onChange={(value) => preview({ cornerRadius: value })} onCommit={(value) => apply({ cornerRadius: value })} />
        </PanelRow>
        <PanelRow label="Opacity">
          <NumberField stepper="stacked" label="Opacity" hideLabel value={opacity === null ? null : Math.round(opacity * 100)}
            min={0} max={100} step={10} unit="%"
            onChange={(value) => preview({ opacity: value / 100 })} onCommit={(value) => apply({ opacity: value / 100 })} />
        </PanelRow>
        {isContainer ? null : (
          <PanelRow label="Shadow">
            <Segmented<'on' | 'off' | ''> label="Shadow" value={view('shadow') === null ? '' : view('shadow') === true ? 'on' : 'off'}
              onChange={(value) => apply({ shadow: value === 'on' })}
              options={[{ value: 'off', label: 'None' }, { value: 'on', label: 'Soft' }]} />
          </PanelRow>
        )}
      </StyleButton>
      )}

      {isStroke ? null : (
      <StyleButton label="Outline" open={open === 'outline'} onToggle={() => toggle('outline')} onClose={close}
        preview={<span className="ofk-style-swatch ofk-style-swatch--ring" data-mixed={stroke === null || undefined}
          data-transparent={(stroke === 'transparent' || view('strokeWidth') === 0) || undefined}
          style={stroke && stroke !== 'transparent' ? { borderColor: stroke } : undefined} />}>
        <PanelRow label="Color">
          <SwatchGrid label="Outline colour"
            options={[{ id: 'transparent', label: 'No outline', color: 'transparent' },
              { id: '#ffffff', label: 'White', color: '#ffffff', border: '#cbd5e1' }, ...inkOptions()]}
            selected={stroke} onPick={(id) => apply({ stroke: id })}
            trailing={<CustomColorSwatch value={stroke} onChange={(hex) => preview({ stroke: hex })} onCommit={(hex) => apply({ stroke: hex })} />} />
        </PanelRow>
        <PanelRow label="Width">
          <ChoiceRow label="Width preset" value={view('strokeWidth') as number | null} options={WIDTH_PRESETS}
            onChange={(value) => apply({ strokeWidth: value })} />
          <NumberField stepper="stacked" label="Outline width" hideLabel value={view('strokeWidth') as number | null}
            min={STYLE_LIMITS.strokeWidth.min} max={STYLE_LIMITS.strokeWidth.max} step={0.5} unit="px"
            onChange={(value) => preview({ strokeWidth: value })} onCommit={(value) => apply({ strokeWidth: value })} />
        </PanelRow>
        <PanelRow label="Style">
          <Segmented<'solid' | 'dashed' | 'dotted' | ''> label="Outline style" value={(view('strokeStyle') as 'solid' | 'dashed' | 'dotted' | null) ?? ''}
            onChange={(value) => { if (value) apply({ strokeStyle: value }); }}
            options={[{ value: 'solid', label: '—' }, { value: 'dashed', label: '- -' }, { value: 'dotted', label: '···' }]} />
        </PanelRow>
      </StyleButton>
      )}

      {isStroke ? null : (
      <StyleButton label="Text" open={open === 'text'} onToggle={() => toggle('text')} onClose={close} panelClassName="ofk-style-panel--wide"
        preview={<span className="ofk-style-glyph" style={{ textDecorationColor: textColor ?? undefined }}>A</span>}>
        {isContainer ? (
          <PanelRow label="Header">
            <Segmented<'shown' | 'hidden'> label="Header" value={nodes.every((node) => node.content.showHeader !== false) ? 'shown' : 'hidden'}
              onChange={(value) => { const command = buildSetHeaderCommand(page, nodeIds, value === 'shown'); if (command) commit(command); }}
              options={[{ value: 'shown', label: 'Shown' }, { value: 'hidden', label: 'Hidden' }]} />
          </PanelRow>
        ) : null}
        <PanelRow label="Color">
          <SwatchGrid label="Text colour" options={[{ id: 'auto', label: 'Auto', color: 'currentColor' },
            { id: '#ffffff', label: 'White', color: '#ffffff', border: '#cbd5e1' },
            { id: '#64748b', label: 'Mid gray', color: '#64748b' }, ...inkOptions()]}
            selected={textColorIsAuto ? 'auto' : textColor} onPick={(id) => apply({ textColor: id })}
            trailing={<CustomColorSwatch value={textColor} onChange={(hex) => preview({ textColor: hex })} onCommit={(hex) => apply({ textColor: hex })} />} />
        </PanelRow>
        <PanelRow label="Font">
          <FontPicker value={view('fontFamily') as NodeStyle['fontFamily'] | null}
            onChange={(fontFamily) => apply({ fontFamily })} />
        </PanelRow>
        <PanelRow label="Size">
          <ChoiceRow label="Size preset" value={view('fontSize') as number | null} options={FONT_SIZE_PRESETS}
            onChange={(value) => apply({ fontSize: value })} />
          <NumberField stepper="stacked" label="Font size" hideLabel value={view('fontSize') as number | null}
            min={STYLE_LIMITS.fontSize.min} max={STYLE_LIMITS.fontSize.max} step={1} unit="px"
            onChange={(value) => preview({ fontSize: value })} onCommit={(value) => apply({ fontSize: value })} />
        </PanelRow>
        <PanelRow label="Style">
          <ToggleRow label="Text style" onToggle={(id) => {
            if (id === 'bold') apply({ fontWeight: fontWeight === 700 ? 400 : 700 });
            else if (id === 'italic') apply({ fontStyle: fontStyle === 'italic' ? 'normal' : 'italic' });
            else if (id === 'underline') apply({ textDecoration: decoration === 'underline' ? 'none' : 'underline' });
            else apply({ textDecoration: decoration === 'line-through' ? 'none' : 'line-through' });
          }} options={[
            { id: 'bold', label: 'Bold', icon: <Icon icon={IconBold} />, on: fontWeight === 700, shortcut: '⌘B' },
            { id: 'italic', label: 'Italic', icon: <Icon icon={IconItalic} />, on: fontStyle === 'italic', shortcut: '⌘I' },
            { id: 'underline', label: 'Underline', icon: <Icon icon={IconUnderline} />, on: decoration === 'underline', shortcut: '⌘U' },
            { id: 'strike', label: 'Strikethrough', icon: <Icon icon={IconStrikethrough} />, on: decoration === 'line-through' },
          ]} />
        </PanelRow>
        <PanelRow label="Align">
          <ChoiceRow<NodeStyle['textAlign']> label="Horizontal align" value={view('textAlign') as NodeStyle['textAlign'] | null}
            onChange={(value) => apply({ textAlign: value })} options={[
              { value: 'start', label: <Icon icon={IconAlignLeft} />, title: 'Left' },
              { value: 'center', label: <Icon icon={IconAlignCenter} />, title: 'Centre' },
              { value: 'end', label: <Icon icon={IconAlignRight} />, title: 'Right' },
            ]} />
          {isContainer ? null : (
            <ChoiceRow<NodeStyle['textVerticalAlign']> label="Vertical align" value={view('textVerticalAlign') as NodeStyle['textVerticalAlign'] | null}
              onChange={(value) => apply({ textVerticalAlign: value })} options={[
                { value: 'top', label: <Icon icon={IconArrowBarToUp} />, title: 'Top' },
                { value: 'middle', label: <Icon icon={IconArrowsVertical} />, title: 'Middle' },
                { value: 'bottom', label: <Icon icon={IconArrowBarToDown} />, title: 'Bottom' },
              ]} />
          )}
        </PanelRow>
        <details className="ofk-style-more">
          <summary className="ofk-caption">Spacing<Icon icon={IconChevronDown} /></summary>
          <PanelRow label="Padding">
            <ChoiceRow label="Padding" value={view('textPadding') as number | null} options={PADDING_PRESETS}
              onChange={(value) => apply({ textPadding: value })} />
          </PanelRow>
          <PanelRow label="Line height">
            <ChoiceRow label="Line height" value={view('lineHeight') as number | null} options={LINE_HEIGHT_PRESETS}
              onChange={(value) => apply({ lineHeight: value })} />
          </PanelRow>
          <PanelRow label="Letter spacing">
            <ChoiceRow label="Letter spacing" value={view('letterSpacing') as number | null} options={LETTER_SPACING_PRESETS}
              onChange={(value) => apply({ letterSpacing: value })} />
          </PanelRow>
        </details>
      </StyleButton>
      )}
    </>
  );
}

/** The selected node's icon, drawn in the bar button. */
function IconSwatch({ packId, shapeId }: { readonly packId: string; readonly shapeId: string }): React.JSX.Element {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void loadProviderShapePreview(packId, shapeId).then((preview) => { if (alive) setUrl(preview?.previewUrl ?? null); });
    return () => { alive = false; };
  }, [packId, shapeId]);
  return url ? <img className="ofk-style-icon-swatch" src={url} alt="" /> : <Icon icon={IconPhoto} />;
}
