import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { INSPECTOR_INPUT_CLASSNAME } from './InspectorPrimitives';
import { DEFAULT_CUSTOM_COLOR, hexToHsl, hslToHex, normalizeHex } from './colorPickerUtils';

const PICKER_WIDTH = 232;
const PICKER_MARGIN = 8;
const VIEWPORT_PADDING = 16;
const DEFAULT_PICKER_HEIGHT = 300;

interface PopoverPosition {
    top: number;
    left: number;
    maxHeight: number;
}

interface CustomColorPopoverProps {
    isOpen: boolean;
    anchorRef: React.RefObject<HTMLButtonElement | null>;
    currentColor?: string;
    onChange: (color: string) => void;
    onRequestClose: () => void;
    title?: string;
    closeLabel: string;
    hueAriaLabel: string;
    fieldAriaLabel: string;
}

export function CustomColorPopover({
    isOpen,
    anchorRef,
    currentColor,
    onChange,
    onRequestClose,
    title = 'Custom',
    closeLabel,
    hueAriaLabel,
    fieldAriaLabel,
}: CustomColorPopoverProps): React.ReactElement | null {
    const popupRef = useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = useState<PopoverPosition | null>(null);
    const customHex = normalizeHex(currentColor || DEFAULT_CUSTOM_COLOR) || DEFAULT_CUSTOM_COLOR;
    const customHsl = hexToHsl(customHex);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        function updatePosition(): void {
            if (!anchorRef.current) {
                return;
            }

            const rect = anchorRef.current.getBoundingClientRect();
            const popupHeight = popupRef.current?.offsetHeight ?? DEFAULT_PICKER_HEIGHT;
            setPosition(getPopoverPosition(rect, popupHeight));
        }

        function handlePointerDown(event: PointerEvent): void {
            const target = event.target as Node;
            if (!anchorRef.current?.contains(target) && !popupRef.current?.contains(target)) {
                onRequestClose();
            }
        }

        updatePosition();
        document.addEventListener('pointerdown', handlePointerDown, true);
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchorRef, isOpen, onRequestClose]);

    if (!isOpen || !position) {
        return null;
    }

    return createPortal(
        <div
            ref={popupRef}
            className="fixed z-[100] overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3 shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
            style={{
                top: position.top,
                left: position.left,
                width: PICKER_WIDTH,
                maxHeight: position.maxHeight,
            }}
        >
            <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-[var(--brand-secondary)]">{title}</div>
                <button
                    type="button"
                    aria-label={closeLabel}
                    onClick={onRequestClose}
                    className="rounded-md p-1 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <ColorField
                ariaLabel={fieldAriaLabel}
                hue={customHsl.h}
                saturation={customHsl.s}
                lightness={customHsl.l}
                onChange={(saturation, lightness) => onChange(hslToHex(customHsl.h, saturation, lightness))}
            />

            <div className="mt-3 space-y-2.5">
                <CompactSlider
                    ariaLabel={hueAriaLabel}
                    value={customHsl.h}
                    min={0}
                    max={360}
                    gradient="linear-gradient(90deg, #ef4444 0%, #f59e0b 17%, #eab308 33%, #22c55e 50%, #06b6d4 67%, #3b82f6 83%, #a855f7 100%)"
                    onChange={(hue) => onChange(hslToHex(hue, customHsl.s, customHsl.l))}
                />

                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs text-[var(--brand-secondary)]">
                    <span>HEX</span>
                    <input
                        value={customHex.slice(1).toUpperCase()}
                        onChange={(event) => {
                            const normalized = normalizeHex(event.target.value);
                            if (normalized) {
                                onChange(normalized);
                            }
                        }}
                        className={`${INSPECTOR_INPUT_CLASSNAME} h-8 px-2 text-xs uppercase`}
                    />
                    <span>{Math.round((customHsl.l / 100) * 100)}%</span>
                </div>
            </div>
        </div>,
        document.body
    );
}

function getPopoverPosition(triggerRect: DOMRect, popupHeight: number): PopoverPosition {
    const availableBelow = window.innerHeight - triggerRect.bottom - PICKER_MARGIN - VIEWPORT_PADDING;
    const availableAbove = triggerRect.top - PICKER_MARGIN - VIEWPORT_PADDING;
    const shouldOpenAbove = availableBelow < popupHeight && availableAbove > availableBelow;
    const maxHeight = Math.max(180, shouldOpenAbove ? availableAbove : availableBelow);
    const preferredTop = shouldOpenAbove
        ? triggerRect.top - popupHeight - PICKER_MARGIN
        : triggerRect.bottom + PICKER_MARGIN;
    const top = clamp(
        preferredTop,
        VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, window.innerHeight - VIEWPORT_PADDING - Math.min(popupHeight, maxHeight))
    );
    const left = clamp(
        triggerRect.right - PICKER_WIDTH,
        VIEWPORT_PADDING,
        Math.max(VIEWPORT_PADDING, window.innerWidth - PICKER_WIDTH - VIEWPORT_PADDING)
    );

    return { top, left, maxHeight };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

interface CompactSliderProps {
    ariaLabel: string;
    value: number;
    min: number;
    max: number;
    gradient: string;
    onChange: (value: number) => void;
}

function CompactSlider({ ariaLabel, value, min, max, gradient, onChange }: CompactSliderProps): React.ReactElement {
    return (
        <div>
            <input
                aria-label={ariaLabel}
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full"
                style={{ background: gradient }}
            />
        </div>
    );
}

interface ColorFieldProps {
    ariaLabel: string;
    hue: number;
    saturation: number;
    lightness: number;
    onChange: (saturation: number, lightness: number) => void;
}

function ColorField({ ariaLabel, hue, saturation, lightness, onChange }: ColorFieldProps): React.ReactElement {
    const fieldRef = useRef<HTMLDivElement | null>(null);

    function updateFromPointer(clientX: number, clientY: number): void {
        if (!fieldRef.current) {
            return;
        }

        const rect = fieldRef.current.getBoundingClientRect();
        const x = clamp(clientX - rect.left, 0, rect.width);
        const y = clamp(clientY - rect.top, 0, rect.height);
        const nextSaturation = Math.round((x / rect.width) * 100);
        const nextLightness = Math.round(100 - (y / rect.height) * 100);
        onChange(nextSaturation, nextLightness);
    }

    function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
        event.preventDefault();
        updateFromPointer(event.clientX, event.clientY);

        function handlePointerMove(moveEvent: PointerEvent): void {
            updateFromPointer(moveEvent.clientX, moveEvent.clientY);
        }

        function handlePointerUp(): void {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        }

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }

    return (
        <div
            ref={fieldRef}
            aria-label={ariaLabel}
            onPointerDown={handlePointerDown}
            className="relative h-44 cursor-crosshair overflow-hidden rounded-[var(--brand-radius)] border border-[var(--color-brand-border)]"
            style={{ backgroundColor: hslToHex(hue, 100, 50) }}
        >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff,transparent)]" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,black,transparent)]" />
            <div
                className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.3)]"
                style={{
                    left: `${saturation}%`,
                    top: `${100 - lightness}%`,
                }}
            />
        </div>
    );
}
