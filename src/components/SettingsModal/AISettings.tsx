import React, { useState } from 'react';
import { useFlowStore, AIProvider } from '../../store';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import { ExternalLink, Check, Shield, Lock } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import {
    BYOK_KEYS,
    PROVIDER_MODELS,
    PROVIDERS,
    ProviderMeta,
} from '@/config/aiProviders';



// Helper for logo with fallback
function ProviderIcon({ p, isSelected }: { p: ProviderMeta; isSelected: boolean }): React.ReactElement {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return <span className="text-2xl" style={{ color: isSelected ? 'var(--brand-primary)' : undefined }}>{p.icon}</span>;
    }

    if (isSelected) {
        return (
            <div
                className="w-8 h-8 bg-[var(--brand-primary)]"
                style={{
                    maskImage: `url(${p.logoPath})`,
                    WebkitMaskImage: `url(${p.logoPath})`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                }}
            />
        );
    }

    return (
        <img
            src={p.logoPath}
            alt={p.name}
            className="w-8 h-8 object-contain"
            onError={() => setImgError(true)}
        />
    );
}

// --- Step helper for API key guide ---
function Step({ n, text }: { n: number; text: string }): React.ReactElement {
    return (
        <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[9px] font-bold flex items-center justify-center shrink-0 mt-px">
                {n}
            </span>
            <span className="text-[11px] text-slate-600 leading-tight">{text}</span>
        </div>
    );
}

