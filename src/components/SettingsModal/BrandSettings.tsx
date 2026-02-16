import React, { useState, useEffect } from 'react';
import { useFlowStore, BrandKit } from '../../store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Slider } from '../ui/Slider';
import { Switch } from '../ui/Switch';
import {
    RotateCw, Upload, Type, Palette, Box, ChevronDown, ExternalLink,
    Plus, Trash2, Copy, Check, Edit2, ArrowLeft, LayoutTemplate, Download, Sparkles
} from 'lucide-react';

// --- Types ---
type EditorTab = 'identity' | 'colors' | 'typography' | 'ui' | 'ai';

// --- Main Component ---
export const BrandSettings = () => {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingKitId, setEditingKitId] = useState<string | null>(null);
    const { activeBrandKitId } = useFlowStore();

    // Init with editor view of active kit
    useEffect(() => {
        if (view === 'editor' && !editingKitId) {
            setEditingKitId(activeBrandKitId);
        }
    }, [activeBrandKitId, view, editingKitId]);

    const handleSwitchToEditor = (id: string) => {
        setEditingKitId(id);
        setView('editor');
    };

    const handleSwitchToList = () => {
        setView('list');
    };

    return view === 'list'
        ? <BrandListView onSelect={handleSwitchToEditor} />
        : <BrandEditorView
            kitId={editingKitId || activeBrandKitId}
            onBack={handleSwitchToList}
        />;
};

// --- List View ---
const BrandListView = ({ onSelect }: { onSelect: (id: string) => void }) => {
    const {
        brandKits, activeBrandKitId, setActiveBrandKitId,
        addBrandKit, deleteBrandKit
    } = useFlowStore();

    // Helper to handle duplication if store doesn't have duplicateBrandKit (it might not based on previous context, so we use addBrandKit)
    const handleDuplicate = (kit: BrandKit) => {
        addBrandKit(`${kit.name} (Copy)`, kit);
    };

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100">
                <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg text-[var(--brand-primary)]">
                    <LayoutTemplate className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">Brand Kits</h2>
                    <p className="text-xs text-slate-500">Manage your brand identities</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {brandKits.map(kit => (
                    <div
                        key={kit.id}
                        className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none
                            ${activeBrandKitId === kit.id
                                ? 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/30 ring-1 ring-[var(--brand-primary)]/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveBrandKitId(kit.id)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                                <div className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: kit.colors.primary }} />
                                <div className="w-6 h-6 rounded-full border border-white shadow-sm" style={{ backgroundColor: kit.colors.secondary }} />
                            </div>
                            <div>
                                <h3 className={`text-sm font-medium ${activeBrandKitId === kit.id ? 'text-[var(--brand-primary)]' : 'text-slate-900'}`}>
                                    {kit.name}
                                </h3>
                                {activeBrandKitId === kit.id && (
                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-primary)] uppercase tracking-wider mt-0.5">
                                        <Check className="w-3 h-3" />
                                        Active
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]" onClick={(e) => { e.stopPropagation(); onSelect(kit.id); }} title="Edit Kit">
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]" onClick={(e) => { e.stopPropagation(); handleDuplicate(kit); }} title="Duplicate">
                                <Copy className="w-4 h-4" />
                            </Button>
                            {!kit.isDefault && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); if (confirm('Delete this kit?')) deleteBrandKit(kit.id); }} title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                <Button
                    className="w-full justify-center bg-[var(--brand-primary)] hover:opacity-90 text-white"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => addBrandKit("New Identity")}
                >
                    Create New Kit
                </Button>
            </div>
        </div>
    );
};

