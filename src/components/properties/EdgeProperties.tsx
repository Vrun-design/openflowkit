import React from 'react';
import { Edge, MarkerType } from 'reactflow';
import { EdgeCondition } from '@/lib/types';
import { GitBranch, Ban, ArrowRightLeft, Trash2, Activity } from 'lucide-react';
import { Input } from '../ui/Input';
import { Slider } from '../ui/Slider';
import { Switch } from '../ui/Switch';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { EDGE_CONDITION_STYLES, EDGE_CONDITION_LABELS } from '../../constants';

interface EdgePropertiesProps {
    selectedEdge: Edge;
    onChange: (id: string, updates: Partial<Edge>) => void;
    onDelete: (id: string) => void;
}

const EDGE_COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export const EdgeProperties: React.FC<EdgePropertiesProps> = ({
    selectedEdge,
    onChange,
    onDelete
}) => {
    return (
        <div className="space-y-6">
            {/* Condition Selector */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" /> Condition
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(EDGE_CONDITION_STYLES) as EdgeCondition[]).map((cond) => {
                        const style = EDGE_CONDITION_STYLES[cond];
                        const label = (EDGE_CONDITION_LABELS as Record<string, string>)[cond] || 'Default';
                        const currentCond = (selectedEdge.data?.condition as EdgeCondition) || 'default';
                        const isSelected = currentCond === cond;

                        return (
                            <button
                                key={cond}
                                onClick={() => {
                                    onChange(selectedEdge.id, {
                                        data: { ...selectedEdge.data, condition: cond },
                                        style: { ...selectedEdge.style, ...style },
                                        label: cond === 'default' ? '' : label
                                    });
                                }}
                                className={`
                                    px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left flex items-center gap-2
                                    ${isSelected
                                        ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary-700)] ring-1 ring-[var(--brand-primary-200)]'
                                        : 'bg-[var(--brand-surface)] border-slate-200 text-[var(--brand-secondary)] hover:border-slate-300'
                                    }
                                `}
                            >
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.stroke }} />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-3">
                <Input
                    label="Label"
                    value={(selectedEdge.label as string) || ''}
                    onChange={(e) => onChange(selectedEdge.id, { label: e.target.value })}
                    placeholder="e.g., 'If yes', 'On success'"
                />

                {/* Label Offset Controls */}
                {(selectedEdge.label) && (
                    <div className="space-y-1 pt-2">
                        <Slider
                            label="Position"
                            valueDisplay={`${Math.round((selectedEdge.data?.labelPosition ?? 0.5) * 100)}%`}
                            min="0"
                            max="100"
                            step="1"
                            value={Math.round((selectedEdge.data?.labelPosition ?? 0.5) * 100)}
                            onChange={(e) => onChange(selectedEdge.id, { data: { ...selectedEdge.data, labelPosition: parseInt(e.target.value) / 100, labelOffsetX: 0, labelOffsetY: 0 } })}
                        />
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Line Style
                </label>

                <div className="flex flex-wrap gap-2">
                    {/* Edge Color Picker */}
                    {EDGE_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => onChange(selectedEdge.id, { style: { ...selectedEdge.style, stroke: color } })}
                            className={`w-6 h-6 rounded-full border border-white shadow-sm hover:scale-110 transition-transform ${selectedEdge.style?.stroke === color ? 'ring-2 ring-slate-400 ring-offset-2' : ''}`}
                            style={{ backgroundColor: color }}
                        />
                    ))}
                    <button
                        onClick={() => onChange(selectedEdge.id, { style: { ...selectedEdge.style, stroke: '#94a3b8' } })}
                        title="Reset Color"
                        className="w-6 h-6 rounded-full border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center text-xs hover:bg-slate-200"
                    >
                        <Ban className="w-3 h-3" />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Animated</span>
                    <Switch
                        checked={selectedEdge.animated || false}
                        onCheckedChange={(checked) => onChange(selectedEdge.id, { animated: checked })}
                    />
                </div>
                <Button
                    onClick={() => {
                        const isBidirectional = !!selectedEdge.markerStart;
                        onChange(selectedEdge.id, {
                            markerStart: isBidirectional ? undefined : { type: MarkerType.ArrowClosed, color: selectedEdge.style?.stroke || '#94a3b8' }
                        });
                    }}
                    variant={!!selectedEdge.markerStart ? 'primary' : 'secondary'}
                    className="flex-1"
                >
                    Bidirectional
                </Button>

                <Button
                    onClick={() => {
                        onChange(selectedEdge.id, {
                            source: selectedEdge.target,
                            target: selectedEdge.source,
                            sourceHandle: selectedEdge.targetHandle,
                            targetHandle: selectedEdge.sourceHandle
                        });
                    }}
                    variant="secondary"
                    className="w-full"
                    icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                >
                    Swap Direction
                </Button>

                <div className="grid grid-cols-3 gap-2">
                    {['default', 'smoothstep', 'step'].map(t => (
                        <button
                            key={t}
                            onClick={() => onChange(selectedEdge.id, { type: t })}
                            className={`py-2 text-xs font-medium rounded-lg border capitalize transition-all ${selectedEdge.type === t ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary-700)]' : 'bg-[var(--brand-surface)] border-slate-200 text-[var(--brand-secondary)]'}`}
                        >
                            {t === 'default' ? 'Bezier' : t}
                        </button>
                    ))}
                </div>

                {/* Stroke Width */}
                <div className="space-y-1 pt-2">
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Stroke Width</span>
                        <span className="text-[10px] text-slate-500">{selectedEdge.style?.strokeWidth || 2}px</span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="6"
                        step="1"
                        value={Number(selectedEdge.style?.strokeWidth) || 2}
                        onChange={(e) => onChange(selectedEdge.id, { style: { ...selectedEdge.style, strokeWidth: parseInt(e.target.value) } })}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[var(--brand-primary)]"
                    />
                </div>

                {/* Dash Pattern */}
                <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Line Pattern</span>
                    <div className="grid grid-cols-4 gap-1.5">
                        {(['solid', 'dashed', 'dotted', 'dashdot'] as const).map((pattern) => {
                            const currentPattern = selectedEdge.data?.dashPattern || 'solid';
                            const dashArrayMap: Record<string, string> = { solid: '', dashed: '8 4', dotted: '2 4', dashdot: '8 4 2 4' };
                            return (
                                <button
                                    key={pattern}
                                    onClick={() => onChange(selectedEdge.id, {
                                        data: { ...selectedEdge.data, dashPattern: pattern },
                                        style: { ...selectedEdge.style, strokeDasharray: dashArrayMap[pattern] }
                                    })}
                                    className={`py-1.5 flex items-center justify-center rounded-lg border transition-all ${currentPattern === pattern ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)]' : 'bg-[var(--brand-surface)] border-slate-200'}`}
                                >
                                    <svg width="32" height="4" viewBox="0 0 32 4">
                                        <line x1="0" y1="2" x2="32" y2="2" stroke={currentPattern === pattern ? 'var(--brand-primary)' : '#94a3b8'} strokeWidth="2" strokeDasharray={dashArrayMap[pattern]} />
                                    </svg>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
                <Button
                    onClick={() => onDelete(selectedEdge.id)}
                    variant="danger"
                    className="w-full"
                    icon={<Trash2 className="w-4 h-4" />}
                >
                    Delete Connection
                </Button>
            </div>
        </div>
    );
};
