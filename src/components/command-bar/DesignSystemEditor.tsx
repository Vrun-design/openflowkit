import React, { useState } from 'react';
import { useFlowStore } from '../../store';
import { ArrowLeft, Check, ChevronRight, Palette, Type, Box, Activity, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { DesignSystem } from '@/lib/types';

interface DesignSystemEditorProps {
    systemId: string;
    onBack: () => void;
}

type EditorTab = 'colors' | 'typography' | 'nodes' | 'edges';

export const DesignSystemEditor: React.FC<DesignSystemEditorProps> = ({ systemId, onBack }) => {
    const { designSystems, updateDesignSystem } = useFlowStore();
    const system = designSystems.find(ds => ds.id === systemId);

    // Local state for the specific editor tab
    const [activeTab, setActiveTab] = useState<EditorTab>('colors');
    // Local state for system name editing
    const [name, setName] = useState(system?.name || '');

    if (!system) return <div>System not found</div>;

    const handleSaveName = () => {
        updateDesignSystem(systemId, { name });
    };

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50/50">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full">
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                </Button>
                <div className="flex-1">
                    <input
                        className="w-full bg-transparent font-semibold text-slate-700 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 transition-all"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleSaveName}
                    />
                </div>
            </div>

            {/* Editor Tabs/Nav */}
            <div className="flex p-2 gap-1 bg-white border-b border-slate-100 overflow-x-auto">
                <TabButton
                    active={activeTab === 'colors'}
                    onClick={() => setActiveTab('colors')}
                    icon={<Palette className="w-3.5 h-3.5" />}
                    label="Colors"
                />
                <TabButton
                    active={activeTab === 'typography'}
                    onClick={() => setActiveTab('typography')}
                    icon={<Type className="w-3.5 h-3.5" />}
                    label="Type"
                />
                <TabButton
                    active={activeTab === 'nodes'}
                    onClick={() => setActiveTab('nodes')}
                    icon={<Box className="w-3.5 h-3.5" />}
                    label="Nodes"
                />
                <TabButton
                    active={activeTab === 'edges'}
                    onClick={() => setActiveTab('edges')}
                    icon={<Activity className="w-3.5 h-3.5" />}
                    label="Edges"
                />
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
                {activeTab === 'colors' && <ColorEditor system={system} update={updateDesignSystem} />}
                {activeTab === 'typography' && <TypographyEditor system={system} update={updateDesignSystem} />}
                {/* Placeholders for now */}
                {activeTab === 'nodes' && <div className="text-center text-slate-400 mt-10">Node styling coming in next step</div>}
                {activeTab === 'edges' && <div className="text-center text-slate-400 mt-10">Edge styling coming in next step</div>}
            </div>
        </div>
    );
};

// UI Helpers
const TabButton = ({ active, onClick, icon, label }: any) => {
    const isBeveled = useFlowStore(state => state.brandConfig.ui.buttonStyle === 'beveled');
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95
                ${active
                    ? `bg-[var(--brand-primary-50)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20 ${isBeveled ? 'btn-beveled shadow-sm' : ''}`
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
        >
            {icon}
            {label}
        </button>
    );
};

// Sub-Editors (Basic Stub)
const ColorEditor = ({ system, update }: { system: DesignSystem, update: any }) => (
    <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Semantic Colors</h3>
        <div className="grid grid-cols-1 gap-3">
            <ColorInput label="Primary" value={system.colors.primary} onChange={(v) => update(system.id, { colors: { ...system.colors, primary: v } })} />
            <ColorInput label="Background" value={system.colors.background} onChange={(v) => update(system.id, { colors: { ...system.colors, background: v } })} />
            <ColorInput label="Surface" value={system.colors.surface} onChange={(v) => update(system.id, { colors: { ...system.colors, surface: v } })} />
        </div>
    </div>
);

const TypographyEditor = ({ system, update }: { system: DesignSystem, update: any }) => (
    <div className="space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Typography</h3>
        {/* Font List will go here */}
        <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="text-xs font-medium text-slate-700 block mb-2">Font Family</label>
            <select
                className="w-full text-sm border-slate-200 rounded-md"
                value={system.typography.fontFamily.split(',')[0].replace(/['"]/g, '')}
                onChange={(e) => update(system.id, { typography: { ...system.typography, fontFamily: `${e.target.value}, sans-serif` } })}
            >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
            </select>
        </div>
    </div>
);

const ColorInput = ({ label, value, onChange }: any) => (
    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-100">
        <span className="text-sm text-slate-700 font-medium">{label}</span>
        <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 font-mono">{value}</div>
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-6 h-6 rounded overflow-hidden border-none cursor-pointer"
            />
        </div>
    </div>
);
