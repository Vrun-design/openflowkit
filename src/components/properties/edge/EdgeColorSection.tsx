import React, { useRef, useState } from 'react';
import { PaintBucket } from 'lucide-react';
import type { FlowEdge } from '@/lib/types';
import {
  NODE_COLOR_LABELS,
  NODE_COLOR_OPTIONS,
  resolveEdgeVisualStyle,
  resolveNodeVisualStyle,
} from '@/theme';
import { SwatchPicker } from '../SwatchPicker';
import { CustomColorPopover } from '../CustomColorPopover';
import { normalizeHex } from '../colorPickerUtils';
import { buildEdgeStrokeUpdates } from './edgeColorUtils';

const EDGE_COLORS = NODE_COLOR_OPTIONS.map((color) => {
  const visualStyle = resolveNodeVisualStyle(color, 'subtle');
  return {
    id: visualStyle.border,
    label: NODE_COLOR_LABELS[color],
    backgroundColor: visualStyle.bg,
    accentColor: visualStyle.border,
  };
});

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
    onChange(selectedEdge.id, buildEdgeStrokeUpdates(selectedEdge, stroke));
  }

  return (
    <div className="relative">
      <SwatchPicker
        items={[
          ...EDGE_COLORS.map((color) => ({
            id: color.id,
            label: color.label,
            backgroundColor: color.backgroundColor,
            accentColor: color.accentColor,
          })),
          {
            id: 'custom',
            label: 'Custom',
            backgroundColor: '#ffffff',
            accentColor: customStroke,
            preview: (
              <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary-light)]">
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
  if (preset) {
    return preset.label;
  }

  return resolveEdgeVisualStyle(stroke).stroke === stroke ? 'Custom' : 'Default';
}
