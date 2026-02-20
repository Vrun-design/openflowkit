import React, { useState, useEffect } from 'react';
import { useFlowStore, BrandKit, AIProvider } from '../../store';
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

// --- Types ---
type EditorTab = 'identity' | 'colors' | 'typography' | 'ui' | 'ai';

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

// Provider metadata
const PROVIDERS: {
    id: AIProvider;
    name: string;
    icon: string;
    color: string;
    logoPath: string;
    hint: string;
    keyPlaceholder: string;
    keyLink: string;
    keyLinkLabel: string;
    consoleName: string;
    keySetupNote: string;
    defaultModel: string;
}[] = [
        {
            id: 'gemini',
            name: 'Gemini',
            icon: '✦',
            color: '#4285F4',
            logoPath: '/logos/Gemini.svg',
            hint: 'Google · Best free tier · Multimodal',
            keyPlaceholder: 'AIzaSy...',
            keyLink: 'https://aistudio.google.com/app/apikey',
            keyLinkLabel: 'Get a Gemini API Key',
            consoleName: 'Google AI Studio',
            keySetupNote: 'Free tier available — no credit card needed',
            defaultModel: 'gemini-2.5-flash-lite',
        },
        {
            id: 'openai',
            name: 'OpenAI',
            icon: '⬡',
            color: '#10a37f',
            logoPath: '/logos/Openai.svg',
            hint: 'GPT-5 family · Industry standard',
            keyPlaceholder: 'sk-...',
            keyLink: 'https://platform.openai.com/api-keys',
            keyLinkLabel: 'Get an OpenAI API Key',
            consoleName: 'OpenAI Platform',
            keySetupNote: 'Requires a paid account and billing setup',
            defaultModel: 'gpt-5-mini',
        },
        {
            id: 'claude',
            name: 'Claude',
            icon: '◆',
            color: '#cc785c',
            logoPath: '/logos/claude.svg',
            hint: 'Anthropic · Leading reasoning model',
            keyPlaceholder: 'sk-ant-...',
            keyLink: 'https://console.anthropic.com/settings/keys',
            keyLinkLabel: 'Get a Claude API Key',
            consoleName: 'Anthropic Console',
            keySetupNote: 'Requires a paid account ($5 min credit top-up)',
            defaultModel: 'claude-sonnet-4-6',
        },
        {
            id: 'groq',
            name: 'Groq',
            icon: '⚡',
            color: '#f55036',
            logoPath: '/logos/Groq.svg',
            hint: 'Blazing fast · Generous free tier · Llama 4',
            keyPlaceholder: 'gsk_...',
            keyLink: 'https://console.groq.com/keys',
            keyLinkLabel: 'Get a Groq API Key',
            consoleName: 'Groq Console',
            keySetupNote: 'Free tier available — no credit card needed',
            defaultModel: 'meta-llama/llama-4-scout-17b-16e-instruct',
        },
        {
            id: 'nvidia',
            name: 'NVIDIA',
            icon: '▶',
            color: '#76b900',
            logoPath: '/logos/Nvidia.svg',
            hint: 'NIM · Kimi-V2.5 · Frontier models',
            keyPlaceholder: 'nvapi-...',
            keyLink: 'https://build.nvidia.com',
            keyLinkLabel: 'Get an NVIDIA API Key',
            consoleName: 'NVIDIA Build',
            keySetupNote: 'Free credits included with a new account',
            defaultModel: 'meta/llama-4-scout-17b-16e-instruct',
        },
        {
            id: 'cerebras',
            name: 'Cerebras',
            icon: '🧠',
            color: '#7c3aed',
            logoPath: '/logos/cerebras.svg',
            hint: '2,400 tok/s · Qwen 3 235B · WSE-3 speed',
            keyPlaceholder: 'csk-...',
            keyLink: 'https://cloud.cerebras.ai',
            keyLinkLabel: 'Get a Cerebras API Key',
            consoleName: 'Cerebras Cloud',
            keySetupNote: 'Free tier available — no credit card needed',
            defaultModel: 'gpt-oss-120b',
        },
        {
            id: 'mistral',
            name: 'Mistral',
            icon: '▣',
            color: '#FF7000',
            logoPath: '/logos/Mistral.svg',
            hint: 'Le Chat · Codestral · European AI leader',
            keyPlaceholder: 'your-mistral-key...',
            keyLink: 'https://console.mistral.ai/api-keys',
            keyLinkLabel: 'Get a Mistral API Key',
            consoleName: 'Mistral Console (La Plateforme)',
            keySetupNote: 'Free tier with generous limits — no credit card needed',
            defaultModel: 'mistral-medium-latest',
        },
        {
            id: 'custom',
            name: 'Custom',
            icon: '⚙',
            color: '#64748b',
            logoPath: '/logos/custom.svg',
            hint: 'Any OpenAI-compatible endpoint',
            keyPlaceholder: 'your-api-key',
            keyLink: '',
            keyLinkLabel: '',
            consoleName: '',
            keySetupNote: '',
            defaultModel: 'your-model-id',
        },
    ];

