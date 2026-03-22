import { useState, type ReactElement } from 'react';
import { Figma, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { parseFigmaFileKey, fetchFigmaStyles, type FigmaImportResult } from '@/services/figmaImport/figmaApiClient';

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
        <div className="flex flex-col gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Figma className="w-4 h-4 text-[#F24E1E]" />
                    <span className="text-sm font-semibold text-slate-700">Import from Figma</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">Figma file URL</label>
                <input
                    type="text"
                    placeholder="https://www.figma.com/design/…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-300"
                />
            </div>

            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-600">
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
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-slate-300"
                />
                <p className="text-xs text-slate-400">Token is used only in your browser — never sent to our servers.</p>
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
                            <p className="text-xs font-medium text-slate-500 mb-1.5">Colors</p>
                            <div className="flex flex-wrap gap-1.5">
                                {preview.colors.slice(0, 12).map((c) => (
                                    <div
                                        key={c.name}
                                        className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-md px-2 py-1"
                                        title={c.name}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full border border-slate-200 shrink-0"
                                            style={{ background: c.hex }}
                                        />
                                        <span className="text-xs text-slate-600 font-mono">{c.hex}</span>
                                    </div>
                                ))}
                                {preview.colors.length > 12 && (
                                    <span className="text-xs text-slate-400 self-center">+{preview.colors.length - 12} more</span>
                                )}
                            </div>
                        </div>
                    )}

                    {preview.fonts.length > 0 && (
                        <div>
                            <p className="text-xs font-medium text-slate-500 mb-1.5">Fonts</p>
                            <div className="flex flex-wrap gap-1.5">
                                {[...new Set(preview.fonts.map((f) => f.fontFamily))].slice(0, 4).map((family) => (
                                    <span
                                        key={family}
                                        className="text-xs bg-slate-50 border border-slate-100 rounded-md px-2 py-1 text-slate-600"
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
