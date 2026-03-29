import React, { useEffect, useMemo, useState } from 'react';
import { Settings, WandSparkles, StickyNote, X, Database, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isMindmapConnectorSource } from '@/lib/connectCreationPolicy';
import { useFlowStore } from '@/store';
import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { loadDomainAssetSuggestions } from '@/services/assetCatalog';
import { getAssetCategoryDisplayName } from '@/services/assetPresentation';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import { Tooltip } from './Tooltip';
import { NamedIcon } from './IconMap';
import type { ConnectedEdgePreset } from '@/hooks/edge-operations/utils';

interface ConnectMenuProps {
    position: { x: number; y: number };
    sourceId: string;
    sourceType?: string | null;
    onSelect: (type: string, shape?: string, edgePreset?: ConnectedEdgePreset) => void;
    onSelectAsset: (item: DomainLibraryItem) => void;
    onClose: () => void;
}

interface ConnectMenuOption {
    type: string;
    shape?: string;
    edgePreset?: ConnectedEdgePreset;
    title: string;
    description: string;
    toneClassName: string;
    icon: React.ReactNode;
}

function getContextualOptions(sourceType?: string | null): ConnectMenuOption[] {
    switch (sourceType) {
        case 'class':
            return [{
                type: 'class',
                title: 'Class Node',
                description: 'Create a connected class',
                toneClassName: 'bg-sky-50 text-sky-600 border-sky-100',
                icon: <Settings className="w-4.5 h-4.5" />,
            }];
        case 'er_entity':
            return [{
                type: 'er_entity',
                title: 'Entity',
                description: 'Create a connected entity',
                toneClassName: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                icon: <Database className="w-4.5 h-4.5" />,
            }];
        case 'architecture':
            return [{
                type: 'architecture',
                title: 'Architecture Node',
                description: 'Create another architecture service',
                toneClassName: 'bg-cyan-50 text-cyan-700 border-cyan-100',
                icon: <Settings className="w-4.5 h-4.5" />,
            }];
        case 'journey':
            return [{
                type: 'journey',
                title: 'Journey Step',
                description: 'Create the next journey step',
                toneClassName: 'bg-violet-50 text-violet-600 border-violet-100',
                icon: <WandSparkles className="w-4.5 h-4.5" />,
            }];
        case 'annotation':
            return [{
                type: 'annotation',
                title: 'Note',
                description: 'Create another sticky note',
                toneClassName: 'bg-yellow-50 text-yellow-600 border-yellow-100',
                icon: <StickyNote className="w-4.5 h-4.5" />,
            }];
        case 'decision':
            return [
                {
                    type: 'process',
                    edgePreset: { label: 'Yes', data: { condition: 'yes' } },
                    title: 'Yes Branch',
                    description: 'Add the success path',
                    toneClassName: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                    icon: <Settings className="w-4.5 h-4.5" />,
                },
                {
                    type: 'process',
                    edgePreset: { label: 'No', data: { condition: 'no' } },
                    title: 'No Branch',
                    description: 'Add the alternative path',
                    toneClassName: 'bg-rose-50 text-rose-600 border-rose-100',
                    icon: <Settings className="w-4.5 h-4.5" />,
                },
            ];
        default:
            return [];
    }
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
        const suggestionPromise = loadDomainAssetSuggestions(assetProvider, {
            category: assetCategory,
            excludeIcon: currentIconName,
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
    }, [assetCategory, assetProvider, currentIconName, currentShapeId, isAssetSource, providerItemsKey]);

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
        return getAssetCategoryDisplayName(assetProvider);
    }, [assetProvider]);
    const contextualOptions = useMemo(() => getContextualOptions(sourceType), [sourceType]);
    const genericOptions = useMemo<ConnectMenuOption[]>(() => [
        {
            type: 'process',
            title: t('connectMenu.process'),
            description: t('connectMenu.processDesc'),
            toneClassName: 'bg-blue-50 text-blue-600 border-blue-100',
            icon: <Settings className="w-4.5 h-4.5" />,
        },
        {
            type: 'decision',
            title: t('connectMenu.decision'),
            description: t('connectMenu.decisionDesc'),
            toneClassName: 'bg-amber-50 text-amber-600 border-amber-100',
            icon: <WandSparkles className="w-4.5 h-4.5" />,
        },
        {
            type: 'process',
            shape: 'cylinder',
            title: t('connectMenu.database'),
            description: t('connectMenu.databaseDesc'),
            toneClassName: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            icon: <Database className="w-4.5 h-4.5" />,
        },
        {
            type: 'process',
            shape: 'parallelogram',
            title: t('connectMenu.inputOutput'),
            description: t('connectMenu.inputOutputDesc'),
            toneClassName: 'bg-violet-50 text-violet-600 border-violet-100',
            icon: <ArrowRightLeft className="w-4.5 h-4.5" />,
        },
        {
            type: 'annotation',
            title: t('connectMenu.note'),
            description: t('connectMenu.noteDesc'),
            toneClassName: 'bg-yellow-50 text-yellow-600 border-yellow-100',
            icon: <StickyNote className="w-4.5 h-4.5" />,
        },
    ], [t]);
    const menuOptions = useMemo(() => {
        const contextualKeys = new Set(
            contextualOptions.map((option) => `${option.type}:${option.shape ?? 'default'}`)
        );
        return [
            ...contextualOptions,
            ...genericOptions.filter((option) => !contextualKeys.has(`${option.type}:${option.shape ?? 'default'}`)),
        ];
    }, [contextualOptions, genericOptions]);

    function handleSelect(type: string, shape?: string, edgePreset?: ConnectedEdgePreset): void {
        onSelect(type, shape, edgePreset);
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
                className="fixed z-[70] min-w-[180px] overflow-hidden rounded-2xl border border-[var(--color-brand-border)]/80 bg-[var(--brand-surface)]/95 shadow-[var(--shadow-lg)] ring-1 ring-black/5 backdrop-blur-xl animate-in zoom-in-95 fade-in duration-150"
                style={{ top: position.y, left: position.x }}
            >
                <div className="p-1.5 space-y-0.5">
                    <div className="px-3 py-2 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-secondary)]">{t('connectMenu.createNewNode')}</p>
                    </div>

                    {isMindmapSource ? (
                        <button
                            onClick={() => handleSelect('mindmap')}
                            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--brand-text)] transition-all hover:bg-[var(--brand-background)] active:bg-[var(--brand-background)]/80"
                        >
                            <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                                <Settings className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex flex-col items-start translate-y-[1px]">
                                <span className="mb-1 font-bold leading-none text-[var(--brand-text)]">{t('nodes.mindmap', 'Topic')}</span>
                                <span className="text-[10px] font-medium text-[var(--brand-secondary)]">Create connected topic</span>
                            </div>
                        </button>
                    ) : isAssetSource && providerItems.length > 0 ? (
                        <>
                            <div className="px-3 py-2">
                                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-secondary)]">
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
                                            className="flex aspect-square items-center justify-center rounded-xl border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-2 transition-all hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                                        >
                                            {previewUrls[item.id] ? (
                                                <img src={previewUrls[item.id]} alt={`${item.label} icon`} className="h-10 w-10 object-contain" />
                                            ) : item.category === 'icons' ? (
                                                <NamedIcon name={item.icon} fallbackName="Box" className="w-5 h-5 text-[var(--brand-secondary)]" />
                                            ) : (
                                                <Database className="w-4.5 h-4.5 text-[var(--brand-secondary)]" />
                                            )}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {menuOptions.map((option) => (
                                <button
                                    key={`${option.type}:${option.shape ?? 'default'}:${option.title}`}
                                    onClick={() => handleSelect(option.type, option.shape, option.edgePreset)}
                                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--brand-text)] transition-all hover:bg-[var(--brand-background)] active:bg-[var(--brand-background)]/80"
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border group-hover:scale-110 transition-transform ${option.toneClassName}`}>
                                        {option.icon}
                                    </div>
                                    <div className="flex flex-col items-start translate-y-[1px]">
                                        <span className="mb-1 font-bold leading-none text-[var(--brand-text)]">{option.title}</span>
                                        <span className="text-[10px] font-medium text-[var(--brand-secondary)]">{option.description}</span>
                                    </div>
                                </button>
                            ))}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-[var(--color-brand-border)] bg-[var(--brand-background)]/70 px-4 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--brand-secondary)]">{t('connectMenu.releaseToConnect')}</span>
                    <button type="button" onClick={onClose} className="rounded-full p-1 text-[var(--brand-secondary)] transition-colors hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]" aria-label={t('connectMenu.close', 'Close connect menu')}>
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </>
    );
};
