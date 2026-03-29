import React from 'react';
import { AIProvider } from '@/store';
import { ProviderMeta, PROVIDERS, PROVIDER_RISK } from '@/config/aiProviders';
import { Label } from '@/components/ui/Label';
import { useTranslation } from 'react-i18next';
import { ProviderIcon } from './ProviderIcon';

interface ProviderSectionProps {
    currentProvider: AIProvider;
    providerMeta: ProviderMeta;
    onSelectProvider: (id: AIProvider) => void;
}

function getRiskStyles(providerRisk: 'browser_friendly' | 'proxy_likely' | 'mixed'): string {
    if (providerRisk === 'browser_friendly') {
        return 'bg-green-50 border-green-200 text-green-700';
    }
    if (providerRisk === 'proxy_likely') {
        return 'bg-amber-50 border-amber-200 text-amber-700';
    }
    return 'bg-[var(--brand-background)] border-[var(--color-brand-border)] text-[var(--brand-secondary)]';
}

function getRiskLabel(t: (key: string, options?: Record<string, unknown>) => string, providerRisk: 'browser_friendly' | 'proxy_likely' | 'mixed'): string {
    if (providerRisk === 'browser_friendly') {
        return t('settingsModal.ai.risk.browserFriendly', { defaultValue: 'Browser-ready' });
    }
    if (providerRisk === 'proxy_likely') {
        return t('settingsModal.ai.risk.proxyLikely', { defaultValue: 'Proxy likely' });
    }
    return t('settingsModal.ai.risk.mixed', { defaultValue: 'Depends on endpoint' });
}

export function ProviderSection({
    currentProvider,
    providerMeta,
    onSelectProvider,
}: ProviderSectionProps): React.ReactElement {
    const { t } = useTranslation();
    const providerRisk = PROVIDER_RISK[currentProvider];

    return (
        <div className="space-y-4">
            <Label>{t('settingsModal.ai.provider')}</Label>
            <div className="flex items-center gap-2 overflow-x-auto px-1 py-3 custom-scrollbar">
                {PROVIDERS.map((provider) => {
                    const isSelected = currentProvider === provider.id;
                    const buttonClass = isSelected
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/8 ring-2 ring-[var(--brand-primary)]/40 shadow-md'
                        : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]';
                    const iconWrapperClass = isSelected
                        ? 'scale-100'
                        : 'scale-[0.7] opacity-60 group-hover:opacity-90 group-hover:scale-80';
                    const nameClass = isSelected
                        ? 'text-[var(--brand-primary)]'
                        : 'text-[var(--brand-secondary)]';

                    return (
                        <button
                            key={provider.id}
                            onClick={() => onSelectProvider(provider.id)}
                            title={provider.name}
                            aria-label={`Select ${provider.name} as AI provider`}
                            className={`group relative flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[var(--radius-xl)] border transition-all duration-200 ${buttonClass}`}
                        >
                            <div className={`pointer-events-none transition-transform duration-200 ${iconWrapperClass}`}>
                                <ProviderIcon provider={provider} isSelected={isSelected} />
                            </div>
                            <span className={`text-[9px] font-medium mt-0.5 leading-tight transition-colors duration-200 ${nameClass}`}>
                                {provider.name}
                            </span>
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2.5">
                <img src={providerMeta.logoPath} alt={providerMeta.name} className="w-6 h-6 object-contain shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--brand-text)]">{providerMeta.name}</p>
                    <p className="text-[10px] text-[var(--brand-secondary)] truncate">
                        {t(`settingsModal.ai.providers.${currentProvider}.hint`, {
                            defaultValue: providerMeta.id === 'custom'
                                ? 'Any OpenAI-compatible endpoint'
                                : `${providerMeta.name} provider`,
                        })}
                    </p>
                </div>
                <span
                    className={`rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[9px] font-medium ${getRiskStyles(providerRisk)}`}
                >
                    {getRiskLabel(t, providerRisk)}
                </span>
                {providerMeta.id === 'custom' && <span className="rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--brand-secondary)]">BYOK</span>}
            </div>
        </div>
    );
}
