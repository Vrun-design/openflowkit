import React, { useEffect, useMemo, useState } from 'react';
import { Settings, WandSparkles, StickyNote, X, Database, ArrowRightLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isMindmapConnectorSource } from '@/lib/connectCreationPolicy';
import { useFlowStore } from '@/store';
import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { loadDomainAssetSuggestions } from '@/services/assetCatalog';
import { getAssetCategoryDisplayName } from '@/services/assetPresentation';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import type { ConnectedEdgePreset } from '@/hooks/edge-operations/utils';
import { useMenuKeyboardNavigation } from '@/hooks/useMenuKeyboardNavigation';
import { normalizeNodeIconData } from '@/lib/nodeIconState';
import {
    type ConnectMenuOption,
    GenericConnectOptionsSection,
    MindmapConnectSection,
    ProviderSuggestionsSection,
} from './ConnectMenuSections';

interface ConnectMenuProps {
    position: { x: number; y: number };
    sourceId: string;
    sourceType?: string | null;
    onSelect: (type: string, shape?: string, edgePreset?: ConnectedEdgePreset) => void;
    onSelectAsset: (item: DomainLibraryItem) => void;
    onClose: () => void;
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
    const menuRef = React.useRef<HTMLDivElement>(null);
    const { onKeyDown } = useMenuKeyboardNavigation({ menuRef, onClose });
    const sourceNode = useFlowStore((state) => state.nodes.find((node) => node.id === sourceId));
    const normalizedIconData = normalizeNodeIconData(sourceNode?.data);
    const isMindmapSource = isMindmapConnectorSource(sourceType);
    const isAssetSource = normalizedIconData?.assetPresentation === 'icon'
        && typeof normalizedIconData.assetProvider === 'string';
    const assetProvider = (normalizedIconData?.assetProvider || null) as DomainLibraryCategory | null;
    const assetCategory = typeof normalizedIconData?.assetCategory === 'string' ? normalizedIconData.assetCategory : undefined;
    const currentShapeId = typeof normalizedIconData?.archIconShapeId === 'string' ? normalizedIconData.archIconShapeId : undefined;
    const currentIconName = typeof normalizedIconData?.icon === 'string' ? normalizedIconData.icon : undefined;
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
                tabIndex={-1}
            />
            <div
                ref={menuRef}
                role="menu"
                aria-label={t('connectMenu.label', 'Connect node menu')}
                onKeyDown={onKeyDown}
                className="fixed z-[70] min-w-[180px] overflow-hidden rounded-2xl border border-[var(--color-brand-border)]/80 bg-[var(--brand-surface)]/95 shadow-[var(--shadow-lg)] ring-1 ring-black/5 backdrop-blur-xl animate-in zoom-in-95 fade-in duration-150"
                style={{ top: position.y, left: position.x }}
            >
                <div className="p-1.5 space-y-0.5">
                    <div className="px-3 py-2 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-secondary)]">{t('connectMenu.createNewNode')}</p>
                    </div>

                    {isMindmapSource ? (
                        <MindmapConnectSection
                            title={t('nodes.mindmap', 'Topic')}
                            description="Create connected topic"
                            onSelect={() => handleSelect('mindmap')}
                        />
                    ) : isAssetSource && providerItems.length > 0 ? (
                        <ProviderSuggestionsSection
                            title={`${providerTitle} suggestions`}
                            items={providerItems}
                            previewUrls={previewUrls}
                            onSelectAsset={handleSelectAsset}
                        />
                    ) : (
                        <GenericConnectOptionsSection
                            options={menuOptions}
                            onSelect={handleSelect}
                        />
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
