import React, { useEffect, useRef, useState } from 'react';
import { useFlowStore, BrandKit } from '../../store';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Slider } from '../ui/Slider';
import { Switch } from '../ui/Switch';
import { Select } from '../ui/Select';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import {
    RotateCw, Upload, Type, Palette, Box, ExternalLink,
    Plus, Trash2, Copy, Check, Edit2, ArrowLeft, LayoutTemplate, Sparkles, ChevronDown, Shield, Zap, Lock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// --- Types ---
type EditorTab = 'identity' | 'colors' | 'typography' | 'ui';

type BrandConfigUpdater = (config: Partial<BrandKit>) => void;

interface EditorProps {
    config: BrandKit;
    update: BrandConfigUpdater;
}

interface BrandListViewProps {
    onSelect: (id: string) => void;
}

interface BrandEditorViewProps {
    kitId: string;
    onBack: () => void;
}



// --- Main Component ---
export function BrandSettings(): React.ReactElement {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingKitId, setEditingKitId] = useState<string | null>(null);
    const { activeBrandKitId } = useFlowStore();

    function openEditor(id: string) {
        setEditingKitId(id);
        setView('editor');
    }

    if (view === 'list') {
        return <BrandListView onSelect={openEditor} />;
    }

    return (
        <BrandEditorView
            kitId={editingKitId ?? activeBrandKitId}
            onBack={() => setView('list')}
        />
    );
}

