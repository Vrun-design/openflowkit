import React from 'react';
import type { NodeData } from '@/lib/types';
import type { DomainLibraryCategory, DomainLibraryItem } from '@/services/domainLibrary';
import { loadProviderCatalog } from '@/services/shapeLibrary/providerCatalog';
import { useAssetCatalog } from '@/hooks/useAssetCatalog';
import { createProviderIconData, createUploadedIconData } from '@/lib/nodeIconState';
import { InspectorField } from '@/components/properties/InspectorPrimitives';
import { SegmentedChoice } from '@/components/properties/SegmentedChoice';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Tooltip } from '@/components/Tooltip';
import { Image as ImageIcon, Upload } from 'lucide-react';
import {
  IconSearchField,
  IconTileScrollGrid,
} from '@/components/properties/IconTilePickerPrimitives';

interface ArchitectureNodeSectionProps {
  nodeId: string;
  data: NodeData;
  onChange: (id: string, data: Partial<NodeData>) => void;
}

const PROVIDER_OPTIONS: Array<{ id: DomainLibraryCategory | 'custom'; label: string }> = [
  { id: 'aws', label: 'AWS' },
  { id: 'azure', label: 'Azure' },
  { id: 'gcp', label: 'GCP' },
  { id: 'cncf', label: 'K8s' },
  { id: 'custom', label: 'Custom' },
];

function readFileAsDataUrl(file: File, onLoad: (result: string) => void): void {
  const reader = new FileReader();
  reader.onloadend = () => {
    if (typeof reader.result === 'string') {
      onLoad(reader.result);
    }
  };
  reader.readAsDataURL(file);
}

