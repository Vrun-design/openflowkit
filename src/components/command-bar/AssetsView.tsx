import React, { useEffect, useMemo, useState } from 'react';
import {
    Boxes,
    Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '../ui/SearchField';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { ViewHeader } from './ViewHeader';
import { AssetsIcon } from '../icons/AssetsIcon';
import { NamedIcon } from '../IconMap';
import { Tooltip } from '../Tooltip';
import { Select } from '../ui/Select';
import {
    type DomainLibraryItem,
} from '@/services/domainLibrary';
import { getDomainAssetCatalogCount } from '@/services/assetCatalog';
import { getAssetCategoryNoun } from '@/services/assetPresentation';
import { loadProviderShapePreview } from '@/services/shapeLibrary/providerCatalog';
import {
    type AssetTab,
    CLOUD_TABS,
    MAX_CLOUD_RESULTS,
    TAB_ORDER,
    getTileInnerClass,
} from './assetsViewConstants';
import { useCloudAssetCatalog } from './useCloudAssetCatalog';

interface AssetsViewProps {
    onClose: () => void;
    handleBack: () => void;
    onAddDomainLibraryItem: (item: DomainLibraryItem) => void;
}

export function AssetsView({
    onClose,
    handleBack,
    onAddDomainLibraryItem,
}: AssetsViewProps): React.ReactElement {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<AssetTab>('developer');
    const [categoryFilters, setCategoryFilters] = useState<Partial<Record<(typeof CLOUD_TABS)[number]['id'], string>>>({});
    const [pendingSelectionState, setPendingSelectionState] = useState<{ scope: string; ids: string[] }>({ scope: '', ids: [] });
    const { providerItems, providerLoadState, providerPreviewUrls, setProviderPreviewUrls, insertProviderItem } = useCloudAssetCatalog(onAddDomainLibraryItem);

    const normalizedQuery = query.trim().toLowerCase();

    const filteredCloudItems = useMemo(() => {
        return CLOUD_TABS.reduce<Record<(typeof CLOUD_TABS)[number]['id'], DomainLibraryItem[]>>((accumulator, tab) => {
            const availableItems = providerItems[tab.id] || [];

            accumulator[tab.id] = availableItems.filter((item) => {
                const selectedCategory = categoryFilters[tab.id];
                if (item.category !== tab.category) {
                    return false;
                }
                if (selectedCategory && selectedCategory !== 'all' && item.providerShapeCategory !== selectedCategory) {
                    return false;
                }
                return normalizedQuery.length === 0
                    || item.label.toLowerCase().includes(normalizedQuery)
                    || item.description.toLowerCase().includes(normalizedQuery);
            });
            return accumulator;
        }, {
            aws: [],
            azure: [],
            gcp: [],
            cncf: [],
            developer: [],
            icons: [],
        });
    }, [categoryFilters, normalizedQuery, providerItems]);

    const hasActiveFilters = normalizedQuery.length > 0 || Object.values(categoryFilters).some((value) => Boolean(value && value !== 'all'));
    const tabCounts = useMemo<Record<AssetTab, number>>(() => (
        hasActiveFilters
            ? {
                developer: filteredCloudItems.developer.length,
                aws: filteredCloudItems.aws.length,
                azure: filteredCloudItems.azure.length,
                gcp: filteredCloudItems.gcp.length,
                cncf: filteredCloudItems.cncf.length,
                icons: filteredCloudItems.icons.length,
            }
            : {
                developer: getDomainAssetCatalogCount('developer'),
                aws: getDomainAssetCatalogCount('aws'),
                azure: getDomainAssetCatalogCount('azure'),
                gcp: getDomainAssetCatalogCount('gcp'),
                cncf: getDomainAssetCatalogCount('cncf'),
                icons: getDomainAssetCatalogCount('icons'),
            }
    ), [filteredCloudItems, hasActiveFilters]);
    const tabItems = useMemo(() => TAB_ORDER.map((tab) => ({
        id: tab,
        label: tab.toUpperCase(),
        count: tabCounts[tab],
    })), [tabCounts]);

    const activeCloudTab = CLOUD_TABS.find((tab) => tab.id === activeTab);
    const activeTabItems = useMemo(
        () => (activeCloudTab ? filteredCloudItems[activeCloudTab.id] : []),
        [activeCloudTab, filteredCloudItems]
    );
    const visibleCloudItems = useMemo(
        () => (activeCloudTab ? activeTabItems.slice(0, MAX_CLOUD_RESULTS) : []),
        [activeCloudTab, activeTabItems]
    );
    const cloudItemsHiddenCount = activeCloudTab ? Math.max(activeTabItems.length - visibleCloudItems.length, 0) : 0;
    const activeCloudCategories = activeCloudTab
        ? Array.from(new Set(
            (providerItems[activeCloudTab.id] || [])
                .map((item) => item.providerShapeCategory)
                .filter((value): value is string => Boolean(value))
        )).sort((left, right) => left.localeCompare(right))
        : [];

    const selectionScope = `${activeTab}:${normalizedQuery}:${JSON.stringify(categoryFilters)}`;
    const pendingSelectionIds = pendingSelectionState.scope === selectionScope ? pendingSelectionState.ids : [];
    const pendingSelectedItems = visibleCloudItems.filter((item) => pendingSelectionIds.includes(item.id));

    useEffect(() => {
        if (!activeCloudTab || activeCloudTab.id === 'icons') {
            return;
        }

        const previewCandidates = visibleCloudItems.filter((item) => (
            item.archIconPackId && item.archIconShapeId && !providerPreviewUrls[item.id]
        ));

        if (previewCandidates.length === 0) {
            return;
        }

        let cancelled = false;
        Promise.all(previewCandidates.map(async (item) => {
            const preview = await loadProviderShapePreview(item.archIconPackId as string, item.archIconShapeId as string);
            return preview ? [item.id, preview.previewUrl] as const : null;
        }))
            .then((entries) => {
                if (cancelled) return;
                const loaded = entries.filter((e): e is readonly [string, string] => e !== null);
                if (loaded.length === 0) return;
                setProviderPreviewUrls((current) => {
                    const next = { ...current };
                    loaded.forEach(([id, url]) => { next[id] = url; });
                    return next;
                });
            })
            .catch(() => { /* ignore per-tile preview failures */ });

        return () => { cancelled = true; };
    }, [activeCloudTab, providerPreviewUrls, setProviderPreviewUrls, visibleCloudItems]);

    return (
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.06),_transparent_45%)]">
            <ViewHeader
                title={t('toolbar.assets', 'Assets')}
                icon={<AssetsIcon className="h-4 w-4 text-[var(--brand-primary)]" />}
                description="Browse reusable developer logos, cloud libraries, and icon packs."
                onBack={handleBack}
                onClose={onClose}
            />

            <div className="border-b border-[var(--color-brand-border)]/80 bg-[var(--brand-surface)]/85 px-4 py-3 backdrop-blur-sm">
                <SearchField
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    placeholder="Search developer logos, AWS services, Azure diagrams, CNCF assets, icons..."
                />

                <SegmentedTabs
                    items={tabItems}
                    value={activeTab}
                    onChange={(value) => setActiveTab(value as AssetTab)}
                    className="mt-3"
                    listClassName="flex-nowrap"
                />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {activeCloudTab ? (
                    providerLoadState[activeCloudTab.id] === 'loading' && tabCounts[activeCloudTab.id] === 0 ? (
                        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-surface)]/80 px-4 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-background)] text-[var(--brand-secondary)]">
                                <Boxes className="h-4 w-4" />
                            </div>
                            <div className="mt-3 text-sm font-medium text-[var(--brand-text)]">Loading {activeCloudTab.label}</div>
                        </div>
                    ) : tabCounts[activeCloudTab.id] > 0 ? (
                        <div className="space-y-3">
                            {activeCloudCategories.length > 1 ? (
                                <Select
                                    value={categoryFilters[activeCloudTab.id] || 'all'}
                                    onChange={(value) => setCategoryFilters((current) => ({ ...current, [activeCloudTab.id]: value }))}
                                    options={[
                                        { value: 'all', label: 'All categories' },
                                        ...activeCloudCategories.map((category) => ({ value: category, label: category })),
                                    ]}
                                    placeholder="All categories"
                                    className="w-full"
                                />
                            ) : null}
                            {pendingSelectionIds.length > 0 ? (
                                <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-3 py-2">
                                    <div className="text-xs font-medium text-[var(--brand-text)]">
                                        {pendingSelectionIds.length} asset{pendingSelectionIds.length === 1 ? '' : 's'} selected
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-xs font-semibold text-[var(--brand-secondary)] transition-colors hover:text-[var(--brand-text)]"
                                            onClick={() => setPendingSelectionState({ scope: selectionScope, ids: [] })}
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-[var(--radius-md)] bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm"
                                            onClick={async () => {
                                                for (const item of pendingSelectedItems) {
                                                    await insertProviderItem(item);
                                                }
                                                onClose();
                                            }}
                                        >
                                            Add selected
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                            <div className="grid grid-cols-6 gap-3">
                                {visibleCloudItems.map((item) => (
                                    <Tooltip key={item.id} text={item.label}>
                                        <button
                                            aria-label={item.label}
                                            onClick={async (event) => {
                                                if (event.metaKey || event.ctrlKey) {
                                                    setPendingSelectionState((current) => {
                                                        const currentIds = current.scope === selectionScope ? current.ids : [];
                                                        return {
                                                            scope: selectionScope,
                                                            ids: currentIds.includes(item.id)
                                                                ? currentIds.filter((value) => value !== item.id)
                                                                : currentIds.concat(item.id),
                                                        };
                                                    });
                                                    return;
                                                }

                                                await insertProviderItem(item);
                                                if (pendingSelectionIds.length === 0) {
                                                    onClose();
                                                }
                                            }}
                                            className={`group flex aspect-square items-center justify-center rounded-[var(--radius-lg)] border bg-[var(--brand-surface)] p-3 transition-colors hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)] ${
                                                pendingSelectionIds.includes(item.id)
                                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]'
                                                    : 'border-[var(--color-brand-border)]'
                                            }`}
                                        >
                                            <div className={getTileInnerClass()}>
                                                {providerPreviewUrls[item.id] ? (
                                                    <img src={providerPreviewUrls[item.id]} alt={`${item.label} icon`} className="h-10 w-10 object-contain" loading="lazy" />
                                                ) : (
                                                    <NamedIcon
                                                        name={item.icon}
                                                        fallbackName={activeCloudTab.id === 'icons' ? item.icon : 'Box'}
                                                        className="h-5 w-5"
                                                    />
                                                )}
                                            </div>
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                            {cloudItemsHiddenCount > 0 ? (
                                <div className="text-[11px] text-[var(--brand-secondary)]">
                                    Showing the first {MAX_CLOUD_RESULTS} {getAssetCategoryNoun(activeCloudTab.category)}. Search to narrow the pack.
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-surface)]/80 px-4 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-background)] text-[var(--brand-secondary)]">
                                <Search className="h-4 w-4" />
                            </div>
                            <div className="mt-3 text-sm font-medium text-[var(--brand-text)]">No {activeCloudTab.label} assets found</div>
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
}
