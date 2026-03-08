import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrandKitActions, useBrandKitById, useBrandKitCatalog } from '@/store/brandHooks';
import { Button } from '@/components/ui/Button';
import { getEditorTabs, renderEditorTab, TabButton } from './BrandEditorSections';
import type { EditorTab } from './types';

interface BrandEditorViewProps {
    kitId: string;
    onBack: () => void;
}

export function BrandEditorView({ kitId, onBack }: BrandEditorViewProps): React.ReactElement {
    const { t } = useTranslation();
    const { brandKits, activeBrandKitId } = useBrandKitCatalog();
    const { updateBrandKitName, setBrandConfig, setActiveBrandKitId, resetBrandConfig } = useBrandKitActions();

    const [activeTab, setActiveTab] = useState<EditorTab>('identity');
    const nameInputRef = useRef<HTMLInputElement>(null);
    const kit = useBrandKitById(kitId);

    useEffect(() => {
        if (activeBrandKitId !== kitId) {
            setActiveBrandKitId(kitId);
        }
    }, [activeBrandKitId, kitId, setActiveBrandKitId]);

    if (!kit) {
        return <div>Kit not found</div>;
    }

    const isLive = activeBrandKitId === kitId;

    function saveNameIfChanged(): void {
        const nextName = nameInputRef.current?.value?.trim() ?? '';
        if (nextName && nextName !== kit.name) {
            updateBrandKitName(kit.id, nextName);
        }
    }

    return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-200">
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
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.currentTarget.blur();
                            }
                        }}
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
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400"
                    onClick={resetBrandConfig}
                    title={t('settingsModal.brand.resetToDefaults')}
                >
                    <RotateCw className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex p-2 gap-1 bg-white border-b border-slate-100 overflow-x-auto">
                {getEditorTabs(t).map((tab) => (
                    <TabButton
                        key={tab.id}
                        active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        icon={tab.icon}
                        label={tab.label}
                    />
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
                {renderEditorTab(activeTab, { config: kit, update: setBrandConfig })}
            </div>
        </div>
    );
}
