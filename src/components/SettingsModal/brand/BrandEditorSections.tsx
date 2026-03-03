import React from 'react';
import { ExternalLink, LayoutTemplate, Palette, RotateCw, Type, Upload, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import type { EditorProps, EditorTab } from './types';

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

interface ColorInputProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

interface ImageUploadFieldProps {
    label: string;
    previewUrl: string | null;
    previewSize: 'sm' | 'lg';
    placeholder: React.ReactNode;
    fieldKey: string;
    update: EditorProps['update'];
}

const FONT_OPTIONS = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Poppins',
    'Montserrat',
    'Playfair Display',
    'Outfit',
] as const;

export function getEditorTabs(t: (key: string) => string): { id: EditorTab; label: string; icon: React.ReactNode }[] {
    return [
        { id: 'identity', label: t('settingsModal.brand.tabIdentity'), icon: <Box className="w-3.5 h-3.5" /> },
        { id: 'colors', label: t('settingsModal.brand.tabColors'), icon: <Palette className="w-3.5 h-3.5" /> },
        { id: 'typography', label: t('settingsModal.brand.tabType'), icon: <Type className="w-3.5 h-3.5" /> },
        { id: 'ui', label: t('settingsModal.brand.tabUI'), icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
    ];
}

export function renderEditorTab(tab: EditorTab, props: EditorProps): React.ReactNode {
    switch (tab) {
        case 'identity':
            return <IdentityEditor {...props} />;
        case 'colors':
            return <ColorsEditor {...props} />;
        case 'typography':
            return <TypographyEditor {...props} />;
        case 'ui':
            return <UIEditor {...props} />;
        default:
            return null;
    }
}

export function TabButton({ active, onClick, icon, label }: TabButtonProps): React.ReactElement {
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

function ImageUploadField({
    label,
    previewUrl,
    previewSize,
    placeholder,
    fieldKey,
    update,
}: ImageUploadFieldProps): React.ReactElement {
    const { t } = useTranslation();
    const previewClass = previewSize === 'lg' ? 'w-20 h-20' : 'w-10 h-10';

    function handleUpload(event: React.ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];
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
                        : placeholder}
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

function IdentityEditor({ config, update }: EditorProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label>{t('settingsModal.brand.appName')}</Label>
                <Input value={config.appName} onChange={(event) => update({ appName: event.target.value })} />
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
                    {(['both', 'icon', 'wide', 'text'] as const).map((logoStyle) => (
                        <button
                            key={logoStyle}
                            onClick={() => update({ logoStyle })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${config.logoStyle === logoStyle ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                        >
                            {logoStyle}
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
                onChange={(value) => update({ colors: { ...config.colors, primary: value } })}
            />
            <ColorInput
                label="Secondary"
                value={config.colors.secondary}
                onChange={(value) => update({ colors: { ...config.colors, secondary: value } })}
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
                    onChange={(event) => update({ typography: { ...config.typography, fontFamily: event.target.value } })}
                    className="w-full text-sm border border-slate-300 shadow-sm rounded-md p-2 focus:ring-[var(--brand-primary)] bg-white text-slate-800"
                >
                    {FONT_OPTIONS.map((font) => (
                        <option key={font} value={font}>{font}</option>
                    ))}
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
                min={0}
                max={24}
                value={config.shape.radius}
                onChange={(event) => update({ shape: { ...config.shape, radius: Number(event.target.value) } })}
            />

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{t('settingsModal.brand.glassmorphism')}</span>
                <Switch checked={config.ui.glassmorphism} onCheckedChange={(checked) => update({ ui: { ...config.ui, glassmorphism: checked } })} />
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{t('settingsModal.brand.beveledButtons')}</span>
                    <span className="text-[10px] text-slate-500">{t('settingsModal.brand.beveledButtonsHint')}</span>
                </div>
                <Switch
                    checked={config.ui.buttonStyle === 'beveled'}
                    onCheckedChange={(checked) => update({ ui: { ...config.ui, buttonStyle: checked ? 'beveled' : 'flat' } })}
                />
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{t('settingsModal.brand.showBetaBadge')}</span>
                    <span className="text-[10px] text-slate-500">{t('settingsModal.brand.showBetaBadgeHint')}</span>
                </div>
                <Switch
                    checked={config.ui.showBeta ?? true}
                    onCheckedChange={(checked) => update({ ui: { ...config.ui, showBeta: checked } })}
                />
            </div>
        </div>
    );
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
                        onChange={(event) => onChange(event.target.value)}
                        className="absolute inset-0 w-12 h-12 -top-2 -left-2 cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
}
