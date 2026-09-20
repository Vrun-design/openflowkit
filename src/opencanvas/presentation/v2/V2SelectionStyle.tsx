import { useEffect, useRef, useState } from 'react';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { JsonObject } from '../../domain/document/json';
import type { DocumentCommand } from '../../domain/commands/types';
import { resolveNodeStroke, type NodeStrokeStyle } from '../../domain/nodes/nodeStroke';
import { Button, ColorPicker, ColorSwatch, NumberField, Popover, PopoverHeader, Segmented } from '../design-system';
import { buildStyleNodesCommand } from '../../domain/commands/styleNodes';

interface V2SelectionStyleProps {
  page: ScenePage;
  nodeIds: readonly string[];
  commit: (command: DocumentCommand) => void;
  onPreview: (patch: JsonObject | null) => void;
}

const PRESETS = ['transparent', '#fdfdfb', '#252724', '#e95420', '#b8d9ce', '#c9b8ed'];

function common<T>(nodes: readonly SceneNode[], read: (node: SceneNode) => T): T | null {
  const first = read(nodes[0]);
  return nodes.every((node) => read(node) === first) ? first : null;
}

export function V2SelectionStyle({ page, nodeIds, commit, onPreview }: V2SelectionStyleProps): React.JSX.Element | null {
  const [open, setOpen] = useState<'fill' | 'stroke' | null>(null);
  const [draft, setDraft] = useState<JsonObject>({});
  const fillRef = useRef<HTMLButtonElement>(null);
  const strokeRef = useRef<HTMLButtonElement>(null);
  const previewRef = useRef(onPreview);
  useEffect(() => { previewRef.current = onPreview; }, [onPreview]);
  useEffect(() => () => previewRef.current(null), []);
  const nodes = page.nodes.filter((node) => nodeIds.includes(node.id));
  // Text has its own typography contract; don't expose shape paints it cannot render.
  if (!nodes.length || nodes.some((node) => node.kind !== 'process' && node.kind !== 'custom')) return null;
  const fill = common(nodes, (node) => typeof node.appearance.fill === 'string' ? node.appearance.fill : '#fdfdfb');
  const stroke = common(nodes, (node) => typeof node.appearance.stroke === 'string' ? node.appearance.stroke : '#555952');
  const width = common(nodes, (node) => resolveNodeStroke(node).width);
  const strokeStyle = common(nodes, (node) => resolveNodeStroke(node).style);

  function preview(patch: JsonObject): void {
    setDraft(patch);
    onPreview(patch);
  }
  function apply(patch: JsonObject): void {
    onPreview(null);
    setDraft({});
    const command = buildStyleNodesCommand(page, nodeIds, patch);
    if (command) commit(command);
  }
  function close(): void {
    onPreview(null);
    setDraft({});
    setOpen(null);
  }
  const color = open === 'fill' ? fill : stroke;
  const draftColor = open ? draft[open] : undefined;
  return (
    <>
      <ColorSwatch ref={fillRef} label="Fill" color={fill} onClick={() => { close(); setOpen('fill'); }} />
      <ColorSwatch ref={strokeRef} label="Stroke" color={stroke} onClick={() => { close(); setOpen('stroke'); }} />
      <Popover role="dialog" aria-label={open === 'fill' ? 'Fill' : 'Stroke'} open={open !== null} anchorRef={open === 'fill' ? fillRef : strokeRef} onClose={close} placement="bottom-start"
        onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <PopoverHeader title={open === 'fill' ? 'Fill' : 'Stroke'} close={<Button variant="quiet" onClick={close}>Done</Button>} />
        <div className="ofk-v2-properties">
          {open === 'stroke' ? <>
            <Segmented<NodeStrokeStyle | ''> label="Stroke style" value={strokeStyle ?? ''}
              onChange={(style) => { if (style) apply({ strokeStyle: style }); }}
              options={[{ value: 'solid', label: 'Solid' }, { value: 'dashed', label: 'Dashed' }, { value: 'dotted', label: 'Dotted' }]} />
            <NumberField label="Stroke width" value={typeof draft.strokeWidth === 'number' ? draft.strokeWidth : width}
              min={0} max={24} step={0.5} unit="px" onChange={(value) => preview({ strokeWidth: value })}
              onCommit={(value) => apply({ strokeWidth: value })} />
          </> : null}
          <ColorPicker value={typeof draftColor === 'string' ? draftColor : color} presets={PRESETS}
            onChange={(value) => { if (open) preview({ [open]: value }); }}
            onCommit={(value) => { if (open) apply({ [open]: value }); }} />
        </div>
      </Popover>
    </>
  );
}
