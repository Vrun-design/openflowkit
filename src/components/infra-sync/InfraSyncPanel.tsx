import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Server, Loader2, RefreshCw, Check, AlertCircle, FileText } from 'lucide-react';
import { IS_BEVELED } from '@/lib/brand';
import { useInfraSync } from '@/hooks/useInfraSync';
import { infraSyncResultSummary } from '@/services/infraSync/infraToDsl';
import type { InfraFormat } from '@/services/infraSync/types';
import type { TerraformInputFormat } from '@/hooks/ai-generation/terraformToCloud';

const FORMAT_TABS: Array<{ id: InfraFormat; label: string }> = [
    { id: 'terraform-state', label: 'TF State' },
    { id: 'kubernetes', label: 'K8s' },
    { id: 'docker-compose', label: 'Compose' },
    { id: 'terraform-hcl', label: 'HCL' },
];

const FORMAT_PLACEHOLDERS: Record<InfraFormat, string> = {
    'terraform-state': 'Paste .tfstate JSON here...',
    'kubernetes': 'Paste Kubernetes YAML manifests here...',
    'docker-compose': 'Paste docker-compose.yml here...',
    'terraform-hcl': 'Paste Terraform HCL here...',
};

const FORMAT_HINTS: Record<InfraFormat, string> = {
    'terraform-state': 'Drop your .tfstate file or run: terraform show -json > state.json',
    'kubernetes': 'Drop a manifest.yaml or run: kubectl get all -o yaml > cluster.yaml',
    'docker-compose': 'Drop your docker-compose.yml',
    'terraform-hcl': 'Paste your main.tf — uses AI to interpret',
};

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    return `${Math.round(bytes / 1024)}KB`;
}

function formatRelativeTime(ts: number): string {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
}

interface InfraSyncPanelProps {
    onApplyDsl: (dsl: string) => void;
    onTerraformAnalysis?: (input: string, format: TerraformInputFormat) => Promise<void>;
}

export function InfraSyncPanel({ onApplyDsl, onTerraformAnalysis }: InfraSyncPanelProps): ReactElement {
    const isBeveled = IS_BEVELED;
    const [format, setFormat] = useState<InfraFormat>('terraform-state');
    const [input, setInput] = useState('');
    const [fileInfo, setFileInfo] = useState<{ name: string; size: number } | null>(null);
    const [applyFeedback, setApplyFeedback] = useState(false);
    const applyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const handleHclAnalysis = onTerraformAnalysis
        ? async (text: string) => {
              await onTerraformAnalysis(text, 'terraform');
          }
        : undefined;

    const { result, dsl, isParsing, error, parse, refresh } = useInfraSync(handleHclAnalysis);

    const handleGenerate = (): void => {
        if (!input.trim()) return;
        void parse(input, format);
    };

    const handleApply = useCallback((): void => {
        if (!dsl) return;
        onApplyDsl(dsl);
        setApplyFeedback(true);
        clearTimeout(applyTimeoutRef.current);
        applyTimeoutRef.current = setTimeout(() => setApplyFeedback(false), 2000);
    }, [dsl, onApplyDsl]);

    useEffect(() => () => clearTimeout(applyTimeoutRef.current), []);

    const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>): void => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        setFileInfo({ name: file.name, size: file.size });
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result;
            if (typeof text === 'string') setInput(text);
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 custom-scrollbar">
            <div className="rounded-[var(--radius-md)] border border-slate-200 bg-[var(--brand-primary-50)] p-3">
                <p className="text-xs font-medium text-[var(--brand-primary)]">Infrastructure Sync</p>
                <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
                    Parse infrastructure source into an editable diagram draft, then apply it to the canvas when the result looks right.
                </p>
            </div>

            <div className="flex gap-1 flex-wrap">
                {FORMAT_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setFormat(tab.id); setInput(''); setFileInfo(null); }}
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
                            format === tab.id
                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="text-[11px] text-slate-400 -mt-1">{FORMAT_HINTS[format]}</div>

            {fileInfo && (
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[11px] font-medium text-slate-600 truncate">{fileInfo.name}</span>
                    <span className="text-[11px] text-slate-400">{formatFileSize(fileInfo.size)}</span>
                </div>
            )}

            <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setFileInfo(null); }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                placeholder={FORMAT_PLACEHOLDERS[format]}
                className="min-h-[200px] flex-1 resize-none rounded-[var(--radius-md)] border border-slate-200 bg-white px-3 py-3 font-mono text-xs text-slate-700 outline-none placeholder-slate-300 focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary-100)] custom-scrollbar"
            />

            <button
                onClick={handleGenerate}
                disabled={!input.trim() || isParsing}
                className={`flex h-9 w-full items-center justify-center gap-2 rounded-[var(--brand-radius)] bg-[var(--brand-primary)] text-sm font-medium text-white transition-all hover:bg-[var(--brand-primary-600)] disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] ${isBeveled ? 'btn-beveled' : ''}`}
            >
                {isParsing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Parsing infrastructure...</>
                ) : (
                    <><Server className="h-4 w-4" /> Generate draft</>
                )}
            </button>

            {error && (
                <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                    <p className="text-[11px] text-red-700">{error}</p>
                </div>
            )}

            {result && dsl && (
                <div className="rounded-[var(--radius-md)] border border-emerald-200 bg-emerald-50/50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="text-xs font-medium text-slate-700">
                            Found {infraSyncResultSummary(result)}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-6">
                        Parsed {formatRelativeTime(result.lastParsed)}
                    </p>
                </div>
            )}

            {result && dsl && (
                <div className="flex gap-2">
                    <button
                        onClick={handleApply}
                        className={`flex h-9 flex-1 items-center justify-center gap-2 rounded-[var(--brand-radius)] text-sm font-medium text-white transition-all active:scale-[0.98] ${
                            applyFeedback
                                ? 'bg-emerald-500'
                                : `bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-600)] ${isBeveled ? 'btn-beveled' : ''}`
                        }`}
                    >
                        {applyFeedback ? (
                            <><Check className="h-4 w-4" /> Applied to canvas</>
                        ) : (
                            'Apply to Canvas'
                        )}
                    </button>
                    <button
                        onClick={() => void refresh()}
                        disabled={isParsing}
                        title="Refresh"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--brand-radius)] border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40"
                    >
                        <RefreshCw className={`h-4 w-4 ${isParsing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}
        </div>
    );
}
