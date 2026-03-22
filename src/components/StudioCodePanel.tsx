import React, { useRef } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Play, RotateCcw, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { useFlowStore } from '@/store';
import { APP_NAME, IS_BEVELED } from '@/lib/brand';
import { useMermaidDiagnosticsActions } from '@/store/selectionHooks';
import { useToast } from './ui/ToastContext';
import type { FlowEdge, FlowNode } from '@/lib/types';
import type { StudioCodeMode } from '@/hooks/useFlowEditorUIState';
import { useStudioCodePanelController, type DraftPreviewState } from './studio-code-panel/useStudioCodePanelController';

interface CodeModeOption {
    id: StudioCodeMode;
    label: string;
}

function friendlyDslError(raw: string): string {
    if (/unexpected token/i.test(raw)) return 'Syntax error — check for missing colons or brackets';
    if (/duplicate|already defined/i.test(raw)) return 'Duplicate node ID — each node must have a unique name';
    if (/spaces?\b.*id|id.*\bspaces?/i.test(raw) || /node id.*space/i.test(raw)) return 'Node IDs cannot contain spaces — use underscores (e.g. my_node)';
    return raw;
}

function getDraftPreviewBadgeClass(state: DraftPreviewState): string {
    if (state === 'ready') {
        return 'bg-emerald-50 text-emerald-700';
    }

    if (state === 'error') {
        return 'bg-amber-50 text-amber-700';
    }

    return 'bg-slate-100 text-slate-600';
}

interface StudioCodePanelProps {
    nodes: FlowNode[];
    edges: FlowEdge[];
    onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    mode: StudioCodeMode;
    onModeChange: (mode: StudioCodeMode) => void;
}

