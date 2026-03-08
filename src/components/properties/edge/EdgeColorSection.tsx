import React, { useRef, useState } from 'react';
import { PaintBucket } from 'lucide-react';
import type { FlowEdge } from '@/lib/types';
import { NODE_COLOR_LABELS, NODE_COLOR_OPTIONS, NODE_EXPORT_COLORS } from '@/theme';
import { SwatchPicker } from '../SwatchPicker';
import { CustomColorPopover } from '../CustomColorPopover';
import { normalizeHex } from '../colorPickerUtils';

const EDGE_COLORS = NODE_COLOR_OPTIONS.map((color) => ({
  id: NODE_EXPORT_COLORS[color].border,
  label: NODE_COLOR_LABELS[color],
})) as ReadonlyArray<{ id: string; label: string }>;

function recolorMarker(
  marker: FlowEdge['markerStart'] | FlowEdge['markerEnd'],
  color: string
): FlowEdge['markerStart'] | FlowEdge['markerEnd'] {
  if (!marker || typeof marker === 'string' || !('type' in marker)) {
    return marker;
  }

  return {
    ...marker,
    color,
  };
}

interface EdgeColorSectionProps {
  selectedEdge: FlowEdge;
  onChange: (id: string, updates: Partial<FlowEdge>) => void;
}

export function EdgeColorSection({
  selectedEdge,
  onChange,
}: EdgeColorSectionProps): React.ReactElement {
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const customTriggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedStroke = selectedEdge.style?.stroke || '#94a3b8';
  const customStroke = normalizeHex(selectedStroke) || '#94a3b8';

  function closeCustomPicker(): void {
    setCustomPickerOpen(false);
  }

  function updateStroke(stroke: string): void {
    onChange(selectedEdge.id, {
      style: { ...selectedEdge.style, stroke },
      markerStart: recolorMarker(selectedEdge.markerStart, stroke),
      markerEnd: recolorMarker(selectedEdge.markerEnd, stroke),
    });
  }

  return (
    <div className="relative">
      <SwatchPicker
        items={[
          ...EDGE_COLORS.map((color) => ({
            id: color.id,
            label: color.label,
            backgroundColor: color.id,
          })),
          {
            id: 'custom',
            label: 'Custom',
            backgroundColor: '#ffffff',
            accentColor: customStroke,
            preview: (
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                <PaintBucket className="h-3 w-3" />
              </div>
            ),
          },
        ]}
        selectedId={selectedStroke}
        onSelect={(value, button) => {
          if (value === 'custom') {
            customTriggerRef.current = button || customTriggerRef.current;
            setCustomPickerOpen(true);
            updateStroke(customStroke);
            return;
          }

          closeCustomPicker();
          updateStroke(value);
        }}
        columns={5}
        size="sm"
        showCaption={true}
        caption={valueLabelForColor(selectedStroke)}
      />

      <CustomColorPopover
        isOpen={customPickerOpen}
        anchorRef={customTriggerRef}
        currentColor={customStroke}
        onChange={updateStroke}
        onRequestClose={closeCustomPicker}
        title="Custom"
        closeLabel="Close edge custom color picker"
        hueAriaLabel="Edge hue"
        fieldAriaLabel="Custom edge color field"
      />
    </div>
  );
}

function valueLabelForColor(stroke: string): string {
  const preset = EDGE_COLORS.find((color) => color.id === stroke);
  return preset?.label || 'Custom';
}
