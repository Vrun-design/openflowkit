import React, { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, Shapes } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NamedIcon } from '@/components/IconMap';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import {
  searchFederatedEditorCatalogs,
  type FederatedCatalogResult,
} from '@/services/search/federatedEditorSearch';
import type { FlowTemplate } from '@/services/templates';
import type { CommandItem } from './types';

type FederatedSearchStatus = 'idle' | 'loading' | 'ready' | 'error';

interface UseFederatedCommandSearchOptions {
  readonly query: string;
  readonly onAddDomainLibraryItem?: (item: DomainLibraryItem) => void;
  readonly onSelectTemplate?: (template: FlowTemplate) => void;
}

interface FederatedCommandSearchState {
  readonly items: readonly CommandItem[];
  readonly status: FederatedSearchStatus;
}

interface CatalogState {
  readonly query: string;
  readonly results: readonly FederatedCatalogResult[];
  readonly status: FederatedSearchStatus;
}

function resultIcon(result: FederatedCatalogResult): React.ReactNode {
  if (result.kind === 'template') {
    return <LayoutTemplate className="h-4 w-4" aria-hidden="true" />;
  }
  if (result.kind === 'shape') {
    return <Shapes className="h-4 w-4" aria-hidden="true" />;
  }
  return <NamedIcon name={result.item.icon} fallbackName="Box" className="h-4 w-4" />;
}

export function useFederatedCommandSearch({
  query,
  onAddDomainLibraryItem,
  onSelectTemplate,
}: UseFederatedCommandSearchOptions): FederatedCommandSearchState {
  const { t } = useTranslation();
  const normalizedQuery = query.trim();
  const [catalogState, setCatalogState] = useState<CatalogState>({
    query: '',
    results: [],
    status: 'idle',
  });

  useEffect(() => {
    const includeAssets = Boolean(onAddDomainLibraryItem);
    const includeTemplates = Boolean(onSelectTemplate);
    if (normalizedQuery.length < 2 || (!includeAssets && !includeTemplates)) {
      return undefined;
    }

    let cancelled = false;
    setCatalogState({ query: normalizedQuery, results: [], status: 'loading' });
    void searchFederatedEditorCatalogs(normalizedQuery, {
      includeAssets,
      includeTemplates,
    }).then(
      (results) => {
        if (!cancelled) {
          setCatalogState({ query: normalizedQuery, results, status: 'ready' });
        }
      },
      () => {
        if (!cancelled) {
          setCatalogState({ query: normalizedQuery, results: [], status: 'error' });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [normalizedQuery, onAddDomainLibraryItem, onSelectTemplate]);

  return useMemo(() => {
    if (catalogState.query !== normalizedQuery) {
      return { items: [], status: normalizedQuery.length >= 2 ? 'loading' : 'idle' };
    }

    const items = catalogState.results.flatMap<CommandItem>((result) => {
      if (result.kind === 'template') {
        if (!onSelectTemplate) return [];
        return [
          {
            id: result.id,
            label: result.label,
            description: result.description,
            keywords: result.keywords,
            icon: resultIcon(result),
            badge: t('commandBar.root.sources.template', 'Template'),
            tier: 'core',
            type: 'action',
            action: () => onSelectTemplate(result.template),
          },
        ];
      }

      if (!onAddDomainLibraryItem) return [];
      return [
        {
          id: result.id,
          label: result.label,
          description: result.description,
          keywords: result.keywords,
          icon: resultIcon(result),
          badge:
            result.kind === 'shape'
              ? t('commandBar.root.sources.shape', 'Shape')
              : t('commandBar.root.sources.icon', 'Icon'),
          tier: 'core',
          type: 'action',
          action: async () => {
            const { resolveDomainLibraryItemForInsertion } =
              await import('@/services/assetCatalog');
            const item = await resolveDomainLibraryItemForInsertion(result.item);
            onAddDomainLibraryItem(item);
          },
        },
      ];
    });
    return { items, status: catalogState.status };
  }, [catalogState, normalizedQuery, onAddDomainLibraryItem, onSelectTemplate, t]);
}
