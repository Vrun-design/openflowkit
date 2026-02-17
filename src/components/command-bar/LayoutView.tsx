import React, { useState } from 'react';
import { Zap, GitGraph, Network, Move, Maximize2, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { ViewHeader } from './ViewHeader';
import { LayoutAlgorithm } from '../../services/elkLayout';
import { useFlowStore } from '../../store';
import { trackEvent } from '../../lib/analytics';

interface LayoutViewProps {
    onLayout?: (direction?: 'TB' | 'LR' | 'RL' | 'BT', algorithm?: LayoutAlgorithm, spacing?: 'compact' | 'normal' | 'loose') => void;
    onClose: () => void;
    handleBack: () => void;
}

const AlgorithmCard = ({ id, label, desc, icon, selected, onClick }: any) => {
    const isBeveled = useFlowStore(state => state.brandConfig.ui.buttonStyle === 'beveled');

    return (
        <div
            onClick={onClick}
            className={`
                relative p-3 rounded-[var(--radius-md)] bordercursor-pointer transition-all duration-200 active:scale-[0.98]
                ${selected
                    ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)]/50 ${isBeveled ? 'btn-beveled border-2' : 'border-2 ring-1 ring-[var(--brand-primary)]/20'}`
                    : `border-slate-100 bg-white hover:border-[var(--brand-primary-200)] ${isBeveled ? 'btn-beveled hover:bg-slate-50' : 'hover:bg-slate-50 border-2'}`}
            `}
        >
            <div className={`
                w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center mb-2 transition-colors
                ${selected ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-slate-100 text-slate-500'}
            `}>
                {icon}
            </div>
            <div className="font-medium text-sm text-slate-700">{label}</div>
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{desc}</div>
            {selected && (
                <div className="absolute top-3 right-3 text-[var(--brand-primary)]">
                    <Check className="w-4 h-4" />
                </div>
            )}
        </div>
    );
};

const DirectionButton = ({ dir, label, selected, onClick }: any) => {
    const isBeveled = useFlowStore(state => state.brandConfig.ui.buttonStyle === 'beveled');
    return (
        <button
            onClick={onClick}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all active:scale-95
                ${selected
                    ? `bg-white text-[var(--brand-primary)] ${isBeveled ? 'btn-beveled' : 'shadow-sm'}`
                    : 'text-slate-500 hover:text-slate-700'}
            `}
        >
            {label}
        </button>
    );
};

const SpacingButton = ({ id, label, selected, onClick }: any) => {
    const isBeveled = useFlowStore(state => state.brandConfig.ui.buttonStyle === 'beveled');
    return (
        <button
            onClick={onClick}
            className={`py-2 px-3 rounded-[var(--radius-sm)] border text-sm font-medium transition-all active:scale-95
                ${selected
                    ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] ${isBeveled ? 'btn-beveled border-2' : ''}`
                    : `border-slate-200 bg-white text-slate-600 hover:border-slate-300 ${isBeveled ? 'btn-beveled' : ''}`}
            `}
        >
            {label}
        </button>
    );
};

export const LayoutView = ({
    onLayout,
    onClose,
    handleBack
}: LayoutViewProps) => {
    const [algorithm, setAlgorithm] = useState<LayoutAlgorithm>('layered');
    const [direction, setDirection] = useState<'TB' | 'LR' | 'RL' | 'BT'>('TB');
    const [spacing, setSpacing] = useState<'compact' | 'normal' | 'loose'>('normal');

    const handleApply = () => {
        trackEvent('apply_layout', { algorithm, direction, spacing });
        onLayout?.(direction, algorithm, spacing);
        onClose();
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Layout Studio" icon={<Zap className="w-4 h-4 text-[var(--brand-primary)]" />} onBack={handleBack} />

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Algorithms */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Algorithm</label>
                    <div className="grid grid-cols-2 gap-3">
                        <AlgorithmCard
                            id="layered"
                            label="Layered"
                            desc="Hierarchical, good for flows"
                            icon={<GitGraph className="w-4 h-4" />}
                            selected={algorithm === 'layered'}
                            onClick={() => setAlgorithm('layered')}
                        />
                        <AlgorithmCard
                            id="mrtree"
                            label="Tree"
                            desc="Strict parent-child structure"
                            icon={<Network className="w-4 h-4" />}
                            selected={algorithm === 'mrtree'}
                            onClick={() => setAlgorithm('mrtree')}
                        />
                        <AlgorithmCard
                            id="force"
                            label="Force"
                            desc="Organic, physics-based"
                            icon={<Move className="w-4 h-4" />}
                            selected={algorithm === 'force'}
                            onClick={() => setAlgorithm('force')}
                        />
                        <AlgorithmCard
                            id="radial"
                            label="Radial"
                            desc="Circular arrangement"
                            icon={<Maximize2 className="w-4 h-4" />}
                            selected={algorithm === 'radial'}
                            onClick={() => setAlgorithm('radial')}
                        />
                    </div>
                </div>

                {/* Direction (Conditional) */}
                {(algorithm === 'layered' || algorithm === 'mrtree') && (
                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Direction</label>
                        <div className="flex bg-slate-100 p-1 rounded-[var(--radius-sm)]">
                            <DirectionButton dir="TB" label="Down" selected={direction === 'TB'} onClick={() => setDirection('TB')} />
                            <DirectionButton dir="BT" label="Up" selected={direction === 'BT'} onClick={() => setDirection('BT')} />
                            <DirectionButton dir="LR" label="Right" selected={direction === 'LR'} onClick={() => setDirection('LR')} />
                            <DirectionButton dir="RL" label="Left" selected={direction === 'RL'} onClick={() => setDirection('RL')} />
                        </div>
                    </div>
                )}

                {/* Spacing */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Spacing</label>
                    <div className="grid grid-cols-3 gap-2">
                        <SpacingButton id="compact" label="Tight" selected={spacing === 'compact'} onClick={() => setSpacing('compact')} />
                        <SpacingButton id="normal" label="Normal" selected={spacing === 'normal'} onClick={() => setSpacing('normal')} />
                        <SpacingButton id="loose" label="Loose" selected={spacing === 'loose'} onClick={() => setSpacing('loose')} />
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                    onClick={handleApply}
                    variant="primary"
                    className="w-full py-2.5 h-auto rounded-[var(--radius-md)] shadow-sm shadow-[var(--brand-primary-200)] justify-center"
                >
                    <Zap className="w-4 h-4 mr-2" />
                    Apply Layout
                </Button>
            </div>
        </div>
    );
};