// --- Editor View ---
const BrandEditorView = ({ kitId, onBack }: { kitId: string, onBack: () => void }) => {
    const {
        brandKits, updateBrandKitName, setBrandConfig, activeBrandKitId,
        setActiveBrandKitId, resetBrandConfig
    } = useFlowStore();

    const kit = brandKits.find(k => k.id === kitId);
    const [activeTab, setActiveTab] = useState<EditorTab>('identity');
    const [name, setName] = useState(kit?.name || '');

    // Sync name when kit changes
    useEffect(() => {
        if (kit) setName(kit.name);
    }, [kit?.id]);

    if (!kit) return <div>Kit not found</div>;

    const isLive = activeBrandKitId === kitId;

    const handleNameSave = () => {
        if (name.trim() !== kit.name) {
            updateBrandKitName(kit.id, name);
        }
    };

    const handleActivate = () => {
        setActiveBrandKitId(kit.id);
    };

    // Helper to update config (wraps setBrandConfig but ensures we are editing the RIGHT kit if visual feedback depends on it being active)
    // NOTE: In current store implementation, setBrandConfig updates `brandConfig` AND the active kit in `brandKits`.
    // If we are editing a non-active kit, we need a way to update IT without changing the global `brandConfig` immediately,
    // OR we just force activate it.
    // DECISION: For simplicity in this UI, editing a kit makes it active.
    // This provides instant visual feedback on the canvas which is desirable.
    useEffect(() => {
        if (activeBrandKitId !== kitId) {
            setActiveBrandKitId(kitId);
        }
    }, [kitId]);


    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-slate-100">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full -ml-2">
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                </Button>
                <div className="flex-1">
                    <input
                        className="w-full bg-transparent font-semibold text-slate-700 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--brand-primary)] rounded px-1 -ml-1 transition-all truncate"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleNameSave}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                            {isLive ? 'Active Kit' : 'Inactive'}
                        </span>
                        {!isLive && (
                            <button onClick={handleActivate} className="text-[10px] text-[var(--brand-primary)] hover:underline font-medium">
                                Set Active
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={resetBrandConfig} title="Reset to Defaults">
                        <RotateCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-1 bg-white border-b border-slate-100 overflow-x-auto">
                <TabButton active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} icon={<Box className="w-3.5 h-3.5" />} label="Identity" />
                <TabButton active={activeTab === 'colors'} onClick={() => setActiveTab('colors')} icon={<Palette className="w-3.5 h-3.5" />} label="Colors" />
                <TabButton active={activeTab === 'typography'} onClick={() => setActiveTab('typography')} icon={<Type className="w-3.5 h-3.5" />} label="Type" />
                <TabButton active={activeTab === 'ui'} onClick={() => setActiveTab('ui')} icon={<LayoutTemplate className="w-3.5 h-3.5" />} label="UI & Shape" />
                <TabButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Sparkles className="w-3.5 h-3.5" />} label="Flowpilot" />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
                {activeTab === 'identity' && <IdentityEditor config={kit} update={setBrandConfig} />}
                {activeTab === 'colors' && <ColorsEditor config={kit} update={setBrandConfig} />}
                {activeTab === 'typography' && <TypographyEditor config={kit} update={setBrandConfig} />}
                {activeTab === 'ui' && <UIEditor config={kit} update={setBrandConfig} />}
                {activeTab === 'ai' && <AIEditor config={kit} update={setBrandConfig} />}
            </div>
        </div>
    );
};

// --- Sub-Editors (Refactored from original) ---

