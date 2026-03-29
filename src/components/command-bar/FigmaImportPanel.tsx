import { useState, type ReactElement } from 'react';
import { Figma, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { parseFigmaFileKey, fetchFigmaStyles, type FigmaImportResult } from '@/services/figmaImport/figmaApiClient';
import { EDITOR_FIELD_DEFAULT_CLASS } from '../ui/editorFieldStyles';

interface FigmaImportPanelProps {
    onImport: (result: FigmaImportResult) => void;
    onClose: () => void;
}

type ImportState = 'idle' | 'loading' | 'success' | 'error';

export function FigmaImportPanel({ onImport, onClose }: FigmaImportPanelProps): ReactElement {
    const { t } = useTranslation();
    const [url, setUrl] = useState('');
    const [token, setToken] = useState('');
    const [state, setState] = useState<ImportState>('idle');
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<FigmaImportResult | null>(null);

    const handleFetch = async () => {
        const fileKey = parseFigmaFileKey(url);
        if (!fileKey) {
            setError(t('commandBar.figmaImport.invalidUrl', 'Invalid Figma URL. Use a figma.com/file/... or figma.com/design/... link.'));
            setState('error');
            return;
        }
        if (!token.trim()) {
            setError(t('commandBar.figmaImport.tokenRequired', 'Personal access token is required.'));
            setState('error');
            return;
        }
        setState('loading');
        setError('');
        try {
            const result = await fetchFigmaStyles(fileKey, token.trim());
            setPreview(result);
            setState('success');
        } catch (err) {
            setError(err instanceof Error ? err.message : t('commandBar.figmaImport.unknownError', 'Unknown error'));
            setState('error');
        }
    };

    const handleApply = () => {
        if (preview) onImport(preview);
    };

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Figma className="w-4 h-4 text-[#F24E1E]" />
                    <span className="text-sm font-semibold text-[var(--brand-text)]">{t('commandBar.figmaImport.title', 'Import from Figma')}</span>
                </div>
                <button
                    onClick={onClose}
                    aria-label={t('common.close', 'Close')}
                    className="text-[var(--brand-secondary)] transition-colors hover:text-[var(--brand-text)]"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--brand-secondary)]">{t('commandBar.figmaImport.fileUrlLabel', 'Figma file URL')}</label>
                <input
                    type="text"
                    placeholder={t('commandBar.figmaImport.fileUrlPlaceholder', 'https://www.figma.com/design/...')}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className={`${EDITOR_FIELD_DEFAULT_CLASS} rounded-lg px-3 py-2 text-sm`}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--brand-secondary)]">
                    {t('commandBar.figmaImport.tokenLabel', 'Personal access token')}{' '}
                    <a
                        href="https://www.figma.com/developers/api#access-tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-500 hover:underline"
                    >
                        ({t('commandBar.figmaImport.tokenHelpLink', 'how to get one')})
                    </a>
                </label>
                <input
                    type="password"
                    placeholder={t('commandBar.figmaImport.tokenPlaceholder', 'figd_...')}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={`${EDITOR_FIELD_DEFAULT_CLASS} rounded-lg px-3 py-2 text-sm`}
                />
                <p className="text-xs text-[var(--brand-secondary)]">{t('commandBar.figmaImport.tokenPrivacy', 'Token is used only in your browser and is never sent to our servers.')}</p>
            </div>

            {state === 'error' && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-700">{error}</p>
                </div>
            )}

            {state === 'success' && preview && (
                <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                        <Check className="w-3.5 h-3.5" />
                        {t('commandBar.figmaImport.foundSummary', {
                            colors: preview.colors.length,
                            fonts: preview.fonts.length,
                            name: preview.name,
                            defaultValue: 'Found {{colors}} colors and {{fonts}} text styles from "{{name}}"',
                        })}
                    </div>

                    {preview.colors.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-[var(--brand-secondary)]">{t('commandBar.figmaImport.colors', 'Colors')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {preview.colors.slice(0, 12).map((c) => (
                                    <div
                                        key={c.name}
                                        className="flex items-center gap-1.5 rounded-md border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2 py-1"
                                        title={c.name}
                                    >
                                        <div
                                            className="h-3 w-3 shrink-0 rounded-full border border-[var(--color-brand-border)]"
                                            style={{ background: c.hex }}
                                        />
                                        <span className="font-mono text-xs text-[var(--brand-text)]">{c.hex}</span>
                                    </div>
                                ))}
                                {preview.colors.length > 12 && (
                                    <span className="self-center text-xs text-[var(--brand-secondary)]">{t('commandBar.figmaImport.moreCount', {
                                        count: preview.colors.length - 12,
                                        defaultValue: '+{{count}} more',
                                    })}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {preview.fonts.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-[var(--brand-secondary)]">{t('commandBar.figmaImport.fonts', 'Fonts')}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {[...new Set(preview.fonts.map((f) => f.fontFamily))].slice(0, 4).map((family) => (
                                    <span
                                        key={family}
                                        className="rounded-md border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2 py-1 text-xs text-[var(--brand-text)]"
                                    >
                                        {family}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-2">
                {state !== 'success' ? (
                    <Button
                        onClick={handleFetch}
                        disabled={state === 'loading' || !url.trim() || !token.trim()}
                        className="flex-1 text-sm"
                    >
                        {state === 'loading' ? (
                            <span className="flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {t('commandBar.figmaImport.fetchingStyles', 'Fetching styles...')}
                            </span>
                        ) : (
                            t('commandBar.figmaImport.fetchStyles', 'Fetch styles')
                        )}
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => { setState('idle'); setPreview(null); }}
                            className="text-sm"
                        >
                            {t('common.back', 'Back')}
                        </Button>
                        <Button onClick={handleApply} className="flex-1 text-sm">
                            {t('commandBar.figmaImport.applyToDesignSystem', 'Apply to design system')}
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
