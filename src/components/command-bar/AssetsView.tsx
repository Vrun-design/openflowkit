import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AppWindow,
    Boxes,
    Component,
    GitBranch,
    Group,
    Image as ImageIcon,
    LayoutList,
    Search,
    Smartphone,
    StickyNote,
    Table2,
    Type,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/Input';
import { ViewHeader } from './ViewHeader';
import { AssetsIcon } from '../icons/AssetsIcon';
import { NamedIcon } from '../IconMap';
import { Tooltip } from '../Tooltip';
import { Select } from '../ui/Select';
import {
    DOMAIN_LIBRARY_ITEMS,
    type DomainLibraryCategory,
    type DomainLibraryItem,
} from '@/services/domainLibrary';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import {
    getProviderCatalogCount,
    loadProviderCatalog,
    loadProviderShapePreview,
} from '@/services/shapeLibrary/providerCatalog';
import { loadIconAssetCatalog } from '@/services/iconAssetCatalog';

interface AssetsViewProps {
    onClose: () => void;
    handleBack: () => void;
    onAddAnnotation: () => void;
    onAddSection: () => void;
    onAddText: () => void;
    onAddJourney: () => void;
    onAddMindmap: () => void;
    onAddArchitecture: () => void;
    onAddImage: (imageUrl: string) => void;
    onAddBrowserWireframe: () => void;
    onAddMobileWireframe: () => void;
    onAddClassNode: () => void;
    onAddEntityNode: () => void;
    onAddDomainLibraryItem: (item: DomainLibraryItem) => void;
}

type AssetTab = 'general' | 'icons' | 'aws' | 'azure' | 'gcp' | 'cncf';

interface GeneralAssetItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    keywords: string[];
    action: () => void;
}

interface CloudTabDefinition {
    id: Extract<AssetTab, 'icons' | 'aws' | 'azure' | 'gcp' | 'cncf'>;
    label: string;
    category: DomainLibraryCategory;
}

const TAB_ORDER: AssetTab[] = ['general', 'icons', 'aws', 'azure', 'gcp', 'cncf'];

const CLOUD_TABS: CloudTabDefinition[] = [
    { id: 'icons', label: 'Icons', category: 'icons' },
    { id: 'aws', label: 'AWS', category: 'aws' },
    { id: 'azure', label: 'Azure', category: 'azure' },
    { id: 'gcp', label: 'GCP', category: 'gcp' },
    { id: 'cncf', label: 'CNCF', category: 'cncf' },
];
const IMAGE_UPLOAD_INPUT_ID = 'assets-image-upload-input';
const MAX_CLOUD_RESULTS = 240;
const PROVIDER_BACKED_TABS = new Set<AssetTab>(['aws', 'azure', 'gcp', 'cncf']);

type CloudAssetState = 'idle' | 'loading' | 'ready' | 'error';

function getTileClass(): string {
    return 'group flex aspect-square flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-slate-200 bg-white px-3 py-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)] hover:shadow-md';
}

function getTabButtonClass(isActive: boolean): string {
    return `h-9 rounded-[var(--radius-md)] border px-3 text-xs font-semibold transition-colors ${
        isActive
            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
    }`;
}