const IdentityEditor = ({ config, update }: { config: BrandKit, update: any }) => {
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => update({ [key]: reader.result as string });
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label>App Name</Label>
                <Input value={config.appName} onChange={e => update({ appName: e.target.value })} />
            </div>

            <div className="space-y-3">
                <Label>Logo</Label>
                <div className="flex gap-4">
                    <div className="w-20 h-20 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2">
                        {config.logoUrl ? <img src={config.logoUrl} className="max-w-full max-h-full object-contain" /> : <Upload className="text-slate-300" />}
                    </div>
                    <div className="space-y-2">
                        <label className="block">
                            <span className="sr-only">Upload</span>
                            <input type="file" className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-primary)]/10 file:text-[var(--brand-primary)] hover:file:bg-[var(--brand-primary)]/20" onChange={e => handleUpload(e, 'logoUrl')} />
                        </label>
                        {config.logoUrl && <button onClick={() => update({ logoUrl: null })} className="text-xs text-red-500 hover:underline">Remove Logo</button>}
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Favicon</Label>
                <div className="flex gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2">
                        {config.faviconUrl ? <img src={config.faviconUrl} className="max-w-full max-h-full object-contain" /> : <ExternalLink className="text-slate-300 w-4 h-4" />}
                    </div>
                    <label className="block">
                        <input type="file" className="block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" onChange={e => handleUpload(e, 'faviconUrl')} />
                    </label>
                </div>
            </div>

            <div className="space-y-3">
                <Label>Logo Style</Label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['both', 'icon', 'wide', 'text'].map((s: any) => (
                        <button
                            key={s}
                            onClick={() => update({ logoStyle: s })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${config.logoStyle === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ColorsEditor = ({ config, update }: { config: BrandKit, update: any }) => (
    <div className="space-y-6">
        <ColorInput label="Primary" value={config.colors.primary} onChange={(v: string) => update({ colors: { ...config.colors, primary: v } })} />
        <ColorInput label="Secondary" value={config.colors.secondary} onChange={(v: string) => update({ colors: { ...config.colors, secondary: v } })} />
    </div>
);

const TypographyEditor = ({ config, update }: { config: BrandKit, update: any }) => (
    <div className="space-y-4">
        <div className="space-y-2">
            <Label>Font Family</Label>
            <select
                value={config.typography.fontFamily}
                onChange={e => update({ typography: { ...config.typography, fontFamily: e.target.value } })}
                className="w-full text-sm border-slate-300 shadow-sm rounded-md p-2 focus:ring-[var(--brand-primary)]"
            >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
                <option value="Poppins">Poppins</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Outfit">Outfit</option>
            </select>
            <p className="text-[10px] text-slate-400">Dynamically loaded from Google Fonts</p>
        </div>
    </div>
);

const UIEditor = ({ config, update }: { config: BrandKit, update: any }) => (
    <div className="space-y-6">
        <Slider
            label={`Corner Radius: ${config.shape.radius}px`}
            min={0} max={24} value={config.shape.radius}
            onChange={e => update({ shape: { ...config.shape, radius: Number(e.target.value) } })}
        />

        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Glassmorphism</span>
            <Switch checked={config.ui.glassmorphism} onCheckedChange={c => update({ ui: { ...config.ui, glassmorphism: c } })} />
        </div>

        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
            <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">Beveled Buttons</span>
                <span className="text-[10px] text-slate-500">Add depth and borders to buttons</span>
            </div>
            <Switch
                checked={config.ui.buttonStyle === 'beveled'}
                onCheckedChange={c => update({ ui: { ...config.ui, buttonStyle: c ? 'beveled' : 'flat' } })}
            />
        </div>

        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
            <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">Show Beta Badge</span>
                <span className="text-[10px] text-slate-500">Display the BETA chip next to logo</span>
            </div>
            <Switch
                checked={config.ui.showBeta ?? true}
                onCheckedChange={c => update({ ui: { ...config.ui, showBeta: c } })}
            />
        </div>
    </div>
);

const AIEditor = ({ config, update }: { config: BrandKit, update: any }) => (
    <div className="space-y-6">
        <div className="space-y-3">
            <Label>Gemini API Key</Label>
            <div className="relative">
                <Input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={e => update({ apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="pr-10"
                />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
                Your key is stored locally in your browser and used directly to communicate with Google's API.
                It is never sent to our servers.
            </p>
            <div className="pt-2">
                <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-primary)] hover:underline font-medium"
                >
                    Get a Gemini API Key <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </div>

        <div className="p-4 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-lg">
            <h4 className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-primary)] mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Why use your own key?
            </h4>
            <ul className="space-y-2">
                <li className="flex gap-2 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    <span>Higher rate limits and quotas</span>
                </li>
                <li className="flex gap-2 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    <span>Control over your own billing</span>
                </li>
                <li className="flex gap-2 text-xs text-slate-600">
                    <Check className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                    <span>Access to newer models if available</span>
                </li>
            </ul>
        </div>
    </div>
);

// --- UI Helpers ---
const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
            ${active ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
    >
        {icon} {label}
    </button>
);

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase">{value}</span>
            <div className="relative w-8 h-8 rounded-md overflow-hidden border border-slate-200">
                <input type="color" value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-12 h-12 -top-2 -left-2 cursor-pointer" />
            </div>
        </div>
    </div>
);
