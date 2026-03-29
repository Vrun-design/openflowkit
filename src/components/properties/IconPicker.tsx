import React, { useEffect, useMemo, useState } from 'react';
import { Ban, Image as ImageIcon, Upload } from 'lucide-react';
import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { getAssetCategoryDisplayName } from '@/services/assetPresentation';
import {
    listProviderCatalogProviders,
    loadProviderCatalog,
    loadProviderShapePreview,
} from '@/services/shapeLibrary/providerCatalog';
import { useAssetCatalog } from '@/hooks/useAssetCatalog';
import { ICON_NAMES, ICON_PICKER_PRIORITY_NAMES, NamedIcon } from '../IconMap';
import { Tooltip } from '../Tooltip';
import { Select } from '../ui/Select';
import { SegmentedChoice } from './SegmentedChoice';
import { IconSearchField, IconTileScrollGrid } from './IconTilePickerPrimitives';

const DEFAULT_ICON_COUNT = 48;
const SEARCH_RESULT_COUNT = 50;
const ICON_SOURCE_OPTIONS = [
    { id: 'built-in', label: 'Built-in' },
    { id: 'provider', label: 'Provider' },
    { id: 'upload', label: 'Upload' },
] as const;
const PROVIDER_OPTIONS = listProviderCatalogProviders().map((provider) => ({
    value: provider,
    label: getAssetCategoryDisplayName(provider as DomainLibraryCategory),
}));

type IconSource = (typeof ICON_SOURCE_OPTIONS)[number]['id'];

export interface ProviderIconSelection {
    provider: DomainLibraryCategory;
    category?: string;
    packId: string;
    shapeId: string;
    previewUrl?: string;
}

interface IconPickerProps {
    selectedIcon?: string;
    customIconUrl?: string;
    selectedProvider?: DomainLibraryCategory;
    selectedProviderCategory?: string;
    selectedProviderPackId?: string;
    selectedProviderShapeId?: string;
    onSelectBuiltInIcon: (icon: string) => void;
    onSelectProviderIcon: (selection: ProviderIconSelection) => void;
    onCustomIconChange: (url?: string) => void;
}

function readFileAsDataUrl(file: File, onLoad: (result: string) => void): void {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            onLoad(reader.result);
        }
    };
    reader.readAsDataURL(file);
}

function getInitialSource(
    selectedProviderPackId: string | undefined,
    selectedProviderShapeId: string | undefined,
    customIconUrl: string | undefined
): IconSource {
    if (selectedProviderPackId && selectedProviderShapeId) {
        return 'provider';
    }
    if (customIconUrl) {
        return 'upload';
    }
    return 'built-in';
}

function inferProviderFromPackId(packId: string | undefined): DomainLibraryCategory | undefined {
    if (!packId) {
        return undefined;
    }

    const normalizedPackId = packId.toLowerCase();
    const match = PROVIDER_OPTIONS.find((option) => normalizedPackId.includes(option.value));
    return match?.value as DomainLibraryCategory | undefined;
}

function getProviderLabel(provider: DomainLibraryCategory): string {
    return getAssetCategoryDisplayName(provider);
}

