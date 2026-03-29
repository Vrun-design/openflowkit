import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { CustomHeaderConfig } from '@/store';
import { useTranslation } from 'react-i18next';

interface CustomHeadersEditorProps {
    customHeaders: CustomHeaderConfig[];
    onAddHeader: () => void;
    onUpdateHeader: (index: number, patch: { key?: string; value?: string; enabled?: boolean }) => void;
    onRemoveHeader: (index: number) => void;
    onApplyCloudflarePreset: () => void;
}

export function CustomHeadersEditor({
    customHeaders,
    onAddHeader,
    onUpdateHeader,
    onRemoveHeader,
    onApplyCloudflarePreset,
}: CustomHeadersEditorProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
                        {t('settingsModal.ai.customHeadersTitle', { defaultValue: 'Custom Headers' })}
                    </p>
                    <p className="text-[10px] text-[var(--brand-secondary)]">
                        {t('settingsModal.ai.customHeadersSubtitle', { defaultValue: 'Send extra headers for auth proxies like Cloudflare Access.' })}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onAddHeader}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--brand-background)] px-2 py-1 text-[10px] font-semibold text-[var(--brand-text)] hover:bg-[var(--brand-background)]/80"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t('settingsModal.ai.addHeader', { defaultValue: 'Add Header' })}
                    </button>
                    <button
                        type="button"
                        onClick={onApplyCloudflarePreset}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                        {t('settingsModal.ai.cloudflarePreset', { defaultValue: 'Use Cloudflare Preset' })}
                    </button>
                </div>
            </div>
            {customHeaders.length === 0 && (
                <p className="text-[10px] text-[var(--brand-secondary)]">
                    {t('settingsModal.ai.customHeadersEmpty', { defaultValue: 'No custom headers configured.' })}
                </p>
            )}
            {customHeaders.map((header, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-1 flex items-center justify-center">
                        <input
                            type="checkbox"
                            checked={header.enabled !== false}
                            onChange={e => onUpdateHeader(idx, { enabled: e.target.checked })}
                            aria-label="Enable header"
                        />
                    </div>
                    <div className="col-span-4">
                        <Input
                            value={header.key}
                            onChange={e => onUpdateHeader(idx, { key: e.target.value })}
                            placeholder="CF-Access-Client-Id"
                        />
                    </div>
                    <div className="col-span-6">
                        <Input
                            type="password"
                            value={header.value}
                            onChange={e => onUpdateHeader(idx, { value: e.target.value })}
                            placeholder="Header value"
                            className="font-mono text-xs"
                        />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                        <button
                            type="button"
                            onClick={() => onRemoveHeader(idx)}
                            className="text-[var(--brand-secondary)] hover:text-red-600"
                            aria-label="Remove header"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
            <p className="text-[10px] text-[var(--brand-secondary)]">
                {t('settingsModal.ai.customHeadersSecurity', { defaultValue: 'Header values are stored locally in your browser profile.' })}
            </p>
        </div>
    );
}
