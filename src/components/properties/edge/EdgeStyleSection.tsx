import React, { useState } from 'react';
import { MarkerType } from '@/lib/reactflowCompat';
import { ArrowRightLeft, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import type { FlowEdge } from '@/lib/types';
import { SegmentedChoice } from '../SegmentedChoice';
import { PropertySliderRow } from '../PropertySliderRow';
import {
    applyArchitectureDirection,
    getDirectionFromMarkers,
    reverseArchitectureDirection,
} from './architectureSemantics';

const LINE_STYLE_OPTIONS = [
    { id: 'default', label: 'Bezier' },
    { id: 'smoothstep', label: 'Smoothstep' },
    { id: 'step', label: 'Step' },
];

interface EdgeStyleSectionProps {
    selectedEdge: FlowEdge;
    onChange: (id: string, updates: Partial<FlowEdge>) => void;
}

export function EdgeStyleSection({ selectedEdge, onChange }: EdgeStyleSectionProps): React.ReactElement {
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const selectedStroke = selectedEdge.style?.stroke || '#94a3b8';

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]/70 px-3 py-2">
                <span className="text-sm font-medium text-[var(--brand-text)]">Animated</span>
                <Switch
                    checked={selectedEdge.animated || false}
                    onCheckedChange={(checked) => onChange(selectedEdge.id, { animated: checked })}
                />
            </div>

            <SegmentedChoice
                items={LINE_STYLE_OPTIONS}
                selectedId={selectedEdge.type || 'default'}
                onSelect={(edgeType) => onChange(selectedEdge.id, { type: edgeType })}
                columns={3}
            />

            <button
                type="button"
                onClick={() => setAdvancedOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-left text-sm font-medium text-[var(--brand-text)] transition-colors hover:bg-[var(--brand-background)]"
            >
                <span>Advanced</span>
                <ChevronDown className={`h-4 w-4 text-[var(--brand-secondary)] transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </button>

            {advancedOpen && (
                <div className="space-y-3 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]/70 p-3">
                    <PropertySliderRow
                        label="Stroke Width"
                        valueLabel={`${selectedEdge.style?.strokeWidth || 2}px`}
                        value={Number(selectedEdge.style?.strokeWidth) || 2}
                        min={1}
                        max={6}
                        step={1}
                        onChange={(strokeWidth) => {
                            onChange(selectedEdge.id, {
                                style: { ...selectedEdge.style, strokeWidth },
                            });
                        }}
                        labelClassName="text-[10px] font-bold uppercase text-[var(--brand-secondary)]"
                        sliderClassName="h-1 rounded-lg bg-[var(--color-brand-border)] accent-[var(--brand-primary)]"
                        containerClassName="space-y-1"
                    />

                    <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-[var(--brand-secondary)]">Line Pattern</span>
                        <SegmentedChoice
                            items={(['solid', 'dashed', 'dotted', 'dashdot'] as const).map((pattern) => ({
                                id: pattern,
                                label: (
                                    <svg width="32" height="4" viewBox="0 0 32 4">
                                        <line
                                            x1="0"
                                            y1="2"
                                            x2="32"
                                            y2="2"
                                            stroke={(selectedEdge.data?.dashPattern || 'solid') === pattern ? 'var(--brand-primary)' : '#94a3b8'}
                                            strokeWidth="2"
                                            strokeDasharray={{
                                                solid: '',
                                                dashed: '8 4',
                                                dotted: '2 4',
                                                dashdot: '8 4 2 4',
                                            }[pattern]}
                                        />
                                    </svg>
                                ),
                            }))}
                            selectedId={selectedEdge.data?.dashPattern || 'solid'}
                            onSelect={(pattern) => {
                                const dashArrayMap: Record<string, string> = {
                                    solid: '',
                                    dashed: '8 4',
                                    dotted: '2 4',
                                    dashdot: '8 4 2 4',
                                };

                                onChange(selectedEdge.id, {
                                    data: { ...selectedEdge.data, dashPattern: pattern as FlowEdge['data']['dashPattern'] },
                                    style: { ...selectedEdge.style, strokeDasharray: dashArrayMap[pattern] },
                                });
                            }}
                            columns={4}
                            size="sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            onClick={() => {
                                const isBidirectional = Boolean(selectedEdge.markerStart);
                                const nextDirection = isBidirectional ? '-->' : '<-->';
                                const architectureUpdates = applyArchitectureDirection(selectedEdge, nextDirection);
                                onChange(selectedEdge.id, {
                                    markerStart: isBidirectional
                                        ? undefined
                                        : { type: MarkerType.ArrowClosed, color: selectedStroke },
                                    ...architectureUpdates,
                                });
                            }}
                            variant={selectedEdge.markerStart ? 'primary' : 'secondary'}
                            className="w-full"
                        >
                            Bidirectional
                        </Button>

                        <Button
                            onClick={() => {
                                const currentDirection = selectedEdge.data?.archDirection || getDirectionFromMarkers(selectedEdge);
                                const reversedDirection = reverseArchitectureDirection(currentDirection);
                                const edgeWithSwappedArchitecture = selectedEdge.data?.archDirection
                                    ? {
                                        ...selectedEdge,
                                        data: {
                                            ...selectedEdge.data,
                                            archDirection: reversedDirection,
                                            archSourceSide: selectedEdge.data?.archTargetSide,
                                            archTargetSide: selectedEdge.data?.archSourceSide,
                                        },
                                    }
                                    : selectedEdge;
                                const architectureDirectionUpdates = applyArchitectureDirection(edgeWithSwappedArchitecture, reversedDirection);
                                onChange(selectedEdge.id, {
                                    source: selectedEdge.target,
                                    target: selectedEdge.source,
                                    sourceHandle: selectedEdge.targetHandle,
                                    targetHandle: selectedEdge.sourceHandle,
                                    ...architectureDirectionUpdates,
                                });
                            }}
                            variant="secondary"
                            className="w-full"
                            icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                        >
                            Swap
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