export function ArchitectureNodeSection({
  nodeId,
  data,
  onChange,
}: ArchitectureNodeSectionProps): React.ReactElement {
  const provider = (data.archProvider || 'custom') as DomainLibraryCategory | 'custom';
  const providerLabel = provider.toUpperCase();
  const customProviderLabel =
    typeof data.archProviderLabel === 'string' ? data.archProviderLabel : '';
  const customIconUrl = typeof data.customIconUrl === 'string' ? data.customIconUrl : undefined;

  const effectiveProvider = provider === 'custom' ? null : provider;
  const {
    items: results,
    filteredItems: filteredResults,
    previewUrls,
    isLoading,
    query,
    setQuery,
    category,
    setCategory,
  } = useAssetCatalog({
    provider: effectiveProvider,
    loadCatalog: loadProviderCatalog,
  });

  const providerCategories = React.useMemo(
    () =>
      Array.from(
        new Set(
          results
            .map((item) => item.providerShapeCategory)
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [results]
  );
  const hasProviderCategories = providerCategories.length > 1;

  function applySuggestion(item: DomainLibraryItem): void {
    onChange(nodeId, {
      label: item.label,
      subLabel: item.providerShapeCategory || item.description,
      archProvider: item.category,
      archProviderLabel: undefined,
      archResourceType: 'service',
      ...(
        item.archIconPackId && item.archIconShapeId
          ? createProviderIconData({
              packId: item.archIconPackId,
              shapeId: item.archIconShapeId,
              provider: item.category,
              category: item.providerShapeCategory,
            })
          : createUploadedIconData(undefined)
      ),
    });
  }

  function handleCustomIconChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    readFileAsDataUrl(file, (result) => {
      onChange(nodeId, createUploadedIconData(result));
    });
  }

  function handleProviderSelect(value: string): void {
    if (value === 'custom') {
      onChange(nodeId, {
        archProvider: value,
        archIconPackId: undefined,
        archIconShapeId: undefined,
        icon: undefined,
      });
      return;
    }

    onChange(nodeId, {
      archProvider: value as DomainLibraryCategory,
      archProviderLabel: undefined,
      customIconUrl: undefined,
    });
  }

  function getItemTooltipText(item: DomainLibraryItem): string {
    return item.providerShapeCategory
      ? `${item.label} • ${item.providerShapeCategory}`
      : item.label;
  }

  return (
    <div className="space-y-4">
      <InspectorField label="Provider">
        <SegmentedChoice
          columns={3}
          size="sm"
          selectedId={provider}
          onSelect={handleProviderSelect}
          items={PROVIDER_OPTIONS.map((option) => ({ id: option.id, label: option.label }))}
        />
      </InspectorField>

      {provider === 'custom' ? (
        <InspectorField label="Custom Provider" helper="Name the provider. Icon is optional.">
          <div className="space-y-2 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] p-3">
            <Input
              value={customProviderLabel}
              onChange={(event) => onChange(nodeId, { archProviderLabel: event.target.value })}
              placeholder="Provider name, e.g. Hetzner"
            />

            {customIconUrl ? (
              <div className="flex items-center gap-3 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]">
                  <img
                    src={customIconUrl}
                    alt="Custom provider icon"
                    className="h-5 w-5 object-contain"
                  />
                </div>
                <span className="flex-1 text-xs font-medium text-[var(--brand-secondary)]">
                  Custom icon added
                </span>
                <label className="cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-brand-border)] px-2.5 py-1 text-xs font-medium text-[var(--brand-secondary)] transition-colors hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]">
                  Replace
                  <input
                    type="file"
                    accept="image/svg+xml,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleCustomIconChange}
                  />
                </label>
                <button
                  type="button"
                  className="rounded-[var(--radius-sm)] border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15"
                  onClick={() => onChange(nodeId, { customIconUrl: undefined })}
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[var(--brand-radius)] border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-xs font-medium text-[var(--brand-secondary)] transition-all hover:border-[var(--brand-primary-400)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-primary)]">
                <Upload className="h-3.5 w-3.5" />
                <span>Add provider icon</span>
                <input
                  type="file"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleCustomIconChange}
                />
              </label>
            )}
          </div>
        </InspectorField>
      ) : (
        <InspectorField
          label={`${providerLabel} service library`}
          helper="Search and pick a service to apply its name, icon, and category."
        >
          <div className="space-y-3">
            <IconSearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${providerLabel} services`}
            />

            {hasProviderCategories ? (
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

            {isLoading ? (
              <div className="grid grid-cols-6 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <div
                    key={i}
                    className="aspect-square animate-pulse rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]"
                  />
                ))}
              </div>
            ) : null}

            {!isLoading && filteredResults.length > 0 ? (
              <IconTileScrollGrid>
                {filteredResults.map((item) => {
                  const isSelected = data.archIconShapeId === item.archIconShapeId;
                  const previewUrl = previewUrls[item.id];
                  return (
                    <Tooltip
                      key={item.id}
                      text={getItemTooltipText(item)}
                      className="block w-full aspect-square"
                    >
                      <button
                        type="button"
                        aria-label={item.label}
                        className={`group flex h-full w-full items-center justify-center rounded-[var(--radius-md)] border p-2 transition-all ${
                          isSelected
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]'
                            : 'border-transparent bg-transparent hover:border-[var(--color-brand-border)] hover:bg-[var(--brand-surface)]'
                        }`}
                        onClick={() => applySuggestion(item)}
                      >
                        {previewUrl ? (
                          <img src={previewUrl} alt="" className="h-10 w-10 object-contain" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-[var(--brand-secondary-light)]" />
                        )}
                      </button>
                    </Tooltip>
                  );
                })}
              </IconTileScrollGrid>
            ) : null}

            {!isLoading && filteredResults.length === 0 ? (
              <div className="rounded-[var(--brand-radius)] border border-dashed border-[var(--color-brand-border)] px-3 py-4 text-center text-xs text-[var(--brand-secondary)]">
                No matching services found.
              </div>
            ) : null}
          </div>
        </InspectorField>
      )}
    </div>
  );
}