const PROVIDER_MODELS: Record<AIProvider, { id: string; label: string; hint: string; category: string; badge?: string }[]> = {
    gemini: [
        { id: 'gemini-2.5-flash-lite', label: '2.5 Flash Lite', hint: 'Fastest · Free tier default', category: 'Speed', badge: 'Default' },
        { id: 'gemini-2.5-flash', label: '2.5 Flash', hint: 'Best price/performance balance', category: 'Speed' },
        { id: 'gemini-2.5-pro', label: '2.5 Pro', hint: 'Best reasoning · Complex diagrams', category: 'Reasoning' },
        { id: 'gemini-3-flash', label: '3 Flash', hint: 'Frontier speed + intelligence', category: 'Legacy', badge: 'New' },
        { id: 'gemini-3-pro', label: '3 Pro', hint: 'Most powerful · Multimodal', category: 'Legacy', badge: 'New' },
    ],
    openai: [
        { id: 'gpt-5-mini', label: 'GPT-5 mini', hint: 'Fast · Cost-efficient', category: 'Speed', badge: 'Default' },
        { id: 'gpt-5', label: 'GPT-5', hint: 'Flagship model · Most capable', category: 'Flagship' },
        { id: 'gpt-5.2', label: 'GPT-5.2', hint: 'Latest update · Improved reasoning', category: 'Reasoning', badge: 'New' },
        { id: 'o4-mini', label: 'o4-mini', hint: 'Advanced reasoning · Fast', category: 'Reasoning', badge: 'Reasoning' },
        { id: 'o3', label: 'o3', hint: 'Deep reasoning · Complex tasks', category: 'Reasoning', badge: 'Reasoning' },
    ],
    claude: [
        { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Fastest · Most affordable', category: 'Speed' },
        { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', hint: 'Balanced intelligence & speed', category: 'Flagship' },
        { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', hint: 'Latest Sonnet · Best coding', category: 'Flagship', badge: 'Default' },
        { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', hint: 'Most intelligent · 1M token context', category: 'Reasoning', badge: 'Flagship' },
    ],
    groq: [
        { id: 'meta-llama/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout', hint: 'Free tier · Very fast', category: 'Speed', badge: 'Free' },
        { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', label: 'Llama 4 Maverick', hint: 'More capable · Free tier', category: 'Speed', badge: 'Free' },
        { id: 'qwen/qwen3-32b', label: 'Qwen3 32B', hint: 'Advanced reasoning · Tool use', category: 'Reasoning' },
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', hint: 'Versatile model', category: 'Performance', badge: 'Performance' },
    ],
    nvidia: [
        { id: 'meta/llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout', hint: 'Efficient · Multi-modal', category: 'Speed' },
        { id: 'nvidia/nemotron-nano-12b-v2-vl', label: 'Nemotron Nano 12B', hint: 'Lightweight · Vision-language · Fast', category: 'Speed' },
        { id: 'deepseek/deepseek-v3-2', label: 'DeepSeek-V3.2 (685B)', hint: 'Latest · GPT-5 comparable', category: 'Flagship', badge: 'New' },
        { id: 'qwen/qwq-32b', label: 'QwQ 32B', hint: 'Strong reasoning model', category: 'Reasoning' },
        { id: 'moonshotai/kimi-k2-thinking', label: 'Kimi K2 Thinking', hint: 'Advanced reasoning · Tool use', category: 'Reasoning' },
    ],
    cerebras: [
        { id: 'gpt-oss-120b', label: 'GPT-OSS 120B', hint: '120B params · Fast on WSE-3', category: 'Speed', badge: 'Default' },
        { id: 'qwen-3-32b', label: 'Qwen3 32B', hint: '2,403 tok/s · Industry fastest', category: 'Speed', badge: '🚀 Fastest' },
        { id: 'qwen-3-235b-a22b', label: 'Qwen3 235B A22B', hint: 'Flagship · Best quality', category: 'Flagship', badge: 'Flagship' },
        { id: 'zai-glm-4.7', label: 'Zai-GLM 4.7', hint: 'Advanced reasoning · Tool use', category: 'Reasoning' },
    ],
    mistral: [
        { id: 'mistral-small-latest', label: 'Mistral Small', hint: 'Fast · Cost-efficient · 32k context', category: 'Speed', badge: 'Free' },
        { id: 'mistral-medium-latest', label: 'Mistral Medium', hint: 'Balanced quality-cost · Best default', category: 'Flagship', badge: 'Default' },
        { id: 'mistral-large-latest', label: 'Mistral Large', hint: 'Most capable · 128k context · Flagship', category: 'Flagship', badge: 'Flagship' },
        { id: 'codestral-latest', label: 'Codestral', hint: 'Code-optimized · 256k context', category: 'Coding', badge: 'Code' },
        { id: 'pixtral-large-latest', label: 'Pixtral Large', hint: 'Vision + reasoning · Multimodal', category: 'Multimodal', badge: 'Vision' },
    ],
    custom: [
        { id: 'custom', label: 'Custom Model', hint: 'Enter your model ID below', category: 'Custom' },
    ],
};

const BYOK_REASONS = [
    'Your data never passes through our servers',
    'Full control over cost and rate limits',
    'Switch providers anytime without re-linking',
    'Access cutting-edge models as soon as they launch',
] as const;

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
                    <h2 className="text-sm font-semibold text-slate-900">Brand Kits</h2>
                    <p className="text-xs text-slate-500">Manage your brand identities</p>
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
                                            Active
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]"
                                    title="Edit Kit"
                                    onClick={(e) => { e.stopPropagation(); onSelect(kit.id); }}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost" size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]"
                                    title="Duplicate"
                                    onClick={(e) => { e.stopPropagation(); addBrandKit(`${kit.name} (Copy)`, kit); }}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                                {!kit.isDefault && (
                                    <Button
                                        variant="ghost" size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        title="Delete"
                                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this kit?')) deleteBrandKit(kit.id); }}
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
                    onClick={() => addBrandKit("New Identity")}
                >
                    Create New Kit
                </Button>
            </div>
        </div>
    );
}

// Tab definitions for the editor
const EDITOR_TABS: { id: EditorTab; label: string; icon: React.ReactNode }[] = [
    { id: 'identity', label: 'Identity', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'colors', label: 'Colors', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'typography', label: 'Type', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'ui', label: 'UI & Shape', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'Flowpilot', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

// --- Editor View ---
function BrandEditorView({ kitId, onBack }: BrandEditorViewProps): React.ReactElement {
    const {
        brandKits, updateBrandKitName, setBrandConfig, activeBrandKitId,
        setActiveBrandKitId, resetBrandConfig
    } = useFlowStore();

    const kit = brandKits.find(k => k.id === kitId);
    const [activeTab, setActiveTab] = useState<EditorTab>('identity');
    const [name, setName] = useState(kit?.name ?? '');

    // Sync name field when switching kits
    useEffect(() => {
        if (kit) setName(kit.name);
    }, [kit?.id]);

    // Activate the kit being edited so live preview reflects changes
    useEffect(() => {
        if (activeBrandKitId !== kitId) setActiveBrandKitId(kitId);
    }, [kitId]);

    if (!kit) return <div>Kit not found</div>;

    const isLive = activeBrandKitId === kitId;

    function saveNameIfChanged() {
        if (name.trim() !== kit!.name) updateBrandKitName(kit!.id, name);
    }

    const editorMap: Record<EditorTab, React.ReactNode> = {
        identity: <IdentityEditor config={kit} update={setBrandConfig} />,
        colors: <ColorsEditor config={kit} update={setBrandConfig} />,
        typography: <TypographyEditor config={kit} update={setBrandConfig} />,
        ui: <UIEditor config={kit} update={setBrandConfig} />,
        ai: <AIEditor config={kit} update={setBrandConfig} />,
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
                        className="w-full bg-transparent font-semibold text-slate-700 text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-[var(--brand-primary)] rounded px-1 -ml-1 transition-all truncate"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={saveNameIfChanged}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    />
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                            {isLive ? 'Active Kit' : 'Inactive'}
                        </span>
                        {!isLive && (
                            <button
                                onClick={() => setActiveBrandKitId(kit.id)}
                                className="text-[10px] text-[var(--brand-primary)] hover:underline font-medium"
                            >
                                Set Active
                            </button>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={resetBrandConfig} title="Reset to Defaults">
                    <RotateCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex p-2 gap-1 bg-white border-b border-slate-100 overflow-x-auto">
                {EDITOR_TABS.map(tab => (
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
                        <span className="sr-only">Upload {label}</span>
                        <input
                            type="file"
                            className="block w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[var(--brand-primary)]/10 file:text-[var(--brand-primary)] hover:file:bg-[var(--brand-primary)]/20"
                            onChange={handleUpload}
                        />
                    </label>
                    {previewUrl && (
                        <button onClick={() => update({ [fieldKey]: null })} className="text-xs text-red-500 hover:underline">
                            Remove {label}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Identity Editor ---
function IdentityEditor({ config, update }: EditorProps): React.ReactElement {
    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label>App Name</Label>
                <Input value={config.appName} onChange={e => update({ appName: e.target.value })} />
            </div>

            <ImageUploadField
                label="Logo"
                previewUrl={config.logoUrl}
                previewSize="lg"
                placeholder={<Upload className="text-slate-300" />}
                fieldKey="logoUrl"
                update={update}
            />

            <ImageUploadField
                label="Favicon"
                previewUrl={config.faviconUrl}
                previewSize="sm"
                placeholder={<ExternalLink className="text-slate-300 w-4 h-4" />}
                fieldKey="faviconUrl"
                update={update}
            />

            <div className="space-y-3">
                <Label>Logo Style</Label>
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
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Font Family</Label>
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
                <p className="text-[10px] text-slate-400">Dynamically loaded from Google Fonts</p>
            </div>
        </div>
    );
}

function UIEditor({ config, update }: EditorProps): React.ReactElement {
    return (
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
}

// Helper for logo with fallback
function ProviderIcon({ p, isSelected }: { p: typeof PROVIDERS[0], isSelected: boolean }) {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return <span className="text-2xl" style={{ color: isSelected ? 'var(--brand-primary)' : undefined }}>{p.icon}</span>;
    }

    if (isSelected) {
        return (
            <div
                className="w-8 h-8 bg-[var(--brand-primary)]"
                style={{
                    maskImage: `url(${p.logoPath})`,
                    WebkitMaskImage: `url(${p.logoPath})`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center',
                }}
            />
        );
    }

    return (
        <img
            src={p.logoPath}
            alt={p.name}
            className="w-8 h-8 object-contain"
            onError={() => setImgError(true)}
        />
    );
}

// --- Step helper for API key guide ---
function Step({ n, text }: { n: number; text: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-[9px] font-bold flex items-center justify-center shrink-0 mt-px">
                {n}
            </span>
            <span className="text-[11px] text-slate-600 leading-tight">{text}</span>
        </div>
    );
}

// --- AI Editor ---
function AIEditor({ config, update }: EditorProps): React.ReactElement {
    const currentProvider = config.aiProvider ?? 'gemini';
    const providerMeta = PROVIDERS.find(p => p.id === currentProvider) ?? PROVIDERS[0];
    const models = PROVIDER_MODELS[currentProvider] ?? [];
    const currentModel = config.aiModel ?? providerMeta.defaultModel;

    function selectProvider(id: AIProvider) {
        const meta = PROVIDERS.find(p => p.id === id)!;
        update({ aiProvider: id, aiModel: meta.defaultModel });
    }

    return (
        <div className="space-y-8 pb-4">
            {/* Provider Section - Logo Dock */}
            <div className="space-y-4">
                <Label>AI Provider</Label>
                {/* Fixed-size containers — inner icon scales avoids layout jerk */}
                <div className="flex items-center gap-2 overflow-x-auto px-1 py-3 no-scrollbar">
                    {PROVIDERS.map(p => {
                        const isSelected = currentProvider === p.id;

                        const buttonClass = isSelected
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/8 ring-2 ring-[var(--brand-primary)]/40 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';

                        const iconWrapperClass = isSelected
                            ? 'scale-100'
                            : 'scale-[0.7] opacity-60 group-hover:opacity-90 group-hover:scale-80';

                        const nameClass = isSelected
                            ? 'text-[var(--brand-primary)]'
                            : 'text-slate-400';

                        return (
                            <button
                                key={p.id}
                                onClick={() => selectProvider(p.id)}
                                title={p.name}
                                aria-label={`Select ${p.name} as AI provider`}
                                className={`group relative flex flex-col items-center justify-center shrink-0 w-[72px] h-[72px] rounded-2xl border transition-all duration-200 ${buttonClass}`}
                            >
                                <div className={`pointer-events-none transition-transform duration-200 ${iconWrapperClass}`}>
                                    <ProviderIcon p={p} isSelected={isSelected} />
                                </div>
                                <span className={`text-[9px] font-medium mt-0.5 leading-tight transition-colors duration-200 ${nameClass}`}>
                                    {p.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {/* Selected provider info strip */}
                <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl border border-slate-200">
                    <img src={providerMeta.logoPath} alt={providerMeta.name} className="w-6 h-6 object-contain shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800">{providerMeta.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{providerMeta.hint}</p>
                    </div>
                    {providerMeta.id === 'custom' && <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-medium text-slate-500">BYOK</span>}
                </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Config Section */}
            <div className="space-y-6">
                {/* Model Selector */}
                <div className="space-y-3">
                    <Label>Model Selection</Label>
                    {currentProvider === 'custom' ? (
                        <div className="space-y-2">
                            <Input
                                value={currentModel === 'custom' ? '' : currentModel}
                                onChange={e => update({ aiModel: e.target.value })}
                                placeholder="e.g. llama3-70b-8192 or gpt-4o"
                            />
                            <p className="text-[10px] text-slate-400">Enter the exact model ID for your endpoint</p>
                        </div>
                    ) : (
                        <Select
                            value={currentModel}
                            onChange={(val) => update({ aiModel: val })}
                            options={models.map(m => ({
                                value: m.id,
                                label: m.label,
                                hint: m.hint,
                                badge: m.badge,
                                group: m.category
                            }))}
                            placeholder="Select a model..."
                        />
                    )}
                </div>

                {/* API Key */}
                <div className="space-y-3">
                    <Label>{providerMeta.name} API Key</Label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                        </div>
                        <Input
                            type="password"
                            value={config.apiKey ?? ''}
                            onChange={e => update({ apiKey: e.target.value })}
                            placeholder={providerMeta.keyPlaceholder || `sk-...`}
                            className="pl-9 font-mono text-xs"
                        />
                    </div>

                    {/* Show setup guide only when the key is empty */}
                    {!config.apiKey && providerMeta.keyLink && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                            <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">How to get your API key</span>
                                <a
                                    href={providerMeta.keyLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-primary)] hover:underline"
                                >
                                    Open Console <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                            <div className="px-3 py-2.5 space-y-2">
                                <Step n={1} text={`Go to ${providerMeta.consoleName}`} />
                                <Step n={2} text={providerMeta.keySetupNote} />
                                <Step n={3} text="Paste it in the field above — never shared with us" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Custom Base URL */}
                {currentProvider === 'custom' && (
                    <div className="space-y-3">
                        {/* What is this? */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                            <div className="px-3 py-2 border-b border-slate-200">
                                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">What is a custom endpoint?</span>
                            </div>
                            <div className="px-3 py-2.5 space-y-1.5">
                                <p className="text-[11px] text-slate-600 leading-snug">
                                    Any <span className="font-semibold text-slate-800">OpenAI-compatible</span> API endpoint — local or remote. Great for:
                                </p>
                                <div className="grid grid-cols-3 gap-1.5 mt-2">
                                    {[
                                        { name: 'Ollama', hint: 'Local · Free' },
                                        { name: 'LM Studio', hint: 'Local · Free' },
                                        { name: 'Together.ai', hint: 'Cloud · Fast' },
                                    ].map(ex => (
                                        <div key={ex.name} className="flex flex-col items-center px-2 py-1.5 bg-white rounded-lg border border-slate-200 text-center">
                                            <span className="text-[10px] font-semibold text-slate-700">{ex.name}</span>
                                            <span className="text-[9px] text-slate-400">{ex.hint}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Label>Base URL</Label>
                        <Input
                            value={config.customBaseUrl ?? ''}
                            onChange={e => update({ customBaseUrl: e.target.value })}
                            placeholder="https://localhost:11434/v1"
                        />
                        <p className="text-[11px] text-slate-500">Must support <code className="bg-slate-100 px-1 rounded text-[10px]">POST /chat/completions</code> (OpenAI format)</p>
                    </div>
                )}
            </div>

            {/* Privacy Section - Improved Visibility */}
            <div className="pt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-slate-800">
                        <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
                        <span className="text-xs font-semibold uppercase tracking-wider">Privacy & Encryption</span>
                    </div>
                    <ul className="grid grid-cols-1 gap-2">
                        {BYOK_REASONS.map((item, i) => (
                            <li key={i} className="flex gap-2 text-[11px] text-slate-600 items-start">
                                <Check className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                <span className="leading-tight">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
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
