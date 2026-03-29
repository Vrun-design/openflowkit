import type { ReactElement } from 'react';
import { Activity, Grid, Network, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '../../store';
import { IS_BEVELED } from '@/lib/brand';
import { useViewSettings, useVisualSettingsActions } from '@/store/viewHooks';
import { ViewHeader } from './ViewHeader';
import type { GlobalEdgeOptions } from '@/lib/types';

interface VisualsViewProps {
    onBack: () => void;
}

interface SafetyModeOption {
    mode: 'auto' | 'on' | 'off';
    label: string;
}

interface ExportModeOption {
    mode: 'deterministic' | 'legacy';
    label: string;
}

export function VisualsView({ onBack }: VisualsViewProps): ReactElement {
    const { t } = useTranslation();
    const globalEdgeOptions = useFlowStore((state) => state.globalEdgeOptions);
    const viewSettings = useViewSettings();
    const {
        setGlobalEdgeOptions,
        setViewSettings,
        setDefaultIconsEnabled,
        setSmartRoutingEnabled,
        setLargeGraphSafetyMode,
    } = useVisualSettingsActions();
    const isBeveled = IS_BEVELED;
    const edgeStyleOptions: Array<{
        type: GlobalEdgeOptions['type'];
        label: string;
        desc: string;
    }> = [
        { type: 'default', label: t('commandBar.visuals.bezier'), desc: t('commandBar.visuals.bezierDesc') },
        { type: 'straight', label: t('commandBar.visuals.straight'), desc: t('commandBar.visuals.straightDesc') },
        { type: 'smoothstep', label: t('commandBar.visuals.smoothStep'), desc: t('commandBar.visuals.smoothStepDesc') },
        { type: 'step', label: t('commandBar.visuals.step'), desc: t('commandBar.visuals.stepDesc') },
    ];
    const safetyModeOptions: SafetyModeOption[] = [
        { mode: 'auto', label: t('commandBar.visuals.largeGraphSafetyAuto', 'Auto') },
        { mode: 'on', label: t('commandBar.visuals.largeGraphSafetyOn', 'On') },
        { mode: 'off', label: t('commandBar.visuals.largeGraphSafetyOff', 'Off') },
    ];
    const exportModeOptions: ExportModeOption[] = [
        { mode: 'deterministic', label: t('commandBar.visuals.exportModeDeterministic', 'Deterministic') },
        { mode: 'legacy', label: t('commandBar.visuals.exportModeLegacy', 'Legacy') },
    ];

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title={t('commandBar.visuals.title')} icon={<Activity className="w-4 h-4 text-[var(--brand-primary)]" />} onBack={onBack} />

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                {/* Edge Style */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">{t('commandBar.visuals.edgeStyle')}</label>
                    <div className="grid grid-cols-2 gap-3">
                        {edgeStyleOptions.map((style) => (
                            <div
                                key={style.type}
                                onClick={() => setGlobalEdgeOptions({ type: style.type })}
                                className={`p-3 rounded-[var(--radius-md)] border cursor-pointer transition-all duration-200 active:scale-[0.98]
                                    ${(globalEdgeOptions.type === style.type || (style.type === 'default' && globalEdgeOptions.type === 'bezier'))
                                        ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)]/50 ${isBeveled ? 'btn-beveled border-2' : 'border-2 ring-1 ring-[var(--brand-primary)]/10'}`
                                        : `border-[var(--color-brand-border)] bg-[var(--brand-surface)] hover:border-[var(--brand-primary-200)] ${isBeveled ? 'btn-beveled hover:bg-[var(--brand-background)]' : 'hover:bg-[var(--brand-background)] border-2'}`
                                    }`}
                            >
                                <div className="font-medium text-sm text-[var(--brand-text)]">{style.label}</div>
                                <div className="text-[10px] text-[var(--brand-secondary)]">{style.desc}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Default Icons */}
                <div className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all ${isBeveled ? 'btn-beveled' : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)]'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--brand-background)] rounded-[var(--radius-sm)] shadow-inner"><Grid className="w-4 h-4 text-[var(--brand-secondary)]" /></div>
                        <div>
                            <div className="font-medium text-sm text-[var(--brand-text)]">{t('commandBar.visuals.defaultIcons')}</div>
                            <div className="text-[10px] text-[var(--brand-secondary)]">{t('commandBar.visuals.defaultIconsDesc')}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setDefaultIconsEnabled(!viewSettings.defaultIconsEnabled)}
                        className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 active:scale-90 ${viewSettings.defaultIconsEnabled ? 'bg-[var(--brand-primary)] shadow-inner' : 'bg-[var(--color-brand-border)] shadow-inner'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-[var(--brand-surface)] shadow-sm transition-transform ${isBeveled ? 'border border-black/5 shadow-md' : ''} ${viewSettings.defaultIconsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Intelligent Routing */}
                <div className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all ${isBeveled ? 'btn-beveled' : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)]'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--brand-background)] rounded-[var(--radius-sm)] shadow-inner"><Network className="w-4 h-4 text-emerald-500" /></div>
                        <div>
                            <div className="font-medium text-sm text-[var(--brand-text)]">{t('commandBar.visuals.intelligentRouting')}</div>
                            <div className="text-[10px] text-[var(--brand-secondary)]">{t('commandBar.visuals.intelligentRoutingDesc')}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setSmartRoutingEnabled(!viewSettings.smartRoutingEnabled)}
                        className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 active:scale-90 ${viewSettings.smartRoutingEnabled ? 'bg-[var(--brand-primary)] shadow-inner' : 'bg-[var(--color-brand-border)] shadow-inner'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-[var(--brand-surface)] shadow-sm transition-transform ${isBeveled ? 'border border-black/5 shadow-md' : ''} ${viewSettings.smartRoutingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                {/* Animation */}
                <div className={`flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all ${isBeveled ? 'btn-beveled' : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)]'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--brand-background)] rounded-[var(--radius-sm)] shadow-inner"><Zap className="w-4 h-4 text-amber-500" /></div>
                        <div>
                            <div className="font-medium text-sm text-[var(--brand-text)]">{t('commandBar.visuals.animatedEdges')}</div>
                            <div className="text-[10px] text-[var(--brand-secondary)]">{t('commandBar.visuals.animatedEdgesDesc')}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setGlobalEdgeOptions({ animated: !globalEdgeOptions.animated })}
                        className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 active:scale-90 ${globalEdgeOptions.animated ? 'bg-[var(--brand-primary)] shadow-inner' : 'bg-[var(--color-brand-border)] shadow-inner'}`}
                    >
                        <div className={`w-5 h-5 rounded-full bg-[var(--brand-surface)] shadow-sm transition-transform ${isBeveled ? 'border border-black/5 shadow-md' : ''} ${globalEdgeOptions.animated ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">
                        {t('commandBar.visuals.largeGraphSafety', 'Large Graph Safety')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {safetyModeOptions.map((option) => (
                            <button
                                key={option.mode}
                                onClick={() => setLargeGraphSafetyMode(option.mode)}
                                className={`h-9 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all active:scale-95
                                    ${viewSettings.largeGraphSafetyMode === option.mode
                                        ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] ${isBeveled ? 'btn-beveled' : ''}`
                                        : `border-[var(--color-brand-border)] text-[var(--brand-secondary)] hover:border-[var(--brand-primary-200)] ${isBeveled ? 'btn-beveled hover:bg-[var(--brand-background)]' : ''}`
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">
                        {t('commandBar.visuals.exportMode', 'Export Mode')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {exportModeOptions.map((option) => (
                            <button
                                key={option.mode}
                                onClick={() => {
                                    setViewSettings({
                                        exportSerializationMode: option.mode,
                                    });
                                }}
                                className={`h-9 rounded-[var(--radius-sm)] border text-xs font-semibold transition-all active:scale-95
                                    ${viewSettings.exportSerializationMode === option.mode
                                        ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] ${isBeveled ? 'btn-beveled' : ''}`
                                        : `border-[var(--color-brand-border)] text-[var(--brand-secondary)] hover:border-[var(--brand-primary-200)] ${isBeveled ? 'btn-beveled hover:bg-[var(--brand-background)]' : ''}`
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stroke Width */}
                <div className="space-y-3">
                    <label className="text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">{t('commandBar.visuals.strokeWidth')}</label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(w => (
                            <button
                                key={w}
                                onClick={() => setGlobalEdgeOptions({ strokeWidth: w })}
                                className={`flex-1 h-10 rounded-[var(--radius-sm)] border font-medium text-sm transition-all active:scale-95
                                    ${globalEdgeOptions.strokeWidth === w
                                        ? `border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-700)] shadow-inner ${isBeveled ? 'btn-beveled' : ''}`
                                        : `border-[var(--color-brand-border)] text-[var(--brand-secondary)] hover:border-[var(--brand-primary-200)] ${isBeveled ? 'btn-beveled hover:bg-[var(--brand-background)]' : ''}`}
                                `}
                            >
                                {w}px
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