export function StudioCodePanel({
    nodes,
    edges,
    onApply,
    mode,
    onModeChange,
}: StudioCodePanelProps): React.ReactElement {
    const { t } = useTranslation();
    const { activeTabId, updateTab, viewSettings } = useFlowStore();
    const { setMermaidDiagnostics, clearMermaidDiagnostics } = useMermaidDiagnosticsActions();
    const { addToast } = useToast();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const modeOptions: CodeModeOption[] = [
        { id: 'openflow', label: `${APP_NAME} DSL` },
        { id: 'mermaid', label: 'Mermaid' },
    ];
    const {
        code,
        error,
        diagnostics,
        isApplying,
        draftPreview,
        hasDraftChanges,
        liveSync,
        setLiveSync,
        handleCodeChange,
        handleApply,
        handleReset,
        handleModeSelect,
    } = useStudioCodePanelController({
        nodes,
        edges,
        mode,
        onApply,
        onModeChange,
        activeTabId,
        updateTab,
        architectureStrictMode: viewSettings.architectureStrictMode,
        setMermaidDiagnostics,
        clearMermaidDiagnostics,
        addToast,
        t,
    });

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.stopPropagation();
        }
        if ((event.metaKey || event.ctrlKey) && ['a', 'c', 'v', 'x', 'z', 'y'].includes(event.key.toLowerCase())) {
            event.stopPropagation();
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="mb-3 border-b border-slate-200/80 pb-3">
                <div className="mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Diagram as code</p>
                    <p className="mt-1 text-xs text-slate-500">
                        Edit the full diagram source, validate the draft, then apply the changes back to the canvas.
                    </p>
                </div>
                <div className="flex items-center gap-5">
                    {modeOptions.map(({ id, label }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => handleModeSelect(id)}
                            className={`relative -mb-px border-b-2 px-0 pb-2 pt-1 text-sm font-semibold transition-colors ${mode === id
                                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                                : 'border-transparent text-slate-500 hover:text-[var(--brand-text)]'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--brand-radius)] border border-slate-200 bg-slate-50/55 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-colors focus-within:border-[var(--brand-primary-300)] focus-within:ring-1 focus-within:ring-[var(--brand-primary-100)]">
                <div className="min-h-0 flex-1 overflow-hidden bg-white">
                    <Textarea
                        ref={textareaRef}
                        value={code}
                        onChange={(event) => handleCodeChange(event.target.value)}
                        onKeyDown={handleKeyDown}
                        className="h-full w-full resize-none !rounded-none !border-0 bg-transparent px-4 py-4 text-sm font-mono leading-relaxed text-[var(--brand-text)] placeholder-[var(--brand-secondary-light)] outline-none shadow-none custom-scrollbar focus-visible:!ring-0"
                        placeholder={mode === 'mermaid'
                            ? t('commandBar.code.mermaidPlaceholder')
                            : t('commandBar.code.dslPlaceholder', { appName: APP_NAME })}
                    />
                </div>

                {error ? (
                    <div className="mx-3 mt-3 rounded-[calc(var(--brand-radius)-4px)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {diagnostics.length > 0 ? (
                            <div className="space-y-2">
                                {diagnostics.slice(0, 3).map((diagnostic, index) => (
                                    <div key={`${diagnostic.message}-${index}`}>
                                        <div className="flex items-center gap-2 font-medium">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>
                                                {typeof diagnostic.line === 'number' ? `Line ${diagnostic.line} · ` : ''}
                                                {diagnostic.message}
                                            </span>
                                        </div>
                                        {diagnostic.snippet && (
                                            <div className="ml-5.5 mt-1 rounded bg-amber-100/60 px-2 py-1 font-mono text-[11px] text-amber-800">
                                                {diagnostic.snippet}
                                            </div>
                                        )}
                                        {diagnostic.hint && (
                                            <div className="ml-5.5 mt-1 text-[11px] text-amber-600">
                                                {diagnostic.hint}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-medium">{friendlyDslError(error)}</span>
                            </div>
                        )}
                    </div>
                ) : null}

                <div className="border-t border-slate-200/80 bg-slate-50/80 px-3 py-3">
                    <div className="mb-3 flex items-center justify-between gap-3 text-[11px]">
                        <div className="flex min-w-0 items-center gap-2">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${getDraftPreviewBadgeClass(draftPreview.state)}`}>
                                {draftPreview.state === 'ready' ? <CheckCircle2 className="h-3 w-3" /> : null}
                                {draftPreview.label}
                            </span>
                            <span className="truncate text-slate-500">{draftPreview.state === 'error' ? friendlyDslError(draftPreview.detail) : draftPreview.detail}</span>
                            {hasDraftChanges ? (
                                <span className="inline-flex items-center gap-1 text-[var(--brand-primary)]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary)]" />
                                    <span className="font-medium">Unsaved</span>
                                </span>
                            ) : null}
                        </div>

                        {mode === 'openflow' ? (
                            <a
                                href="https://docs.openflowkit.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-self-end gap-1 font-medium text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-primary-700)]"
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                {t('commandBar.code.syntaxGuide')}
                            </a>
                        ) : (
                            <div className="shrink-0" />
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {mode === 'mermaid' && (
                            <button
                                onClick={() => setLiveSync(!liveSync)}
                                title={liveSync ? 'Live preview is on and auto-applies valid Mermaid changes.' : 'Enable live preview for Mermaid changes.'}
                                className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all ${
                                    liveSync
                                        ? 'border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)]'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                                }`}
                            >
                                <Zap className="h-3 w-3" />
                                Live preview
                            </button>
                        )}
                        <Button
                            onClick={handleReset}
                            disabled={!hasDraftChanges && !error}
                            variant="ghost"
                            className="h-8 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                            icon={<RotateCcw className="w-3.5 h-3.5" />}
                        >
                            Reset
                        </Button>
                        <Button
                            onClick={() => void handleApply()}
                            disabled={isApplying || draftPreview.state !== 'ready' || !hasDraftChanges}
                            variant="primary"
                            className={`h-8 flex-1 justify-center border-transparent bg-[var(--brand-primary)] px-3 py-1.5 text-xs text-white hover:bg-[var(--brand-primary-600)] transition-all active:scale-95 ${IS_BEVELED ? 'btn-beveled' : ''}`}
                            isLoading={isApplying}
                            icon={!isApplying && <Play className="w-3.5 h-3.5" />}
                        >
                            Apply to canvas
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
