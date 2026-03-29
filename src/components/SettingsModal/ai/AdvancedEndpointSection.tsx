import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { AIProvider } from '@/store';
import { Trans, useTranslation } from 'react-i18next';

interface AdvancedEndpointSectionProps {
    showAdvancedEndpoint: boolean;
    onToggleAdvancedEndpoint: () => void;
    customBaseUrl?: string;
    onCustomBaseUrlChange: (value: string) => void;
    onResetCustomBaseUrl: () => void;
    defaultBaseUrl: string;
    currentProvider: AIProvider;
}

export function AdvancedEndpointSection({
    showAdvancedEndpoint,
    onToggleAdvancedEndpoint,
    customBaseUrl,
    onCustomBaseUrlChange,
    onResetCustomBaseUrl,
    defaultBaseUrl,
    currentProvider,
}: AdvancedEndpointSectionProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-brand-border)]">
            <button
                type="button"
                onClick={onToggleAdvancedEndpoint}
                className="w-full px-3 py-2.5 flex items-center justify-between bg-[var(--brand-background)] hover:bg-[var(--brand-background)]/80 transition-colors"
            >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
                    {t('settingsModal.ai.advancedEndpointOverride', { defaultValue: 'Advanced Base URL Override' })}
                </span>
                {showAdvancedEndpoint ? <ChevronUp className="w-4 h-4 text-[var(--brand-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--brand-secondary)]" />}
            </button>
            {showAdvancedEndpoint && (
                <div className="px-3 py-3 space-y-2">
                    <Label>{t('settingsModal.ai.customBaseUrl')}</Label>
                    <Input
                        value={customBaseUrl ?? ''}
                        onChange={e => onCustomBaseUrlChange(e.target.value)}
                        placeholder={defaultBaseUrl || 'https://your-proxy.example.com/v1'}
                    />
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-[var(--brand-secondary)]">
                            {t('settingsModal.ai.baseUrlHint', {
                                defaultValue: 'Leave empty to use provider default endpoint. Use this for your own proxy/worker URL.',
                            })}
                        </p>
                        <button
                            type="button"
                            onClick={onResetCustomBaseUrl}
                            disabled={!customBaseUrl}
                            className="shrink-0 text-[10px] font-semibold text-[var(--brand-secondary)] hover:text-[var(--brand-text)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('settingsModal.ai.resetEndpoint', { defaultValue: 'Reset to default' })}
                        </button>
                    </div>
                    {(currentProvider === 'custom' || currentProvider === 'openrouter' || !!customBaseUrl) && (
                        <p className="text-[11px] text-[var(--brand-secondary)]">
                            <Trans i18nKey="settingsModal.ai.customEndpointMustSupport">
                                Must support <code className="rounded-[var(--radius-xs)] bg-[var(--brand-background)] px-1 text-[10px]">POST /chat/completions</code> (OpenAI format)
                            </Trans>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
