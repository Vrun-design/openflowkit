import React from 'react';
import { Check, Shield } from 'lucide-react';
import { BYOK_KEYS } from '@/config/aiProviders';
import { useTranslation } from 'react-i18next';

export function PrivacySection(): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="pt-2">
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 text-[var(--brand-text)]">
                    <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span className="text-xs font-semibold uppercase tracking-wider">{t('settingsModal.ai.privacyTitle')}</span>
                </div>
                <ul className="grid grid-cols-1 gap-2">
                    {BYOK_KEYS.map((item, i) => (
                        <li key={i} className="flex gap-2 text-[11px] text-[var(--brand-secondary)] items-start">
                            <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                            <span className="leading-tight">{t(`settingsModal.ai.byok.${item}`)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
