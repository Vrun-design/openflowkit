import { useState, type ReactElement } from 'react';
import { Figma, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { parseFigmaFileKey, fetchFigmaStyles, type FigmaImportResult } from '@/services/figmaImport/figmaApiClient';
import { EDITOR_FIELD_DEFAULT_CLASS } from '../ui/editorFieldStyles';

interface FigmaImportPanelProps {
    onImport: (result: FigmaImportResult) => void;
    onClose: () => void;
}

type ImportState = 'idle' | 'loading' | 'success' | 'error';

export function FigmaImportPanel({ onImport, onClose }: FigmaImportPanelProps): ReactElement {
    const [url, setUrl] = useState('');
    const [token, setToken] = useState('');
    const [state, setState] = useState<ImportState>('idle');
    const [error, setError] = useState('');
    const [preview, setPreview] = useState<FigmaImportResult | null>(null);

    const handleFetch = async () => {
        const fileKey = parseFigmaFileKey(url);
        if (!fileKey) {
            setError('Invalid Figma URL. Use a figma.com/file/… or figma.com/design/… link.');
            setState('error');
            return;
        }
        if (!token.trim()) {
            setError('Personal access token is required.');
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
            setError(err instanceof Error ? err.message : 'Unknown error');
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
                    <span className="text-sm font-semibold text-[var(--brand-text)]">Import from Figma</span>
                </div>
                <button onClick={onClose} className="text-[var(--brand-secondary)] transition-colors hover:text-[var(--brand-text)]">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--brand-secondary)]">Figma file URL</label>
                <input
                    type="text"
                    placeholder="https://www.figma.com/design/…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className={`${EDITOR_FIELD_DEFAULT_CLASS} rounded-lg px-3 py-2 text-sm`}
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--brand-secondary)]">
                    Personal access token{' '}
                    <a
                        href="https://www.figma.com/developers/api#access-tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-500 hover:underline"
                    >
                        (how to get one)
                    </a>
                </label>
                <input
                    type="password"
                    placeholder="figd_…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={`${EDITOR_FIELD_DEFAULT_CLASS} rounded-lg px-3 py-2 text-sm`}
                />
                <p className="text-xs text-[var(--brand-secondary)]">Token is used only in your browser — never sent to our servers.</p>
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
                        Found {preview.colors.length} colors and {preview.fonts.length} text styles from &quot;{preview.name}&quot;
                    </div>

                    {preview.colors.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-[var(--brand-secondary)]">Colors</p>
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
                                    <span className="self-center text-xs text-[var(--brand-secondary)]">+{preview.colors.length - 12} more</span>
                                )}
                            </div>
                        </div>
                    )}

                    {preview.fonts.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-xs font-medium text-[var(--brand-secondary)]">Fonts</p>
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
                                Fetching styles…
                            </span>
                        ) : (
                            'Fetch styles'
                        )}
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => { setState('idle'); setPreview(null); }}
                            className="text-sm"
                        >
                            Back
                        </Button>
                        <Button onClick={handleApply} className="flex-1 text-sm">
                            Apply to design system
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
