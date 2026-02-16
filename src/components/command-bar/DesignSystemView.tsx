import React, { useMemo, useState } from 'react';
import { useFlowStore } from '../../store';
import { Palette, Check, Plus, ArrowLeft, MoreHorizontal, Copy, Trash2, Edit2, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { DesignSystemEditor } from './DesignSystemEditor';

interface DesignSystemViewProps {
    onClose: () => void;
    handleBack: () => void;
}

export const DesignSystemView: React.FC<DesignSystemViewProps> = ({ onClose, handleBack }) => {
    const {
        designSystems,
        activeDesignSystemId,
        setActiveDesignSystem,
        addDesignSystem,
        duplicateDesignSystem,
        deleteDesignSystem,
        brandConfig
    } = useFlowStore();

    const isBeveled = brandConfig.ui.buttonStyle === 'beveled';
    const [editingSystemId, setEditingSystemId] = useState<string | null>(null);

    const activeSystem = designSystems.find(ds => ds.id === activeDesignSystemId);

    if (editingSystemId) {
        return (
            <DesignSystemEditor
                systemId={editingSystemId}
                onBack={() => setEditingSystemId(null)}
            />
        );
    }

    const handleCreateNew = () => {
        // Find default or use static default
        const base = designSystems.find(ds => ds.isDefault) || designSystems[0];
        const newId = `ds-${Date.now()}`;
        addDesignSystem({
            ...base,
            id: newId,
            name: 'New Theme',
            isDefault: false
        });
        setEditingSystemId(newId);
    };

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50/50">
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8 rounded-full">
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                </Button>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Palette className="w-4 h-4 text-[var(--brand-primary)]" />
                    Design Systems
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                <div className="space-y-1.5">
                    {designSystems.map((ds) => (
                        <div
                            key={ds.id}
                            className={`group w-full flex items-center justify-between p-3 rounded-[var(--radius-md)] border transition-all active:scale-[0.99]
                                ${activeDesignSystemId === ds.id
                                    ? `bg-[var(--brand-primary-50)] border-[var(--brand-primary)]/30 ${isBeveled ? 'btn-beveled' : 'ring-1 ring-[var(--brand-primary)]/10 shadow-sm'}`
                                    : `bg-white border-slate-100 hover:border-slate-300 ${isBeveled ? 'btn-beveled hover:bg-slate-50' : 'hover:bg-slate-50'}`
                                }`}
                        >
                            <button
                                className="flex-1 text-left outline-none"
                                onClick={() => setActiveDesignSystem(ds.id)}
                            >
                                <div className={`font-medium text-sm ${activeDesignSystemId === ds.id ? 'text-[var(--brand-primary-900)]' : 'text-slate-900'}`}>
                                    {ds.name}
                                </div>
                                {ds.description && (
                                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                        {ds.description}
                                    </div>
                                )}
                            </button>

                            <div className="flex items-center gap-1">
                                <div className="opacity-0 group-hover:opacity-100 flex items-center bg-white/50 rounded-[var(--radius-sm)] border border-slate-200 shadow-sm overflow-hidden transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-none hover:bg-slate-100"
                                        onClick={(e) => { e.stopPropagation(); setEditingSystemId(ds.id); }}
                                    >
                                        <Edit2 className="w-3 h-3 text-slate-500" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 rounded-none hover:bg-slate-100"
                                        onClick={(e) => { e.stopPropagation(); duplicateDesignSystem(ds.id); }}
                                    >
                                        <Copy className="w-3 h-3 text-slate-500" />
                                    </Button>
                                    {!ds.isDefault && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-none hover:bg-red-50 hover:text-red-500"
                                            onClick={(e) => { e.stopPropagation(); deleteDesignSystem(ds.id); }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>

                                {activeDesignSystemId === ds.id && (
                                    <div className="ml-2 bg-[var(--brand-primary-100)] text-[var(--brand-primary)] p-1 rounded-full animate-in zoom-in spin-in-180 duration-300">
                                        <Check className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 px-2 space-y-2">
                    <Button
                        variant="secondary"
                        className="w-full justify-center"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={handleCreateNew}
                    >
                        Create New System
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-[var(--radius-md)] text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer">
                            <Download className="w-3.5 h-3.5 rotate-180" />
                            Import
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                            try {
                                                const ds = JSON.parse(ev.target?.result as string);
                                                if (ds.id && ds.colors && ds.components) {
                                                    addDesignSystem({ ...ds, id: `imported-${Date.now()}`, name: `${ds.name} (Imported)`, isDefault: false });
                                                }
                                            } catch (err) {
                                                console.error('Invalid Design System JSON');
                                            }
                                        };
                                        reader.readAsText(file);
                                    }
                                    e.target.value = '';
                                }}
                            />
                        </label>

                        <Button
                            variant="secondary"
                            className="justify-center"
                            icon={<Download className="w-3.5 h-3.5" />}
                            onClick={() => {
                                if (!activeSystem) return;
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeSystem, null, 2));
                                const downloadAnchorNode = document.createElement('a');
                                downloadAnchorNode.setAttribute("href", dataStr);
                                downloadAnchorNode.setAttribute("download", `${activeSystem.name.toLowerCase().replace(/\s+/g, '-')}.json`);
                                document.body.appendChild(downloadAnchorNode);
                                downloadAnchorNode.click();
                                downloadAnchorNode.remove();
                            }}
                        >
                            Export Active
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
