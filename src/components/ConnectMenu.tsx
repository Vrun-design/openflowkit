import React, { useEffect, useMemo, useState } from 'react';
import { Settings, WandSparkles, StickyNote, X, Database, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isMindmapConnectorSource } from '@/lib/connectCreationPolicy';
import { useFlowStore } from '@/store';
import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { loadProviderCatalogSuggestions, loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import { Tooltip } from './Tooltip';
import { loadIconAssetSuggestions } from '@/services/iconAssetCatalog';
import { NamedIcon } from './IconMap';

interface ConnectMenuProps {
    position: { x: number; y: number };
    sourceId: string;
    sourceType?: string | null;
    onSelect: (type: string, shape?: string) => void;
    onSelectAsset: (item: DomainLibraryItem) => void;
    onClose: () => void;
}

export const ConnectMenu = ({ position, sourceId, sourceType, onSelect, onSelectAsset, onClose }: ConnectMenuProps): React.ReactElement => {
    const { t } = useTranslation();
    const sourceNode = useFlowStore((state) => state.nodes.find((node) => node.id === sourceId));
    const isMindmapSource = isMindmapConnectorSource(sourceType);
    const isAssetSource = sourceNode?.data?.assetPresentation === 'icon'
        && typeof sourceNode.data?.assetProvider === 'string';
    const assetProvider = (sourceNode?.data?.assetProvider || null) as DomainLibraryCategory | null;
    const assetCategory = typeof sourceNode?.data?.assetCategory === 'string' ? sourceNode.data.assetCategory : undefined;
    const currentShapeId = typeof sourceNode?.data?.archIconShapeId === 'string' ? sourceNode.data.archIconShapeId : undefined;
    const currentIconName = typeof sourceNode?.data?.icon === 'string' ? sourceNode.data.icon : undefined;
    const iconSuggestions = useMemo(() => loadIconAssetSuggestions({
        category: assetCategory,
        excludeIcon: currentIconName,
        limit: 18,
    }), [assetCategory, currentIconName]);
    const providerItemsKey = isAssetSource && assetProvider
        ? `${assetProvider}:${assetCategory ?? 'all'}:${currentShapeId ?? currentIconName ?? 'all'}`
        : null;
    const [providerItemsState, setProviderItemsState] = useState<{ key: string | null; items: DomainLibraryItem[] }>({ key: null, items: [] });
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!isAssetSource || !assetProvider) {
            return;
        }

        let cancelled = false;
        const suggestionPromise = assetProvider === 'icons'
            ? Promise.resolve(iconSuggestions)
            : loadProviderCatalogSuggestions(assetProvider, {
                category: assetCategory,
                excludeShapeId: currentShapeId,
                limit: 18,
            });

        suggestionPromise.then((items) => {
            if (!cancelled) {
                setProviderItemsState({ key: providerItemsKey, items });
            }
        }).catch(() => {
            if (!cancelled) {
                setProviderItemsState({ key: providerItemsKey, items: [] });
            }
        });

        return () => {
            cancelled = true;
        };
    }, [assetCategory, assetProvider, currentShapeId, iconSuggestions, isAssetSource, providerItemsKey]);

    const providerItems = useMemo(
        () => (providerItemsState.key === providerItemsKey ? providerItemsState.items : []),
        [providerItemsKey, providerItemsState]
    );

    useEffect(() => {
        if (providerItems.length === 0) {
            return;
        }

        let cancelled = false;
        Promise.all(providerItems.map(async (item) => {
            if (!item.archIconPackId || !item.archIconShapeId || previewUrls[item.id]) {
                return null;
            }
            const preview = await loadProviderShapePreview(item.archIconPackId, item.archIconShapeId);
            return preview ? [item.id, preview.previewUrl] as const : null;
        })).then((entries) => {
            if (cancelled) {
                return;
            }
            const loadedEntries = entries.filter((entry): entry is readonly [string, string] => entry !== null);
            if (loadedEntries.length === 0) {
                return;
            }
            setPreviewUrls((current) => {
                const next = { ...current };
                loadedEntries.forEach(([itemId, previewUrl]) => {
                    next[itemId] = previewUrl;
                });
                return next;
            });
        }).catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [previewUrls, providerItems]);

    const providerTitle = useMemo(() => {
        if (!assetProvider) {
            return '';
        }
        return assetProvider.toUpperCase();
    }, [assetProvider]);

    function handleSelect(type: string, shape?: string): void {
        onSelect(type, shape);
        onClose();
    }

    function handleSelectAsset(item: DomainLibraryItem): void {
        onSelectAsset({
            ...item,
            ...(previewUrls[item.id] ? { previewUrl: previewUrls[item.id] } : {}),
        });
        onClose();
    }

    return (
        <>
            <button
                type="button"
                className="fixed inset-0 z-[60]"
                onClick={onClose}
                aria-label="Close connect menu"
            />
            <div
                className="fixed z-[70] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden min-w-[180px] animate-in zoom-in-95 fade-in duration-150 ring-1 ring-black/5"
                style={{ top: position.y, left: position.x }}
            >
                <div className="p-1.5 space-y-0.5">
                    <div className="px-3 py-2 mb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{t('connectMenu.createNewNode')}</p>
                    </div>

                    {isMindmapSource ? (
                        <button
                            onClick={() => handleSelect('mindmap')}
                            className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                        >
                            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                                <Settings className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col items-start translate-y-[1px]">
                                <span className="font-bold text-slate-700 leading-none mb-1">{t('nodes.mindmap', 'Topic')}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Create connected topic</span>
                            </div>
                        </button>
                    ) : isAssetSource && providerItems.length > 0 ? (
                        <>
                            <div className="px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                                    {providerTitle} suggestions
                                </div>
                            </div>
                            <div className="max-h-[16rem] overflow-y-auto px-3 pb-3 custom-scrollbar">
                            <div className="grid grid-cols-6 gap-2">
                                {providerItems.map((item) => (
                                    <Tooltip key={item.id} text={item.label}>
                                        <button
                                            aria-label={item.label}
                                            onClick={() => handleSelectAsset(item)}
                                            className="flex aspect-square items-center justify-center rounded-xl border border-slate-200 bg-white p-2 transition-all hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            {previewUrls[item.id] ? (
                                                <img src={previewUrls[item.id]} alt={`${item.label} icon`} className="h-10 w-10 object-contain" />
                                            ) : item.category === 'icons' ? (
                                                <NamedIcon name={item.icon} fallbackName="Box" className="w-5 h-5 text-slate-500" />
                                            ) : (
                                                <Database className="w-4.5 h-4.5 text-slate-400" />
                                            )}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => handleSelect('process')}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                            >
                                <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                                    <Settings className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex flex-col items-start translate-y-[1px]">
                                    <span className="font-bold text-slate-700 leading-none mb-1">{t('connectMenu.process')}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{t('connectMenu.processDesc')}</span>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSelect('decision')}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                            >
                                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                                    <WandSparkles className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex flex-col items-start translate-y-[1px]">
                                    <span className="font-bold text-slate-700 leading-none mb-1">{t('connectMenu.decision')}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{t('connectMenu.decisionDesc')}</span>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSelect('process', 'cylinder')}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                            >
                                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                                    <Database className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex flex-col items-start translate-y-[1px]">
                                    <span className="font-bold text-slate-700 leading-none mb-1">{t('connectMenu.database')}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{t('connectMenu.databaseDesc')}</span>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSelect('process', 'parallelogram')}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                            >
                                <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center border border-violet-100 group-hover:scale-110 transition-transform">
                                    <ArrowRightLeft className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex flex-col items-start translate-y-[1px]">
                                    <span className="font-bold text-slate-700 leading-none mb-1">{t('connectMenu.inputOutput')}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{t('connectMenu.inputOutputDesc')}</span>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSelect('annotation')}
                                className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 rounded-xl transition-all group"
                            >
                                <div className="w-9 h-9 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center border border-yellow-100 group-hover:scale-110 transition-transform">
                                    <StickyNote className="w-4.5 h-4.5" />
                                </div>
                                <div className="flex flex-col items-start translate-y-[1px]">
                                    <span className="font-bold text-slate-700 leading-none mb-1">{t('connectMenu.note')}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{t('connectMenu.noteDesc')}</span>
                                </div>
                            </button>
                        </>
                    )}
                </div>

                <div className="bg-slate-50/80 px-4 py-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{t('connectMenu.releaseToConnect')}</span>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors" aria-label={t('connectMenu.close', 'Close connect menu')}>
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </>
    );
};
