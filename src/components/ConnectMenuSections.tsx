import React from 'react';
import { Database, Settings } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { NamedIcon } from './IconMap';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import type { ConnectedEdgePreset } from '@/hooks/edge-operations/utils';

export interface ConnectMenuOption {
  type: string;
  shape?: string;
  edgePreset?: ConnectedEdgePreset;
  title: string;
  description: string;
  toneClassName: string;
  icon: React.ReactNode;
}

interface MindmapConnectSectionProps {
  title: string;
  description: string;
  onSelect: () => void;
}

export function MindmapConnectSection({
  title,
  description,
  onSelect,
}: MindmapConnectSectionProps): React.ReactElement {
  return (
    <button
      role="menuitem"
      onClick={onSelect}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[var(--brand-text)] transition-all hover:bg-[var(--brand-background)] active:bg-[var(--brand-background)]/80"
    >
      <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
        <Settings className="w-4.5 h-4.5" />
      </div>
      <div className="flex flex-col items-start translate-y-[1px]">
        <span className="mb-1 font-bold leading-none text-[var(--brand-text)]">{title}</span>
        <span className="text-[10px] font-medium text-[var(--brand-secondary)]">{description}</span>
      </div>
    </button>
  );
}

interface ProviderSuggestionsSectionProps {
  title: string;
  items: DomainLibraryItem[];
  previewUrls: Record<string, string>;
  onSelectAsset: (item: DomainLibraryItem) => void;
}

export function ProviderSuggestionsSection({
  title,
  items,
  previewUrls,
  onSelectAsset,
}: ProviderSuggestionsSectionProps): React.ReactElement {
  return (
    <>
      <div className="px-3 py-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--brand-secondary)]">
          {title}
        </div>
      </div>
      <div className="max-h-[16rem] overflow-y-auto px-3 pb-3 custom-scrollbar">
        <div className="grid grid-cols-6 gap-2">
          {items.map((item) => (
            <Tooltip key={item.id} text={item.label}>
              <button
                role="menuitem"
                aria-label={item.label}
                onClick={() => onSelectAsset(item)}
                className="flex aspect-square items-center justify-center rounded-xl border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-2 transition-all hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
              >
                {previewUrls[item.id] ? (
                  <img
                    src={previewUrls[item.id]}
                    alt={`${item.label} icon`}
                    className="h-10 w-10 object-contain"
                  />
                ) : item.category === 'icons' ? (
                  <NamedIcon
                    name={item.icon}
                    fallbackName="Box"
                    className="w-5 h-5 text-[var(--brand-secondary)]"
                  />
                ) : (
                  <Database className="w-4.5 h-4.5 text-[var(--brand-secondary)]" />
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>
    </>
  );
}

interface GenericConnectOptionsSectionProps {
  options: ConnectMenuOption[];
  onSelect: (type: string, shape?: string, edgePreset?: ConnectedEdgePreset) => void;
}

export function GenericConnectOptionsSection({
  options,
  onSelect,
}: GenericConnectOptionsSectionProps): React.ReactElement {
  return (
    <>
      {options.map((option) => (
        <button
          role="menuitem"
          key={`${option.type}:${option.shape ?? 'default'}:${option.title}`}
          onClick={() => onSelect(option.type, option.shape, option.edgePreset)}
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
  );
}
