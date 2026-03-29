import React, { useMemo, useRef, useState } from 'react';
import { PaintBucket } from 'lucide-react';
import {
    NODE_COLOR_LABELS,
    NODE_COLOR_OPTIONS,
    NODE_EXPORT_COLORS,
    resolveNodeVisualStyle,
    type NodeColorMode,
} from '@/theme';
import { SwatchPicker, type SwatchPickerItem } from './SwatchPicker';
import { CustomColorPopover } from './CustomColorPopover';
import { DEFAULT_CUSTOM_COLOR, normalizeHex } from './colorPickerUtils';

interface ColorPickerProps {
    selectedColor?: string;
    selectedColorMode?: NodeColorMode;
    selectedCustomColor?: string;
    onChange: (color: string) => void;
    onColorModeChange?: (mode: NodeColorMode) => void;
    onCustomColorChange?: (color: string) => void;
    allowCustom?: boolean;
    allowModes?: boolean;
}

function getVisibleLabel(color: string | undefined): string {
    if (color === 'custom') {
        return 'Custom';
    }
    return NODE_COLOR_LABELS[(color as keyof typeof NODE_COLOR_LABELS) || 'white'] || NODE_COLOR_LABELS.white;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
    selectedColor,
    selectedColorMode = 'subtle',
    selectedCustomColor,
    onChange,
    onColorModeChange,
    onCustomColorChange,
    allowCustom = false,
    allowModes = false,
}) => {
    const [customEditorOpen, setCustomEditorOpen] = useState(false);
    const customTriggerRef = useRef<HTMLButtonElement | null>(null);
    const activeLabel = getVisibleLabel(selectedColor);
    const customHex = normalizeHex(selectedCustomColor || DEFAULT_CUSTOM_COLOR) || DEFAULT_CUSTOM_COLOR;
    const swatchItems = useMemo<SwatchPickerItem[]>(() => (
        NODE_COLOR_OPTIONS.map((color) => {
            const colorSpec = resolveNodeVisualStyle(color, allowModes ? selectedColorMode : 'subtle');
            const swatchAccentColor = allowModes && selectedColorMode === 'filled'
                ? colorSpec.text
                : NODE_EXPORT_COLORS[color]?.iconColor || colorSpec.border;
            return {
                id: color,
                label: NODE_COLOR_LABELS[color],
                backgroundColor: colorSpec.bg,
                accentColor: swatchAccentColor,
            };
        })
    ), [allowModes, selectedColorMode]);

    function closeCustomEditor(): void {
        setCustomEditorOpen(false);
    }

    function handleSelect(color: string): void {
        closeCustomEditor();
        onChange(color);
    }

    function handleCustomClick(button?: HTMLButtonElement | null): void {
        customTriggerRef.current = button || customTriggerRef.current;
        setCustomEditorOpen(true);
        onChange('custom');
        onCustomColorChange?.(customHex);
    }

    return (
        <div className="space-y-3">
            {allowModes && onColorModeChange && (
                <div className="flex items-center justify-between gap-3">
                    <div className="inline-flex rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]/75 p-1">
                        {(['subtle', 'filled'] as const).map((mode) => {
                            const selected = selectedColorMode === mode;
                            return (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => onColorModeChange(mode)}
                                    className={`rounded-[var(--radius-xs)] px-2 py-1 text-xs font-medium transition-colors ${
                                        selected
                                            ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-sm'
                                            : 'text-[var(--brand-secondary)] hover:text-[var(--brand-text)]'
                                    }`}
                                >
                                    {mode === 'subtle' ? 'Subtle' : 'Filled'}
                                </button>
                            );
                        })}
                    </div>

                    <div className="text-right text-xs font-medium text-[var(--brand-secondary)]">
                        {activeLabel}
                    </div>
                </div>
            )}
            <div className="relative">
                <SwatchPicker
                    items={[
                        ...swatchItems,
                        ...(allowCustom
                            ? [{
                                id: 'custom',
                                label: NODE_COLOR_LABELS.custom,
                                backgroundColor: '#ffffff',
                                accentColor: selectedCustomColor || '#94a3b8',
                                preview: (
                                    <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary)]">
                                        <PaintBucket className="h-3 w-3" />
                                    </div>
                                ),
                            }]
                            : []),
                    ]}
                    selectedId={selectedColor}
                    onSelect={(id, button) => {
                        if (id === 'custom') {
                            handleCustomClick(button);
                            return;
                        }
                        handleSelect(id);
                    }}
                    columns={5}
                    showCaption={true}
                    caption={!allowModes ? activeLabel : undefined}
                />

                {allowCustom && onCustomColorChange && (
                    <CustomColorPopover
                        isOpen={customEditorOpen}
                        anchorRef={customTriggerRef}
                        currentColor={customHex}
                        onChange={(customColor) => {
                            onChange('custom');
                            onCustomColorChange(customColor);
                        }}
                        onRequestClose={closeCustomEditor}
                        title="Custom"
                        closeLabel="Close custom color picker"
                        hueAriaLabel="Hue"
                        fieldAriaLabel="Custom color field"
                    />
                )}
            </div>
        </div>
    );
};
