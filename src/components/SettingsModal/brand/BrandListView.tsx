import React from 'react';
import { Check, Copy, Edit2, LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBrandKitActions, useBrandKitCatalog } from '@/store/brandHooks';
import { Button } from '@/components/ui/Button';

interface BrandListViewProps {
    onSelect: (id: string) => void;
}

export function BrandListView({ onSelect }: BrandListViewProps): React.ReactElement {
    const { t } = useTranslation();
    const { brandKits, activeBrandKitId } = useBrandKitCatalog();
    const { setActiveBrandKitId, addBrandKit, deleteBrandKit } = useBrandKitActions();

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
                {brandKits.map((kit) => {
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
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]"
                                    title={t('settingsModal.brand.editKit')}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onSelect(kit.id);
                                    }}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-400 hover:text-[var(--brand-primary)]"
                                    title={t('common.duplicate')}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        addBrandKit(`${kit.name} (Copy)`, kit);
                                    }}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                                {!kit.isDefault && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                                        title={t('common.delete')}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            if (confirm(t('settingsModal.brand.deleteConfirm'))) {
                                                deleteBrandKit(kit.id);
                                            }
                                        }}
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
