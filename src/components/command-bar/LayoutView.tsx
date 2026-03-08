import { useState, type ReactElement, type ReactNode } from 'react';
import { Zap, GitGraph, Check, MoveHorizontal, Waypoints, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { ViewHeader } from './ViewHeader';
import type { LayoutAlgorithm } from '../../services/elkLayout';
import { trackEvent } from '../../lib/analytics';
import { useBrandButtonStyle } from '@/store/brandHooks';

interface LayoutViewProps {
    onLayout?: (direction?: 'TB' | 'LR' | 'RL' | 'BT', algorithm?: LayoutAlgorithm, spacing?: 'compact' | 'normal' | 'loose') => void;
    onClose: () => void;
    handleBack: () => void;
}

type LayoutPreset = 'hierarchical' | 'compact' | 'spacious' | 'tree';

const LAYOUT_PRESETS: Array<{
    id: LayoutPreset;
    labelKey: string;
    defaultLabel: string;
    descKey: string;
    defaultDesc: string;
    icon: ReactNode;
    algorithm: LayoutAlgorithm;
    direction: 'TB' | 'LR' | 'RL' | 'BT';
    spacing: 'compact' | 'normal' | 'loose';
}> = [
    {
        id: 'tree',
        labelKey: 'commandBar.layout.treeOptimized',
        defaultLabel: 'Tree',
        descKey: 'commandBar.layout.treeOptimizedDesc',
        defaultDesc: 'Strict parent-child layout for org charts and dependency trees.',
        icon: <Workflow className="w-4 h-4" />,
        algorithm: 'mrtree',
        direction: 'TB',
        spacing: 'normal',
    },
    {
        id: 'hierarchical',
        labelKey: 'commandBar.layout.hierarchical',
        defaultLabel: 'Hierarchical',
        descKey: 'commandBar.layout.hierarchicalDesc',
        defaultDesc: 'Best default for most flows. Balanced readability and edge crossings.',
        icon: <GitGraph className="w-4 h-4" />,
        algorithm: 'layered',
        direction: 'TB',
        spacing: 'normal',
    },
    {
        id: 'compact',
        labelKey: 'commandBar.layout.orthogonalCompact',
        defaultLabel: 'Compact',
        descKey: 'commandBar.layout.orthogonalCompactDesc',
        defaultDesc: 'Dense left-to-right structure for medium and high-density diagrams.',
        icon: <Waypoints className="w-4 h-4" />,
        algorithm: 'layered',
        direction: 'LR',
        spacing: 'compact',
    },
    {
        id: 'spacious',
        labelKey: 'commandBar.layout.orthogonalSpacious',
        defaultLabel: 'Spacious',
        descKey: 'commandBar.layout.orthogonalSpaciousDesc',
        defaultDesc: 'Extra whitespace for clarity in presentations and reviews.',
        icon: <MoveHorizontal className="w-4 h-4" />,
        algorithm: 'layered',
        direction: 'LR',
        spacing: 'loose',
    },
];

interface AlgorithmCardProps {
    label: string;
    desc: string;
    icon: ReactNode;
    selected: boolean;
    onClick: () => void;
}

function AlgorithmCard({ label, desc, icon, selected, onClick }: AlgorithmCardProps): ReactElement {
    const isBeveled = useBrandButtonStyle() === 'beveled';

    return (
        <div
            onClick={onClick}
            className={`
                relative p-4 rounded-[var(--radius-md)] cursor-pointer transition-all duration-200 active:scale-[0.98] border
                ${selected
                    ? `border-[var(--brand-primary)] bg-[var(--brand-surface)] ${isBeveled ? 'btn-beveled shadow-sm' : 'ring-1 ring-[var(--brand-primary)]/20'}`
                    : `border-[var(--color-brand-border)] bg-[var(--brand-surface)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-background)] ${isBeveled ? 'btn-beveled' : ''}`}
            `}
        >
            <div className={`
                w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center mb-2.5 transition-colors
                ${selected ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-[var(--brand-background)] text-[var(--brand-secondary)] border border-[var(--color-brand-border)]'}
            `}>
                {icon}
            </div>
            <div className="font-medium text-sm text-[var(--brand-text)]">{label}</div>
            <div className="text-[10px] text-[var(--brand-secondary)] leading-snug mt-1">{desc}</div>
            {selected && (
                <div className="absolute top-3 right-3 text-[var(--brand-primary)]">
                    <Check className="w-4 h-4" />
                </div>
            )}
        </div>
    );
}

export function LayoutView({
    onLayout,
    onClose,
    handleBack
}: LayoutViewProps): ReactElement {
    const { t } = useTranslation();
    const [preset, setPreset] = useState<LayoutPreset>('tree');

    const handleApply = () => {
        const selectedPreset = LAYOUT_PRESETS.find((item) => item.id === preset) ?? LAYOUT_PRESETS[0];
        trackEvent('apply_layout', {
            preset: selectedPreset.id,
            algorithm: selectedPreset.algorithm,
            direction: selectedPreset.direction,
            spacing: selectedPreset.spacing,
        });
        onLayout?.(selectedPreset.direction, selectedPreset.algorithm, selectedPreset.spacing);
        onClose();
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title={t('commandBar.layout.title')} icon={<Zap className="w-4 h-4 text-[var(--brand-primary)]" />} onBack={handleBack} />

            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3">
                    <label className="text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">
                        {t('commandBar.layout.layoutStyle', 'Layout Style')}
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                        {LAYOUT_PRESETS.map((item) => (
                            <AlgorithmCard
                                key={item.id}
                                label={t(item.labelKey, item.defaultLabel)}
                                desc={t(item.descKey, item.defaultDesc)}
                                icon={item.icon}
                                selected={preset === item.id}
                                onClick={() => setPreset(item.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--color-brand-border)] bg-[var(--brand-background)]">
                <Button
                    onClick={handleApply}
                    variant="primary"
                    className="w-full py-2.5 h-auto rounded-[var(--radius-md)] justify-center"
                >
                    <Zap className="w-4 h-4 mr-2" />
                    {t('commandBar.layout.applyLayout')}
                </Button>
            </div>
        </div>
    );
}