export function AssetsView({
    onClose,
    handleBack,
    onAddAnnotation,
    onAddSection,
    onAddText,
    onAddJourney,
    onAddMindmap,
    onAddArchitecture,
    onAddImage,
    onAddBrowserWireframe,
    onAddMobileWireframe,
    onAddClassNode,
    onAddEntityNode,
    onAddDomainLibraryItem,
}: AssetsViewProps): React.ReactElement {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<AssetTab>('general');
    const [providerItems, setProviderItems] = useState<Partial<Record<CloudTabDefinition['id'], DomainLibraryItem[]>>>({});
    const [providerLoadState, setProviderLoadState] = useState<Partial<Record<CloudTabDefinition['id'], CloudAssetState>>>({});
    const [providerPreviewUrls, setProviderPreviewUrls] = useState<Record<string, string>>({});
    const [categoryFilters, setCategoryFilters] = useState<Partial<Record<CloudTabDefinition['id'], string>>>({});
    const [pendingSelectionState, setPendingSelectionState] = useState<{ scope: string; ids: string[] }>({ scope: '', ids: [] });
    const iconItems = useMemo(() => loadIconAssetCatalog(), []);

    const loadProviderTab = useCallback((tabId: CloudTabDefinition['id']): void => {
        if (!ROLLOUT_FLAGS.shapeLibraryV1 || tabId === 'icons') {
            return;
        }
        if (providerLoadState[tabId] === 'loading' || providerLoadState[tabId] === 'ready') {
            return;
        }

        setProviderLoadState((current) => ({ ...current, [tabId]: 'loading' }));
        loadProviderCatalog(tabId)
            .then((items) => {
                setProviderItems((current) => ({ ...current, [tabId]: items }));
                setProviderLoadState((current) => ({ ...current, [tabId]: 'ready' }));
            })
            .catch(() => {
                setProviderLoadState((current) => ({ ...current, [tabId]: 'error' }));
            });
    }, [providerLoadState]);

    function requestImageUpload(): void {
        document.getElementById(IMAGE_UPLOAD_INPUT_ID)?.click();
    }

    function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const imageUrl = loadEvent.target?.result as string | undefined;
            if (!imageUrl) {
                return;
            }
            onAddImage(imageUrl);
            onClose();
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    const generalItems: GeneralAssetItem[] = [
        {
            id: 'sticky-note',
            label: t('toolbar.stickyNote', 'Sticky Note'),
            icon: <StickyNote className="h-5 w-5" />,
            keywords: ['sticky note', 'note', 'comment', 'annotation'],
            action: () => {
                onAddAnnotation();
                onClose();
            },
        },
        {
            id: 'text',
            label: t('toolbar.text', 'Text'),
            icon: <Type className="h-5 w-5" />,
            keywords: ['text', 'label', 'heading'],
            action: () => {
                onAddText();
                onClose();
            },
        },
        {
            id: 'section',
            label: t('toolbar.section', 'Section'),
            icon: <Group className="h-5 w-5" />,
            keywords: ['section', 'group', 'container'],
            action: () => {
                onAddSection();
                onClose();
            },
        },
        {
            id: 'journey',
            label: 'Journey',
            icon: <GitBranch className="h-5 w-5" />,
            keywords: ['journey', 'user flow', 'experience'],
            action: () => {
                onAddJourney();
                onClose();
            },
        },
        {
            id: 'mindmap',
            label: 'Mindmap',
            icon: <Component className="h-5 w-5" />,
            keywords: ['mindmap', 'topic', 'brainstorm'],
            action: () => {
                onAddMindmap();
                onClose();
            },
        },
        {
            id: 'architecture',
            label: 'Architecture',
            icon: <Boxes className="h-5 w-5" />,
            keywords: ['architecture', 'service', 'system'],
            action: () => {
                onAddArchitecture();
                onClose();
            },
        },
        {
            id: 'image',
            label: t('toolbar.image', 'Image'),
            icon: <ImageIcon className="h-5 w-5" />,
            keywords: ['image', 'media', 'upload', 'screenshot'],
            action: requestImageUpload,
        },
        {
            id: 'class',
            label: 'Class',
            icon: <LayoutList className="h-5 w-5" />,
            keywords: ['class', 'uml', 'object', 'oop'],
            action: () => {
                onAddClassNode();
                onClose();
            },
        },
        {
            id: 'entity',
            label: 'Entity',
            icon: <Table2 className="h-5 w-5" />,
            keywords: ['entity', 'er', 'erd', 'table', 'database', 'schema'],
            action: () => {
                onAddEntityNode();
                onClose();
            },
        },
        {
            id: 'browser',
            label: 'Browser',
            icon: <AppWindow className="h-5 w-5" />,
            keywords: ['browser', 'desktop', 'wireframe', 'web'],
            action: () => {
                onAddBrowserWireframe();
                onClose();
            },
        },
        {
            id: 'mobile',
            label: 'Mobile',
            icon: <Smartphone className="h-5 w-5" />,
            keywords: ['mobile', 'device', 'wireframe', 'app'],
            action: () => {
                onAddMobileWireframe();
                onClose();
            },
        },
    ];

    const normalizedQuery = query.trim().toLowerCase();

    useEffect(() => {
        CLOUD_TABS.forEach((tab) => loadProviderTab(tab.id));
    }, [loadProviderTab]);
    const filteredGeneralItems = generalItems.filter((item) => (
        normalizedQuery.length === 0
        || item.label.toLowerCase().includes(normalizedQuery)
        || item.keywords.some((keyword) => keyword.includes(normalizedQuery))
    ));

    const filteredCloudItems = useMemo(() => {
        return CLOUD_TABS.reduce<Record<CloudTabDefinition['id'], DomainLibraryItem[]>>((accumulator, tab) => {
            const availableItems = DOMAIN_LIBRARY_ITEMS
                .filter((item) => item.category === tab.category && !PROVIDER_BACKED_TABS.has(tab.id))
                .concat(providerItems[tab.id] || []);

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
            icons: [],
        });
    }, [categoryFilters, normalizedQuery, providerItems]);

    const baseTabCounts: Record<AssetTab, number> = {
        general: generalItems.length,
        icons: iconItems.length,
        aws: getProviderCatalogCount('aws'),
        azure: getProviderCatalogCount('azure'),
        gcp: getProviderCatalogCount('gcp'),
        cncf: getProviderCatalogCount('cncf'),
    };

    const filteredIconItems = useMemo(() => {
        const selectedCategory = categoryFilters.icons;
        return iconItems.filter((item) => {
            if (selectedCategory && selectedCategory !== 'all' && item.providerShapeCategory !== selectedCategory) {
                return false;
            }
            return normalizedQuery.length === 0
                || item.label.toLowerCase().includes(normalizedQuery)
                || item.description.toLowerCase().includes(normalizedQuery)
                || (item.providerShapeCategory || '').toLowerCase().includes(normalizedQuery);
        });
    }, [categoryFilters.icons, iconItems, normalizedQuery]);

    const hasActiveFilters = normalizedQuery.length > 0 || Object.values(categoryFilters).some((value) => Boolean(value && value !== 'all'));
    const tabCounts: Record<AssetTab, number> = hasActiveFilters
        ? {
            general: filteredGeneralItems.length,
            icons: filteredIconItems.length,
            aws: filteredCloudItems.aws.length,
            azure: filteredCloudItems.azure.length,
            gcp: filteredCloudItems.gcp.length,
            cncf: filteredCloudItems.cncf.length,
        }
        : baseTabCounts;

    const activeCloudTab = CLOUD_TABS.find((tab) => tab.id === activeTab);
    const activeTabItems = useMemo(() => (
        activeCloudTab
            ? activeCloudTab.id === 'icons'
                ? filteredIconItems
                : filteredCloudItems[activeCloudTab.id]
            : []
    ), [activeCloudTab, filteredCloudItems, filteredIconItems]);
    const visibleCloudItems = useMemo(
        () => (activeCloudTab ? activeTabItems.slice(0, MAX_CLOUD_RESULTS) : []),
        [activeCloudTab, activeTabItems]
    );
    const cloudItemsHiddenCount = activeCloudTab ? Math.max(activeTabItems.length - visibleCloudItems.length, 0) : 0;
    const activeCloudCategories = activeCloudTab
        ? Array.from(new Set(
            (activeCloudTab.id === 'icons' ? iconItems : (providerItems[activeCloudTab.id] || []))
                .map((item) => item.providerShapeCategory)
                .filter((value): value is string => Boolean(value))
        )).sort((left, right) => left.localeCompare(right))
        : [];

    const selectionScope = `${activeTab}:${normalizedQuery}:${JSON.stringify(categoryFilters)}`;
    const pendingSelectionIds = pendingSelectionState.scope === selectionScope ? pendingSelectionState.ids : [];
    const pendingSelectedItems = visibleCloudItems.filter((item) => pendingSelectionIds.includes(item.id));

    async function insertProviderItem(item: DomainLibraryItem): Promise<void> {
        const preview = item.archIconPackId && item.archIconShapeId
            ? await loadProviderShapePreview(item.archIconPackId, item.archIconShapeId)
            : null;
        onAddDomainLibraryItem({
            ...item,
            ...(preview ? { previewUrl: preview.previewUrl } : {}),
        });
    }

    useEffect(() => {
        if (!ROLLOUT_FLAGS.shapeLibraryV1 || !activeCloudTab || activeCloudTab.id === 'icons') {
            return;
        }

        const previewCandidates = visibleCloudItems.filter((item) => (
            item.archIconPackId
            && item.archIconShapeId
            && !providerPreviewUrls[item.id]
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
                if (cancelled) {
                    return;
                }
                const loadedEntries = entries.filter((entry): entry is readonly [string, string] => entry !== null);
                if (loadedEntries.length === 0) {
                    return;
                }
                setProviderPreviewUrls((current) => {
                    const next = { ...current };
                    loadedEntries.forEach(([itemId, previewUrl]) => {
                        next[itemId] = previewUrl;
                    });
                    return next;
                });
            })
            .catch(() => {
                // Ignore per-tile preview failures and keep fallback icons.
            });

        return () => {
            cancelled = true;
        };
    }, [activeCloudTab, providerPreviewUrls, visibleCloudItems]);

    return (
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.06),_transparent_45%)]">
            <input
                id={IMAGE_UPLOAD_INPUT_ID}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
            />

            <ViewHeader
                title={t('toolbar.assets', 'Assets')}
                icon={<AssetsIcon className="h-4 w-4 text-[var(--brand-primary)]" />}
                onBack={handleBack}
            />

            <div className="border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-sm">
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={(event) => event.stopPropagation()}
                        placeholder="Search assets, icons, AWS services, Azure diagrams..."
                        className="w-full pl-10 focus:border-[var(--brand-primary-400)]"
                    />
                </div>

                <div className="mt-3 overflow-x-auto pb-1 no-scrollbar">
                    <div className="flex min-w-max flex-nowrap gap-1.5">
                        {TAB_ORDER.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`${getTabButtonClass(activeTab === tab)} shrink-0 whitespace-nowrap px-3`}
                            >
                                {tab.toUpperCase()}
                                <span className={`ml-2 text-[10px] ${activeTab === tab ? 'text-white/75' : 'text-slate-400'}`}>
                                    {tabCounts[tab]}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                {activeTab === 'general' ? (
                    filteredGeneralItems.length > 0 ? (
                        <div className="grid grid-cols-4 gap-3">
                            {filteredGeneralItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={item.action}
                                    className={getTileClass()}
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:border-[var(--brand-primary-200)] group-hover:bg-white group-hover:text-[var(--brand-primary)]">
                                        {item.icon}
                                    </div>
                                    <div className="text-xs font-semibold text-slate-700 group-hover:text-[var(--brand-primary-900)]">
                                        {item.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[var(--radius-lg)] border border-dashed border-slate-200 bg-white/80 px-4 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Search className="h-4 w-4" />
                            </div>
                            <div className="mt-3 text-sm font-medium text-slate-600">No general assets found</div>
                        </div>
                    )
                ) : activeCloudTab ? (
                    providerLoadState[activeCloudTab.id] === 'loading' && tabCounts[activeCloudTab.id] === 0 ? (
                        <div className="rounded-[var(--radius-lg)] border border-dashed border-slate-200 bg-white/80 px-4 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Boxes className="h-4 w-4" />
                            </div>
                            <div className="mt-3 text-sm font-medium text-slate-600">Loading {activeCloudTab.label} asset pack</div>
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
                                    <div className="text-xs font-medium text-slate-700">
                                        {pendingSelectionIds.length} asset{pendingSelectionIds.length === 1 ? '' : 's'} selected
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
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
                                        className={`group flex aspect-square items-center justify-center rounded-[var(--radius-lg)] border bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)] hover:shadow-md ${
                                            pendingSelectionIds.includes(item.id)
                                                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)] shadow-md'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 text-slate-600 transition-colors group-hover:border-[var(--brand-primary-200)] group-hover:bg-white group-hover:text-[var(--brand-primary)]">
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
                                <div className="text-[11px] text-slate-500">
                                    Showing the first {MAX_CLOUD_RESULTS} icons. Search to narrow the pack.
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="rounded-[var(--radius-lg)] border border-dashed border-slate-200 bg-white/80 px-4 py-10 text-center">
                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                <Search className="h-4 w-4" />
                            </div>
                            <div className="mt-3 text-sm font-medium text-slate-600">No {activeCloudTab.label} assets found</div>
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
}