export function AISettings(): React.ReactElement {
    const { aiSettings, setAISettings } = useFlowStore();
    const { t } = useTranslation();

    const currentProvider = aiSettings.provider ?? 'gemini';
    const providerMeta = PROVIDERS.find(p => p.id === currentProvider) ?? PROVIDERS[0];
    const models = PROVIDER_MODELS[currentProvider] ?? [];
    const currentModel = aiSettings.model ?? providerMeta.defaultModel;

    function selectProvider(id: AIProvider): void {
        const meta = PROVIDERS.find(p => p.id === id)!;
        setAISettings({ provider: id, model: meta.defaultModel });
    }

    return (
        <div className="space-y-8 pb-4 animate-in fade-in duration-200 w-full min-w-0">
            {/* Header Text */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-800">{t('settingsModal.flowpilotConfigurations', { defaultValue: 'AI Studio Configuration' })}</h3>
                    <a href="/docs/en/prompting-agents" target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-1">
                        Prompting Guide <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
                <p className="text-xs text-slate-500">{t('ai.settingsSubtitle')}</p>
            </div>

            {/* Provider Section - Logo Dock */}
            <div className="space-y-4">
                <Label>{t('ai.provider')}</Label>
                {/* Fixed-size containers — inner icon scales avoids layout jerk */}
                <div className="flex items-center gap-2 overflow-x-auto px-1 py-3 custom-scrollbar">
                    {PROVIDERS.map(p => {
                        const isSelected = currentProvider === p.id;

                        const buttonClass = isSelected
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/8 ring-2 ring-[var(--brand-primary)]/40 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';

                        const iconWrapperClass = isSelected
                            ? 'scale-100'
                            : 'scale-[0.7] opacity-60 group-hover:opacity-90 group-hover:scale-80';

                        const nameClass = isSelected
                            ? 'text-[var(--brand-primary)]'
                            : 'text-slate-400';

                        return (
                            <button
                                key={p.id}
                                onClick={() => selectProvider(p.id)}
                                title={p.name}
                                aria-label={`Select ${p.name} as AI provider`}
                                className={`group relative flex flex-col items-center justify-center shrink-0 w-[72px] h-[72px] rounded-2xl border transition-all duration-200 ${buttonClass}`}
                            >
                                <div className={`pointer-events-none transition-transform duration-200 ${iconWrapperClass}`}>
                                    <ProviderIcon p={p} isSelected={isSelected} />
                                </div>
                                <span className={`text-[9px] font-medium mt-0.5 leading-tight transition-colors duration-200 ${nameClass}`}>
                                    {p.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl border border-slate-200">
                    <img src={providerMeta.logoPath} alt={providerMeta.name} className="w-6 h-6 object-contain shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{providerMeta.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t(`settingsModal.ai.providers.${currentProvider}.hint`)}</p>
                    </div>
                    {providerMeta.id === 'custom' && <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-500">BYOK</span>}
                </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Config Section */}
            <div className="space-y-6">
                {/* Model Selector */}
                <div className="space-y-3">
                    <Label>{t('settingsModal.ai.model')}</Label>
                    {currentProvider === 'custom' ? (
                        <div className="space-y-2">
                            <Input
                                value={currentModel === 'custom' ? '' : currentModel}
                                onChange={e => setAISettings({ model: e.target.value })}
                                placeholder="e.g. llama3-70b-8192 or gpt-4o"
                            />
                            <p className="text-[10px] text-slate-400">{t('settingsModal.ai.customModelHint')}</p>
                        </div>
                    ) : (
                        <Select
                            value={currentModel}
                            onChange={(val) => setAISettings({ model: val })}
                            options={models.map(m => ({
                                value: m.id,
                                label: t(`settingsModal.ai.models.${currentProvider}.${m.translateKey}.label`),
                                hint: t(`settingsModal.ai.models.${currentProvider}.${m.translateKey}.hint`),
                                badge: t(`settingsModal.ai.models.${currentProvider}.${m.translateKey}.badge`, { defaultValue: '' }) || undefined,
                                group: t(`settingsModal.ai.models.${currentProvider}.${m.translateKey}.category`)
                            }))}
                            placeholder={t('settingsModal.ai.selectModel')}
                        />
                    )}
                </div>

                {/* API Key */}
                <div className="space-y-3">
                    <Label>{providerMeta.name} {t('settingsModal.ai.apiKey')}</Label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                        </div>
                        <Input
                            type="password"
                            value={aiSettings.apiKey ?? ''}
                            onChange={e => setAISettings({ apiKey: e.target.value })}
                            placeholder={providerMeta.keyPlaceholder || `sk-...`}
                            className="pl-9 font-mono text-xs"
                        />
                    </div>

                    {/* Show setup guide only when the key is empty */}
                    {!aiSettings.apiKey && providerMeta.keyLink && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                            <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('settingsModal.ai.howToGetKey')}</span>
                                <a
                                    href={providerMeta.keyLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-primary)] hover:underline"
                                >
                                    {t('settingsModal.ai.openConsole', { console: providerMeta.consoleName })} <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="px-3 py-2.5 space-y-2">
                                <Step n={1} text={`Go to ${providerMeta.consoleName}`} />
                                <Step n={2} text={t(`settingsModal.ai.providers.${currentProvider}.keySetupNote`)} />
                                <Step n={3} text={t('settingsModal.ai.pasteKeyStep')} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Custom Base URL */}
                {currentProvider === 'custom' && (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                            <div className="px-3 py-2 border-b border-slate-200">
                                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t('settingsModal.ai.customEndpointTitle')}</span>
                            </div>
                            <div className="px-3 py-2.5 space-y-1.5">
                                <p className="text-[11px] text-slate-600 leading-snug">
                                    <Trans i18nKey="settingsModal.ai.customEndpointText">
                                        Any <span className="font-semibold text-slate-800">OpenAI-compatible</span> API endpoint — local or remote. Great for:
                                    </Trans>
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-2">
                                    {['ollama', 'lmStudio', 'together'].map(id => (
                                        <div key={id} className="flex flex-col items-center px-2 py-1.5 bg-white rounded-lg border border-slate-200 text-center">
                                            <span className="text-[10px] font-semibold text-slate-700">{t(`settingsModal.ai.customEndpoints.${id}.name`)}</span>
                                            <span className="text-[9px] text-slate-400">{t(`settingsModal.ai.customEndpoints.${id}.hint`)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Label>{t('settingsModal.ai.customBaseUrl')}</Label>
                        <Input
                            value={aiSettings.customBaseUrl ?? ''}
                            onChange={e => setAISettings({ customBaseUrl: e.target.value })}
                            placeholder="https://localhost:11434/v1"
                        />
                        <p className="text-[11px] text-slate-500">
                            <Trans i18nKey="settingsModal.ai.customEndpointMustSupport">
                                Must support <code className="bg-slate-100 px-1 rounded text-[10px]">POST /chat/completions</code> (OpenAI format)
                            </Trans>
                        </p>
                    </div>
                )}
            </div>

            {/* Privacy Section - Improved Visibility */}
            <div className="pt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-slate-800">
                        <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
                        <span className="text-xs font-semibold uppercase tracking-wider">{t('settingsModal.ai.privacyTitle')}</span>
                    </div>
                    <ul className="grid grid-cols-1 gap-2">
                        {BYOK_KEYS.map((item, i) => (
                            <li key={i} className="flex gap-2 text-[11px] text-slate-600 items-start">
                                <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                <span className="leading-tight">{t(`settingsModal.ai.byok.${item}`)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
