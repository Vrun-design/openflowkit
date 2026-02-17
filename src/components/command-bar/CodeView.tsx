import React, { useState, useEffect, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { Link } from 'react-router-dom';
import { Code2, FileCode, AlertCircle, BookOpen, Loader2, Play } from 'lucide-react';
import { ViewHeader } from './ViewHeader';
import { toMermaid } from '../../services/exportService';
import { toOpenFlowDSL } from '../../services/openFlowDSLExporter';
import { parseMermaid } from '@/lib/mermaidParser';
import { parseOpenFlowDSL } from '@/lib/openFlowDSLParser';
import { getElkLayout } from '../../services/elkLayout';
import { assignSmartHandles } from '../../services/smartEdgeRouting';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { useFlowStore } from '../../store';

interface CodeViewProps {
    mode: 'mermaid' | 'flowmind';
    nodes: Node[];
    edges: Edge[];
    onApply: (nodes: Node[], edges: Edge[]) => void;
    onClose: () => void;
    handleBack: () => void;
}

export const CodeView = ({
    mode,
    nodes,
    edges,
    onApply,
    onClose,
    handleBack
}: CodeViewProps) => {
    const { brandConfig } = useFlowStore();
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    // No initial sync - start empty for import
    useEffect(() => {
        setCode('');
    }, [mode]);

    const handleChange = (val: string) => {
        setCode(val);
        if (error) setError(null);
    };

    const handleApply = async () => {
        const res = mode === 'mermaid' ? parseMermaid(code) : parseOpenFlowDSL(code);
        if (res.error) {
            setError(res.error);
            return;
        }


        // Apply ELK layout for both Mermaid and FlowMind DSL
        if (res.nodes.length > 0) {
            setIsApplying(true);
            try {
                // Direction from metadata or default to TB
                const direction = (res as any).metadata?.direction || (res as any).direction || 'TB';

                const layoutedNodes = await getElkLayout(res.nodes, res.edges, {
                    direction,
                    algorithm: 'layered',
                    spacing: 'normal',
                });

                // Smart Edge Routing (optional but good)
                const smartEdges = assignSmartHandles(layoutedNodes, res.edges);

                onApply(layoutedNodes, smartEdges);
            } catch (err) {
                console.error('Layout failed, applying raw positions:', err);
                onApply(res.nodes, res.edges);
            } finally {
                setIsApplying(false);
            }
        } else {
            onApply(res.nodes, res.edges);
        }
        onClose();
    };

    // prevent propagation for critical keys
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Allow navigation and deletion within the textarea without bubbling
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.stopPropagation();
        }
        // Allow copy/paste/select-all
        if ((e.metaKey || e.ctrlKey) && ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key.toLowerCase())) {
            e.stopPropagation();
        }

        // Apply
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleApply();
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ViewHeader
                title={mode === 'mermaid' ? 'Import Mermaid' : `Import ${brandConfig.appName} DSL`}
                icon={mode === 'mermaid' ? <Code2 className="w-4 h-4 text-[var(--brand-primary)]" /> : <FileCode className="w-4 h-4 text-[var(--brand-primary)]" />}
                onBack={handleBack}
            />
            <div className="p-4 flex-1 relative flex flex-col gap-4">
                <div className="relative flex-1">
                    <Textarea
                        value={code}
                        onChange={e => handleChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={mode === 'mermaid' ? "Paste Mermaid code here..." : `Paste ${brandConfig.appName} DSL code here...`}
                        className={`h-full font-mono leading-relaxed resize-none transition-all
                                ${error ? 'border-amber-300 bg-amber-50/30' : 'bg-slate-50/50'}
                            `}
                        spellCheck={false}
                        autoFocus
                    />
                </div>

                {error && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs shadow-sm">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium truncate">{error}</span>
                    </div>
                )}

                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-400">⌘+Enter to apply</span>
                        {mode === 'flowmind' && (
                            <a
                                href="#/docs/openflow-dsl"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary)] hover:text-[var(--brand-primary-700)] transition-colors"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                Syntax Guide
                            </a>
                        )}
                    </div>
                    <Button
                        onClick={handleApply}
                        disabled={isApplying}
                        variant="primary"
                        className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-600)] border-transparent text-white"
                        isLoading={isApplying}
                        icon={!isApplying && <Play className="w-4 h-4" />}
                    >
                        Apply Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};
