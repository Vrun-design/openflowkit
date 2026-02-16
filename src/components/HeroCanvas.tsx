import React, { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, {
    useNodesState,
    useEdgesState,
    addEdge,
    Background,
    Connection,
    Handle,
    Position,
    NodeProps,
    ReactFlowProvider,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    MousePointer2, Hand, Sparkles, Layout, Plus, Link, Trash2, Undo, Redo,
    Activity, Terminal, Code2, Database, Box
} from 'lucide-react';

// --- Custom "Terminal" Start Node ---
const StartNode = ({ data }: NodeProps) => {
    return (
        <div className="bg-slate-900 rounded-xl shadow-2xl shadow-indigo-500/20 border border-slate-700 p-0 overflow-hidden w-[340px] font-mono text-left">
            {/* Terminal Header */}
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="ml-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3 h-3" />
                    <span>init_flow.ts</span>
                </div>
            </div>

            {/* Terminal Body */}
            <div className="p-5 text-sm text-slate-300">
                <div className="mb-4">
                    <span className="text-purple-400">const</span> <span className="text-blue-400">flow</span> = <span className="text-yellow-300">new</span> <span className="text-emerald-400">FlowMind</span>();
                </div>
                <div className="mb-4 text-slate-500">
                    // Generating architecture...
                </div>

                <div className="space-y-2">
                    <button
                        className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-md text-xs font-medium flex items-center px-4 gap-3 transition-all group"
                        onClick={(e) => {
                            e.stopPropagation();
                            data.onAddNode?.();
                        }}
                    >
                        <span className="text-indigo-500">$</span>
                        <span>generate_next_node()</span>
                        <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <Sparkles className="w-3 h-3" />
                        </div>
                    </button>

                    <button
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-md text-xs font-medium flex items-center px-4 gap-3 transition-all"
                    >
                        <span className="text-slate-600">$</span>
                        <span>load_template --basic</span>
                    </button>
                </div>
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3" />
        </div>
    );
};

// --- Initial Data ---
const initialNodes = [
    {
        id: 'start-1',
        type: 'startNode',
        position: { x: 250, y: 50 },
        data: { label: 'Start' },
    },
];

export const HeroCanvas = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [hasBuilt, setHasBuilt] = useState(false);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const nodeTypes = useMemo(() => ({ startNode: StartNode }), []);

    const addNode = useCallback(() => {
        setNodes((nds) => {
            const id = `node-${nds.length + 1}`;
            // Simple auto-layout logic for demo
            const isEven = nds.length % 2 === 0;
            const xOffset = isEven ? -150 : 150;
            const yOffset = 150 * Math.floor(nds.length / 2) + 100;

            const newNode = {
                id,
                position: {
                    x: 250 + (Math.random() * 100 - 50) + (nds.length === 1 ? 0 : (Math.random() > 0.5 ? 150 : -150)),
                    y: 150 + (nds.length * 100)
                },
                data: { label: `Service ${nds.length}` },
                style: {
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    minWidth: '140px',
                    textAlign: 'center' as const,
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#475569',
                },
            };

            // Auto connect to the last node
            if (nds.length > 0) {
                const lastNode = nds[nds.length - 1];
                setEdges((eds) => addEdge({
                    id: `e-${lastNode.id}-${id}`,
                    source: lastNode.id,
                    target: id,
                    animated: true,
                    style: { stroke: '#6366f1' },
                }, eds));
            }

            return nds.concat(newNode);
        });
    }, [setEdges, setNodes]);

    // Pass the addNode function to the StartNode
    const nodesWithHandler = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: { ...node.data, onAddNode: addNode }
        }));
    }, [nodes, addNode]);

    // Auto-build effect
    useEffect(() => {
        if (hasBuilt) return;

        const timeouts = [
            setTimeout(() => addNode(), 1000),
            setTimeout(() => addNode(), 2000),
            setTimeout(() => addNode(), 3000),
        ];

        setHasBuilt(true);
        return () => timeouts.forEach(clearTimeout);
    }, [addNode, hasBuilt]);

    return (
        <div className="w-full h-full bg-[#FAFAFA] relative">
            <ReactFlowProvider>
                <ReactFlow
                    nodes={nodesWithHandler}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    proOptions={{ hideAttribution: true }}
                    className="bg-[#FAFAFA]"
                    panOnScroll={false}
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    panOnDrag={false}
                    nodesDraggable={false}
                    nodesConnectable={false}
                >
                    <Background color="#E2E8F0" gap={24} size={1} />
                </ReactFlow>
            </ReactFlowProvider>

            {/* Overlay to prevent interaction (optional, to keep it as a background visual) */}
            <div className="absolute inset-0 z-10 bg-transparent pointer-events-none" />

            {/* Bottom Toolbar (Visual Only) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/60 p-1.5 flex items-center gap-1 z-20 pointer-events-auto">
                {[MousePointer2, Hand, Sparkles, Layout, Plus, Link, Trash2, Undo, Redo].map((Icon, i) => (
                    <button
                        key={i}
                        className={`p-2.5 rounded-lg transition-all active:scale-95 ${i === 4 ? 'bg-[#6366f1] text-white shadow-md hover:bg-[#4f46e5]' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <Icon className="w-4 h-4" />
                    </button>
                ))}
            </div>

            {/* Left Controls */}
            <div className="absolute bottom-6 left-6 flex flex-col bg-white/90 backdrop-blur rounded-lg border border-slate-200/60 shadow-sm overflow-hidden hidden sm:flex pointer-events-auto">
                <button className="p-2 border-b border-slate-100 text-slate-400 hover:bg-slate-50 active:bg-slate-100"><Plus className="w-4 h-4" /></button>
                <div className="p-2 border-b border-slate-100 text-xs font-mono text-center text-slate-400">100%</div>
                <div className="p-2 text-slate-400 hover:bg-slate-50"><Activity className="w-4 h-4" /></div>
            </div>
        </div>
    );
};