export const IconPicker: React.FC<IconPickerProps> = ({
    selectedIcon,
    customIconUrl,
    selectedProvider,
    selectedProviderCategory,
    selectedProviderPackId,
    selectedProviderShapeId,
    onSelectBuiltInIcon,
    onSelectProviderIcon,
    onCustomIconChange,
}) => {
    const [iconSearch, setIconSearch] = useState('');
    const [iconSource, setIconSource] = useState<IconSource>(
        getInitialSource(selectedProviderPackId, selectedProviderShapeId, customIconUrl)
    );
    const [provider, setProvider] = useState<DomainLibraryCategory>(
        selectedProvider
        ?? inferProviderFromPackId(selectedProviderPackId)
        ?? (PROVIDER_OPTIONS[0]?.value as DomainLibraryCategory)
        ?? 'aws'
    );

    useEffect(() => {
        setIconSource(getInitialSource(selectedProviderPackId, selectedProviderShapeId, customIconUrl));
    }, [selectedProviderPackId, selectedProviderShapeId, customIconUrl]);

    useEffect(() => {
        if (selectedProvider) {
            setProvider(selectedProvider);
            return;
        }
        const inferredProvider = inferProviderFromPackId(selectedProviderPackId);
        if (inferredProvider) {
            setProvider(inferredProvider);
        }
    }, [selectedProvider, selectedProviderPackId]);

    const filteredIcons = useMemo(() => {
        const term = iconSearch.toLowerCase();

        if (!term) {
            const others = ICON_NAMES
                .filter((name) => !ICON_PICKER_PRIORITY_NAMES.includes(name))
                .slice(0, DEFAULT_ICON_COUNT);
            return [
                ...ICON_PICKER_PRIORITY_NAMES.filter((name) => ICON_NAMES.includes(name)),
                ...others,
            ];
        }

        return ICON_NAMES.filter((name) => name.toLowerCase().includes(term)).slice(0, SEARCH_RESULT_COUNT);
    }, [iconSearch]);

    const {
        items: providerItems,
        filteredItems: filteredProviderItems,
        previewUrls,
        isLoading,
        query,
        setQuery,
        category,
        setCategory,
    } = useAssetCatalog({
        provider,
        loadCatalog: loadProviderCatalog,
    });

    const providerCategories = useMemo(
        () =>
            Array.from(
                new Set(
                    providerItems
                        .map((item) => item.providerShapeCategory)
                        .filter((value): value is string => Boolean(value))
                )
            ).sort((left, right) => left.localeCompare(right)),
        [providerItems]
    );

    useEffect(() => {
        setQuery('');
        setCategory('all');
    }, [provider, setCategory, setQuery]);

    function handleCustomIconFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        readFileAsDataUrl(file, onCustomIconChange);
    }

    async function handleProviderIconSelect(item: DomainLibraryItem): Promise<void> {
        if (!item.archIconPackId || !item.archIconShapeId) {
            return;
        }

        const preview =
            previewUrls[item.id]
                ? { previewUrl: previewUrls[item.id] }
                : await loadProviderShapePreview(item.archIconPackId, item.archIconShapeId);

        onSelectProviderIcon({
            provider: item.category,
            category: item.providerShapeCategory,
            packId: item.archIconPackId,
            shapeId: item.archIconShapeId,
            previewUrl: preview?.previewUrl,
        });
    }

    const activeProviderLabel = getProviderLabel(provider);

    return (
        <div className="space-y-3">
            <SegmentedChoice
                columns={3}
                size="sm"
                selectedId={iconSource}
                onSelect={(value) => setIconSource(value as IconSource)}
                items={ICON_SOURCE_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
            />

            {iconSource === 'built-in' ? (
                <>
                    <IconSearchField
                        value={iconSearch}
                        onChange={(event) => setIconSearch(event.target.value)}
                        placeholder="Search icons..."
                    />

                    <IconTileScrollGrid>
                        <Tooltip text="No Icon" className="block w-full aspect-square">
                            <button
                                type="button"
                                onClick={() => onSelectBuiltInIcon('none')}
                                className={`
                                    h-full w-full rounded-lg p-2 transition-all
                                    flex items-center justify-center
                                    ${selectedIcon === 'none'
                                        ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                                        : 'text-[var(--brand-secondary-light)] hover:bg-[var(--brand-surface)] hover:shadow-sm'
                                    }
                                `}
                                aria-label="No Icon"
                            >
                                <Ban className="h-5 w-5" />
                            </button>
                        </Tooltip>

                        {filteredIcons.map((iconName) => (
                            <Tooltip key={iconName} text={iconName} className="block w-full aspect-square">
                                <button
                                    type="button"
                                    onClick={() => onSelectBuiltInIcon(iconName)}
                                    className={`
                                        h-full w-full rounded-lg p-2 transition-all
                                        flex items-center justify-center
                                        ${selectedIcon === iconName
                                            ? 'bg-[var(--brand-primary-100)] text-[var(--brand-primary)] ring-1 ring-[var(--brand-primary-400)]'
                                            : 'text-[var(--brand-secondary)] hover:bg-[var(--brand-surface)] hover:shadow-sm'
                                        }
                                    `}
                                    aria-label={iconName}
                                >
                                    <NamedIcon name={iconName} className="h-5 w-5" />
                                </button>
                            </Tooltip>
                        ))}
                    </IconTileScrollGrid>
                </>
            ) : null}

            {iconSource === 'provider' ? (
                <div className="space-y-3">
                    <Select
                        value={provider}
                        onChange={(value) => setProvider(value as DomainLibraryCategory)}
                        options={PROVIDER_OPTIONS}
                        placeholder="Choose provider"
                    />

                    <IconSearchField
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={`Search ${activeProviderLabel.toLowerCase()} icons...`}
                    />

                    {providerCategories.length > 1 ? (
                        <Select
                            value={category}
                            onChange={setCategory}
                            options={[
                                { value: 'all', label: 'All categories' },
                                ...providerCategories.map((option) => ({ value: option, label: option })),
                            ]}
                            placeholder="All categories"
                        />
                    ) : null}

                    <IconTileScrollGrid>
                        {isLoading ? (
                            Array.from({ length: 12 }, (_, index) => (
                                <div
                                    key={`provider-loading-${index}`}
                                    className="aspect-square animate-pulse rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)]"
                                />
                            ))
                        ) : (
                            filteredProviderItems.map((item) => {
                                const isSelected =
                                    selectedProviderPackId === item.archIconPackId
                                    && selectedProviderShapeId === item.archIconShapeId;
                                const previewUrl = previewUrls[item.id];

                                return (
                                    <Tooltip
                                        key={item.id}
                                        text={
                                            item.providerShapeCategory
                                                ? `${item.label} • ${item.providerShapeCategory}`
                                                : item.label
                                        }
                                        className="block w-full aspect-square"
                                    >
                                        <button
                                            type="button"
                                            aria-label={item.label}
                                            className={`flex h-full w-full items-center justify-center rounded-[var(--radius-md)] border p-2 transition-all ${
                                                isSelected
                                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]'
                                                    : 'border-transparent bg-transparent hover:border-[var(--color-brand-border)] hover:bg-[var(--brand-surface)]'
                                            }`}
                                            onClick={() => void handleProviderIconSelect(item)}
                                        >
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="" className="h-10 w-10 object-contain" />
                                            ) : (
                                                <ImageIcon className="h-5 w-5 text-[var(--brand-secondary-light)]" />
                                            )}
                                        </button>
                                    </Tooltip>
                                );
                            })
                        )}
                    </IconTileScrollGrid>

                    {(selectedProviderPackId && selectedProviderShapeId) || selectedProviderCategory ? (
                        <div className="rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2">
                            <div className="text-[11px] font-medium text-[var(--brand-secondary)]">
                                {selectedProvider ? getProviderLabel(selectedProvider) : activeProviderLabel}
                                {selectedProviderCategory ? ` • ${selectedProviderCategory}` : ''}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {iconSource === 'upload' ? (
                <div className="space-y-2">
                    {customIconUrl ? (
                        <div className="flex items-center gap-2 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2">
                            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[var(--color-brand-border)] bg-[var(--brand-background)]">
                                <img src={customIconUrl} alt="custom" className="h-5 w-5 object-contain" />
                            </div>
                            <span className="flex-1 text-xs text-[var(--brand-secondary)]">Uploaded icon</span>
                            <button
                                type="button"
                                onClick={() => onCustomIconChange(undefined)}
                                className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 transition-colors hover:bg-red-500/15"
                            >
                                Remove
                            </button>
                        </div>
                    ) : null}

                    <label className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--brand-radius)] border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-xs text-[var(--brand-secondary)] transition-all hover:border-[var(--brand-primary-400)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-primary)]">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{customIconUrl ? 'Replace uploaded icon' : 'Upload custom icon'}</span>
                        <input
                            type="file"
                            accept="image/svg+xml,image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleCustomIconFileChange}
                        />
                    </label>
                </div>
            ) : null}
        </div>
    );
};
