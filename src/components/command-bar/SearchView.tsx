import React, { useState, useMemo } from 'react';
import { Node, useReactFlow } from 'reactflow';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { ViewHeader } from './ViewHeader';
import { useFlowStore } from '../../store';

interface SearchViewProps {
    nodes: Node[];
    onClose: () => void;
    handleBack: () => void;
}

export const SearchView = ({
    nodes,
    onClose,
    handleBack
}: SearchViewProps) => {
    const [query, setQuery] = useState('');
    const { fitView } = useReactFlow();
    const { setSelectedNodeId } = useFlowStore();

    const filteredNodes = useMemo(() => {
        if (!query) return nodes;
        return nodes.filter(n =>
            (n.data?.label || '').toLowerCase().includes(query.toLowerCase()) ||
            (n.data?.subLabel || '').toLowerCase().includes(query.toLowerCase()) ||
            (n.id || '').toLowerCase().includes(query.toLowerCase())
        );
    }, [nodes, query]);

    const handleSelectNode = (node: Node) => {
        setSelectedNodeId(node.id);
        fitView({ nodes: [node], duration: 800, padding: 1.5 }); // proper zoom to node
        onClose();
    };

    function getInitials(str: string) {
        return str.slice(0, 2).toUpperCase();
    }

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Search Nodes" icon={<Search className="w-4 h-4 text-[var(--brand-primary)]" />} onBack={handleBack} />

            <div className="px-4 py-2 border-b border-slate-100">
                <Input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Search by label or ID..."
                    className="w-full focus:border-[var(--brand-primary-400)]"
                    autoFocus
                />
            </div>

            <div className="overflow-y-auto p-2 grid grid-cols-1 gap-1 max-h-[350px]">
                {filteredNodes.map(node => (
                    <div
                        key={node.id}
                        onClick={() => handleSelectNode(node)}
                        className="group flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-slate-50 border border-transparent hover:border-slate-200 cursor-pointer transition-all"
                    >
                        <div className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 text-white font-bold text-xs
                            ${node.type === 'start' ? 'bg-emerald-500' :
                                node.type === 'end' ? 'bg-red-500' :
                                    node.type === 'decision' ? 'bg-amber-500' :
                                        'bg-blue-500'}
                        `}>
                            {getInitials(node.data?.label || node.type || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-700 group-hover:text-[var(--brand-primary-700)] truncate">
                                {node.data?.label || 'Untitled Node'}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-1">
                                {node.data?.subLabel || `Type: ${node.type}`}
                            </p>
                        </div>
                        <div className="text-[10px] text-slate-300 group-hover:text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {node.id}
                        </div>
                    </div>
                ))}
                {filteredNodes.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">No nodes found</div>
                )}
            </div>
        </div>
    );
};