// --- List View ---
function BrandListView({ onSelect }: BrandListViewProps): React.ReactElement {
    const { t } = useTranslation();
    const {
        brandKits, activeBrandKitId, setActiveBrandKitId,
        addBrandKit, deleteBrandKit
    } = useFlowStore();

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100">
                <div className="p-2 bg-[var(--brand-primary)]/10 rounded-lg text-[var(--brand-primary)]">
                    <LayoutTemplate className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <h2 className="text-sm font-semibold text-slate-900">{t('settingsModal.brand.title')}</h2>
                    <p className="text-xs text-slate-500">{t('settingsModal.brand.subtitle')}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {brandKits.map(kit => {
                    const isActive = activeBrandKitId === kit.id;
                    return (
                        <div
                            key={kit.id}
                            className={`group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${isActive
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
                                    <h3 className={`text-sm font-medium ${isActive ? 'text-[var(--brand-primary)]' : 'text-slate-900'}`}>
                                        {kit.name}
                                    </h3>
                                    {isActive && (
                                        <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-primary)] uppercase tracking-wider mt-0.5">
                                            <Check className="w-3 h-3" />
                                            {t('settingsModal.brand.active')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]"
                                    title={t('settingsModal.brand.editKit')}
                                    onClick={(e) => { e.stopPropagation(); onSelect(kit.id); }}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]"
                                    title={t('common.duplicate')}
                                    onClick={(e) => { e.stopPropagation(); addBrandKit(`${kit.name} (Copy)`, kit); }}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                                {!kit.isDefault && (
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        title={t('common.delete')}
                                        onClick={(e) => { e.stopPropagation(); if (confirm(t('settingsModal.brand.deleteConfirm'))) deleteBrandKit(kit.id); }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                    className="w-full justify-center bg-[var(--brand-primary)] hover:opacity-90 text-white"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => addBrandKit(t('settingsModal.brand.newIdentity'))}
                >
                    {t('settingsModal.brand.createNewKit')}
                </Button>
            </div>
        </div>
    );
}

// Tab definitions for the editor — labels resolved at render time via t()
function editorTabs(t: (k: string) => string): { id: EditorTab; label: string; icon: React.ReactNode }[] {
    return [
        { id: 'identity', label: t('settingsModal.brand.tabIdentity'), icon: <Box className="w-3.5 h-3.5" /> },
        { id: 'colors', label: t('settingsModal.brand.tabColors'), icon: <Palette className="w-3.5 h-3.5" /> },
        { id: 'typography', label: t('settingsModal.brand.tabType'), icon: <Type className="w-3.5 h-3.5" /> },
        { id: 'ui', label: t('settingsModal.brand.tabUI'), icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
    ];
}

// --- Editor View ---
function BrandEditorView({ kitId, onBack }: BrandEditorViewProps): React.ReactElement {
    const { t } = useTranslation();
    const {
        brandKits, updateBrandKitName, setBrandConfig, activeBrandKitId,
        setActiveBrandKitId, resetBrandConfig
    } = useFlowStore();

    const kit = brandKits.find(k => k.id === kitId);
    const [activeTab, setActiveTab] = useState<EditorTab>('identity');
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Activate the kit being edited so live preview reflects changes
    useEffect(() => {
        if (activeBrandKitId !== kitId) setActiveBrandKitId(kitId);
    }, [activeBrandKitId, kitId, setActiveBrandKitId]);

    if (!kit) return <div>Kit not found</div>;

    const isLive = activeBrandKitId === kitId;

    function saveNameIfChanged() {
        const nextName = nameInputRef.current?.value?.trim() ?? '';
        if (nextName && nextName !== kit.name) {
            updateBrandKitName(kit.id, nextName);
        }
    }

    const editorMap: Record<EditorTab, React.ReactNode> = {
        identity: <IdentityEditor config={kit} update={setBrandConfig} />,
        colors: <ColorsEditor config={kit} update={setBrandConfig} />,
        typography: <TypographyEditor config={kit} update={setBrandConfig} />,
        ui: <UIEditor config={kit} update={setBrandConfig} />,
    };

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-slate-100">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full -ml-2">
                    <ArrowLeft className="w-4 h-4 text-slate-500" />
                </Button>
                <div className="flex-1">
                    <input
                        key={kit.id}
                        ref={nameInputRef}
                        className="w-full bg-transparent font-semibold text-slate-700 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--brand-primary)] rounded px-1 -ml-1 transition-all truncate"
                        defaultValue={kit.name}
                        onBlur={saveNameIfChanged}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                            {isLive ? t('settingsModal.brand.activeKit') : t('settingsModal.brand.inactive')}
                        </span>
                        {!isLive && (
                            <button
                                onClick={() => setActiveBrandKitId(kit.id)}
                                className="text-[10px] text-[var(--brand-primary)] hover:underline font-medium"
                            >
                                {t('settingsModal.brand.setActive')}
                            </button>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={resetBrandConfig} title={t('settingsModal.brand.resetToDefaults')}>
                    <RotateCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-1 bg-white border-b border-slate-100 overflow-x-auto">
                {editorTabs(t).map(tab => (
                    <TabButton
                        key={tab.id}
                        active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        icon={tab.icon}
                        label={tab.label}
                    />
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
                {editorMap[activeTab]}
            </div>
        </div>
    );
}

// --- Shared upload helper ---
interface ImageUploadFieldProps {
    label: string;
    previewUrl: string | null;
    previewSize: 'sm' | 'lg';
    placeholder: React.ReactNode;
    fieldKey: string;
    update: BrandConfigUpdater;
}

function ImageUploadField({ label, previewUrl, previewSize, placeholder, fieldKey, update }: ImageUploadFieldProps): React.ReactElement {
    const { t } = useTranslation();
    const previewClass = previewSize === 'lg' ? 'w-20 h-20' : 'w-10 h-10';

    function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => update({ [fieldKey]: reader.result as string });
        reader.readAsDataURL(file);
    }

    return (
        <div className="space-y-3">
            <Label>{label}</Label>
            <div className="flex gap-4">
                <div className={`${previewClass} bg-white rounded-lg border border-slate-200 flex items-center justify-center p-2`}>
                    {previewUrl
                        ? <img src={previewUrl} className="max-w-full max-h-full object-contain" alt={label} />
                        : placeholder
                    }
                </div>
                <div className="space-y-2">
                    <label className="block">
                        <span className="sr-only">{t('common.upload')} {label}</span>
                        <input
                            type="file"
                            className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-primary)]/10 file:text-[var(--brand-primary)] hover:file:bg-[var(--brand-primary)]/20"
                            onChange={handleUpload}
                        />
                    </label>
                    {previewUrl && (
                        <button onClick={() => update({ [fieldKey]: null })} className="text-xs text-red-500 hover:underline">
                            {t('common.delete')} {label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Identity Editor ---
function IdentityEditor({ config, update }: EditorProps): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label>{t('settingsModal.brand.appName')}</Label>
                <Input value={config.appName} onChange={e => update({ appName: e.target.value })} />
            </div>

            <ImageUploadField
                label={t('settingsModal.brand.logo')}
                previewUrl={config.logoUrl}
                previewSize="lg"
                placeholder={<Upload className="text-slate-300" />}
                fieldKey="logoUrl"
                update={update}
            />

            <ImageUploadField
                label={t('settingsModal.brand.favicon')}
                previewUrl={config.faviconUrl}
                previewSize="sm"
                placeholder={<ExternalLink className="text-slate-300 w-4 h-4" />}
                fieldKey="faviconUrl"
                update={update}
            />

            <div className="space-y-3">
                <Label>{t('settingsModal.brand.logoStyle')}</Label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {(['both', 'icon', 'wide', 'text'] as const).map((s) => (
                        <button
                            key={s}
                            onClick={() => update({ logoStyle: s })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${config.logoStyle === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ColorsEditor({ config, update }: EditorProps): React.ReactElement {
    return (
        <div className="space-y-6">
            <ColorInput
                label="Primary"
                value={config.colors.primary}
                onChange={(v: string) => update({ colors: { ...config.colors, primary: v } })}
            />
            <ColorInput
                label="Secondary"
                value={config.colors.secondary}
                onChange={(v: string) => update({ colors: { ...config.colors, secondary: v } })}
            />
        </div>
    );
}

function TypographyEditor({ config, update }: EditorProps): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>{t('settingsModal.brand.fontFamily')}</Label>
                <select
                    value={config.typography.fontFamily}
                    onChange={e => update({ typography: { ...config.typography, fontFamily: e.target.value } })}
                    className="w-full text-sm border border-slate-300 shadow-sm rounded-md p-2 focus:ring-[var(--brand-primary)] bg-white text-slate-800"
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
                <p className="text-[10px] text-slate-400">{t('settingsModal.brand.googleFontsHint')}</p>
            </div>
        </div>
    );
}

function UIEditor({ config, update }: EditorProps): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="space-y-6">
            <Slider
                label={`${t('settingsModal.brand.cornerRadius')}: ${config.shape.radius}px`}
                min={0} max={24} value={config.shape.radius}
                onChange={e => update({ shape: { ...config.shape, radius: Number(e.target.value) } })}
            />

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{t('settingsModal.brand.glassmorphism')}</span>
                <Switch checked={config.ui.glassmorphism} onCheckedChange={c => update({ ui: { ...config.ui, glassmorphism: c } })} />
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{t('settingsModal.brand.beveledButtons')}</span>
                    <span className="text-[10px] text-slate-500">{t('settingsModal.brand.beveledButtonsHint')}</span>
                </div>
                <Switch
                    checked={config.ui.buttonStyle === 'beveled'}
                    onCheckedChange={c => update({ ui: { ...config.ui, buttonStyle: c ? 'beveled' : 'flat' } })}
                />
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{t('settingsModal.brand.showBetaBadge')}</span>
                    <span className="text-[10px] text-slate-500">{t('settingsModal.brand.showBetaBadgeHint')}</span>
                </div>
                <Switch
                    checked={config.ui.showBeta ?? true}
                    onCheckedChange={c => update({ ui: { ...config.ui, showBeta: c } })}
                />
            </div>
        </div>
    );
}



// --- UI Helpers ---
interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps): React.ReactElement {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${active
                ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]/20'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
        >
            {icon} {label}
        </button>
    );
}

interface ColorInputProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps): React.ReactElement {
    return (
        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 uppercase">{value}</span>
                <div className="relative w-8 h-8 rounded-md overflow-hidden border border-slate-200">
                    <input
                        type="color"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="absolute inset-0 w-12 h-12 -top-2 -left-2 cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
}
