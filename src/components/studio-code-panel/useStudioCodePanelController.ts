import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TFunction } from 'i18next';
import { parseOpenFlowDSL, type ParseDiagnostic } from '@/lib/openFlowDSLParser';
import { toMermaid } from '@/services/exportService';
import { toOpenFlowDSL } from '@/services/openFlowDSLExporter';
import { parseMermaidByType } from '@/services/mermaid/parseMermaidByType';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { applyCodeChanges } from '@/components/command-bar/applyCodeChanges';
import type { StudioCodeMode } from '@/hooks/useFlowEditorUIState';
import type { MermaidDiagnosticsSnapshot } from '@/store/types';

export type DraftPreviewState = 'empty' | 'error' | 'ready';

export interface DraftPreview {
    state: DraftPreviewState;
    label: string;
    detail: string;
}

interface UseStudioCodePanelControllerParams {
    nodes: FlowNode[];
    edges: FlowEdge[];
    mode: StudioCodeMode;
    onApply: (nodes: FlowNode[], edges: FlowEdge[]) => void;
    onModeChange: (mode: StudioCodeMode) => void;
    activeTabId: string | null;
    updateTab: (id: string, updates: Partial<{ diagramType: string }>) => void;
    architectureStrictMode: boolean;
    setMermaidDiagnostics: (snapshot: MermaidDiagnosticsSnapshot | null) => void;
    clearMermaidDiagnostics: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
    t: TFunction; // kept for future i18n use
}

interface UseStudioCodePanelControllerResult {
    code: string;
    error: string | null;
    diagnostics: ParseDiagnostic[];
    isApplying: boolean;
    draftPreview: DraftPreview;
    hasDraftChanges: boolean;
    liveSync: boolean;
    setLiveSync: (value: boolean) => void;
    handleCodeChange: (value: string) => void;
    handleApply: () => Promise<void>;
    handleReset: () => void;
    handleModeSelect: (nextMode: StudioCodeMode) => void;
}

export function useStudioCodePanelController({
    nodes,
    edges,
    mode,
    onApply,
    onModeChange,
    activeTabId,
    updateTab,
    architectureStrictMode,
    setMermaidDiagnostics,
    clearMermaidDiagnostics,
    addToast,
    t: _t,
}: UseStudioCodePanelControllerParams): UseStudioCodePanelControllerResult {
    const [error, setError] = useState<string | null>(null);
    const [diagnostics, setDiagnostics] = useState<ParseDiagnostic[]>([]);
    const [isApplying, setIsApplying] = useState(false);
    const [liveSync, setLiveSync] = useState(false);
    const [draftCodeByMode, setDraftCodeByMode] = useState<Partial<Record<StudioCodeMode, string>>>({});
    const [lastAppliedCode, setLastAppliedCode] = useState<Record<StudioCodeMode, string>>({
        openflow: '',
        mermaid: '',
    });

    const generatedOpenFlow = useMemo(() => toOpenFlowDSL(nodes, edges), [nodes, edges]);
    const generatedMermaid = useMemo(() => toMermaid(nodes, edges), [nodes, edges]);
    const generatedCode = mode === 'openflow' ? generatedOpenFlow : generatedMermaid;
    const code = draftCodeByMode[mode] ?? generatedCode;

    const draftPreview = useMemo<DraftPreview>(() => {
        if (!code.trim()) {
            return {
                state: 'empty',
                label: 'Empty draft',
                detail: 'Start typing to build a graph-wide code draft.',
            };
        }

        if (mode === 'mermaid') {
            const parsed = parseMermaidByType(code, { architectureStrictMode });
            if (parsed.error) {
                return {
                    state: 'error',
                    label: 'Needs fixes',
                    detail: parsed.error,
                };
            }

            return {
                state: 'ready',
                label: 'Ready to apply',
                detail: `${parsed.nodes.length} nodes, ${parsed.edges.length} edges`,
            };
        }

        const parsed = parseOpenFlowDSL(code);
        if (parsed.error) {
            return {
                state: 'error',
                label: 'Needs fixes',
                detail: parsed.error,
            };
        }

        return {
            state: 'ready',
            label: 'Ready to apply',
            detail: `${parsed.nodes.length} nodes, ${parsed.edges.length} edges`,
        };
    }, [architectureStrictMode, code, mode]);

    const appliedCodeForMode = lastAppliedCode[mode] || generatedCode;
    const hasDraftChanges = code !== appliedCodeForMode;

    const handleApply = useCallback(async () => {
        const applied = await applyCodeChanges({
            mode,
            code,
            architectureStrictMode,
            onApply,
            onClose: () => undefined,
            activeTabId,
            updateTab,
            setMermaidDiagnostics,
            clearMermaidDiagnostics,
            addToast,
            setError,
            setDiagnostics,
            setIsApplying,
            setLiveStatus: () => undefined,
            isLiveRequestStale: () => false,
            options: {
                closeOnSuccess: false,
                source: 'manual',
            },
        });

        if (applied) {
            setLastAppliedCode((current) => ({
                ...current,
                [mode]: code,
            }));
        }
    }, [
        activeTabId,
        addToast,
        architectureStrictMode,
        clearMermaidDiagnostics,
        code,
        mode,
        onApply,
        setMermaidDiagnostics,
        updateTab,
    ]);

    const handleReset = useCallback(() => {
        setDraftCodeByMode((current) => {
            const nextDraftCodeByMode = { ...current };
            delete nextDraftCodeByMode[mode];
            return nextDraftCodeByMode;
        });
        setError(null);
        setDiagnostics([]);
        clearMermaidDiagnostics();
    }, [clearMermaidDiagnostics, mode]);

    const handleModeSelect = useCallback((nextMode: StudioCodeMode) => {
        setError(null);
        setDiagnostics([]);
        onModeChange(nextMode);
    }, [onModeChange]);

    useEffect(() => {
        if (!liveSync || !hasDraftChanges || draftPreview.state !== 'ready' || isApplying) return;
        const timer = setTimeout(() => { void handleApply(); }, 800);
        return () => clearTimeout(timer);
    }, [liveSync, hasDraftChanges, draftPreview.state, isApplying, handleApply]);

    const handleCodeChange = useCallback((value: string) => {
        setDraftCodeByMode((current) => ({
            ...current,
            [mode]: value,
        }));
        setError(null);
        setDiagnostics([]);
    }, [mode]);

    return {
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
    };
}
