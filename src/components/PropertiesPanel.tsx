import React from 'react';
import { Node, Edge } from 'reactflow';
import { NodeData } from '@/lib/types';
import { Layout, ArrowRight, X, Settings2 } from 'lucide-react';
import { NodeProperties } from './properties/NodeProperties';
import { EdgeProperties } from './properties/EdgeProperties';

interface PropertiesPanelProps {
    selectedNode: Node<NodeData> | null;
    selectedEdge: Edge | null;
    onChangeNode: (id: string, data: Partial<NodeData>) => void;
    onChangeNodeType: (id: string, type: string) => void;
    onChangeEdge: (id: string, updates: Partial<Edge>) => void;
    onDeleteNode: (id: string) => void;
    onDuplicateNode: (id: string) => void;
    onDeleteEdge: (id: string) => void;
    onUpdateZIndex: (id: string, action: 'front' | 'back') => void;
    onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedNode,
    selectedEdge,
    onChangeNode,
    onChangeNodeType,
    onChangeEdge,
    onDeleteNode,
    onDuplicateNode,
    onDeleteEdge,
    onUpdateZIndex,
    onClose
}) => {
    if (!selectedNode && !selectedEdge) return null;

    const isAnnotation = selectedNode?.type === 'annotation';

    return (
        <div className="absolute top-20 right-6 w-80 bg-[var(--brand-surface)]/95 backdrop-blur-md rounded-[var(--radius-lg)] shadow-2xl border border-white/20 ring-1 ring-black/5 flex flex-col overflow-hidden max-h-[calc(100vh-140px)] z-50 animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[var(--brand-surface)]">
                <h3 className="font-semibold text-[var(--brand-text)] flex items-center gap-2">
                    {selectedNode ? (
                        <>
                            <Settings2 className="w-4 h-4 text-[var(--brand-primary)]" />
                            <span>{isAnnotation ? 'Sticky Note' : 'Node Settings'}</span>
                        </>
                    ) : (
                        <>
                            <ArrowRight className="w-4 h-4 text-[var(--brand-primary)]" />
                            <span>Connection</span>
                        </>
                    )}
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-[var(--brand-secondary)] transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-6 flex-1">
                {selectedNode && (
                    <NodeProperties
                        selectedNode={selectedNode}
                        onChange={onChangeNode}
                        onDuplicate={onDuplicateNode}
                        onDelete={onDeleteNode}
                    />
                )}

                {selectedEdge && (
                    <EdgeProperties
                        selectedEdge={selectedEdge}
                        onChange={onChangeEdge}
                        onDelete={onDeleteEdge}
                    />
                )}
            </div>
        </div>
    );
};