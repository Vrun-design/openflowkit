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

function getFormatTabClassName(selected: boolean): string {
    return selected
        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm shadow-[var(--brand-primary-200)]'
        : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)]';
}

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
            <div className="rounded-[var(--radius-md)] border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] p-3">
                <p className="text-xs font-medium text-[var(--brand-primary)]">Infrastructure Sync</p>
                <p className="mt-0.5 text-[11px] leading-5 text-[var(--brand-secondary)]">
                    Parse infrastructure source into an editable diagram draft, then apply it to the canvas when the result looks right.
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]/70 p-1">
                {FORMAT_TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => { setFormat(tab.id); setInput(''); setFileInfo(null); }}
                        aria-pressed={format === tab.id}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary-200)] focus-visible:ring-offset-1 ${getFormatTabClassName(format === tab.id)}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="-mt-1 text-[11px] text-[var(--brand-secondary)]">{FORMAT_HINTS[format]}</div>

            {fileInfo && (
                <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-2.5 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-[var(--brand-secondary)]" />
                    <span className="truncate text-[11px] font-medium text-[var(--brand-text)]">{fileInfo.name}</span>
                    <span className="text-[11px] text-[var(--brand-secondary)]">{formatFileSize(fileInfo.size)}</span>
                </div>
            )}

            <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setFileInfo(null); }}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                placeholder={FORMAT_PLACEHOLDERS[format]}
                className="custom-scrollbar min-h-[200px] flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-3 font-mono text-xs text-[var(--brand-text)] shadow-sm outline-none transition-all placeholder:text-[var(--brand-secondary)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary-100)]"
            />

            <button
                onClick={handleGenerate}
                disabled={!input.trim() || isParsing}
                className={`flex h-10 w-full items-center justify-center gap-2 rounded-[var(--brand-radius)] bg-[var(--brand-primary)] text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-px hover:bg-[var(--brand-primary-600)] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] ${isBeveled ? 'btn-beveled' : ''}`}
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
                        <span className="text-xs font-medium text-[var(--brand-text)]">
                            Found {infraSyncResultSummary(result)}
                        </span>
                    </div>
                    <p className="pl-6 text-[11px] text-[var(--brand-secondary)]">
                        Parsed {formatRelativeTime(result.lastParsed)}
                    </p>
                </div>
            )}

            {result && dsl && (
                <div className="flex gap-2">
                    <button
                        onClick={handleApply}
                        className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[var(--brand-radius)] text-sm font-semibold text-white shadow-sm transition-all duration-200 active:scale-[0.98] ${
                            applyFeedback
                                ? 'bg-emerald-500'
                                : `bg-[var(--brand-primary)] hover:-translate-y-px hover:bg-[var(--brand-primary-600)] hover:shadow-md ${isBeveled ? 'btn-beveled' : ''}`
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
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)] hover:shadow-md disabled:opacity-40"
                    >
                        <RefreshCw className={`h-4 w-4 ${isParsing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            )}
        </div>
    );
}
