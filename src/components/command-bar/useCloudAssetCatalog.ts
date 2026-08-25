import { useCallback, useEffect, useState } from 'react';
import type { DomainLibraryItem } from '@/services/domainLibrary';
import {
  loadDomainAssetCatalog,
  resolveDomainLibraryItemForInsertion,
} from '@/services/assetCatalog';
import { CLOUD_TABS, type CloudAssetState, type CloudTabDefinition } from './assetsViewConstants';

export function useCloudAssetCatalog(onAddDomainLibraryItem: (item: DomainLibraryItem) => void) {
  const [providerItems, setProviderItems] = useState<
    Partial<Record<CloudTabDefinition['id'], DomainLibraryItem[]>>
  >({});
  const [providerLoadState, setProviderLoadState] = useState<
    Partial<Record<CloudTabDefinition['id'], CloudAssetState>>
  >({});
  const [providerPreviewUrls, setProviderPreviewUrls] = useState<Record<string, string>>({});

  const loadProviderTab = useCallback(
    (tabId: CloudTabDefinition['id']): void => {
      if (providerLoadState[tabId] === 'loading' || providerLoadState[tabId] === 'ready') {
        return;
      }

      setProviderLoadState((current) => ({ ...current, [tabId]: 'loading' }));
      const tabDefinition = CLOUD_TABS.find((tab) => tab.id === tabId);
      if (!tabDefinition) {
        setProviderLoadState((current) => ({ ...current, [tabId]: 'error' }));
        return;
      }

      loadDomainAssetCatalog(tabDefinition.category)
        .then((items) => {
          setProviderItems((current) => ({ ...current, [tabId]: items }));
          setProviderLoadState((current) => ({ ...current, [tabId]: 'ready' }));
        })
        .catch(() => {
          setProviderLoadState((current) => ({ ...current, [tabId]: 'error' }));
        });
    },
    [providerLoadState]
  );

  useEffect(() => {
    CLOUD_TABS.forEach((tab) => loadProviderTab(tab.id));
  }, [loadProviderTab]);

  async function insertProviderItem(item: DomainLibraryItem): Promise<void> {
    onAddDomainLibraryItem(await resolveDomainLibraryItemForInsertion(item));
  }

  return {
    providerItems,
    providerLoadState,
    providerPreviewUrls,
    setProviderPreviewUrls,
    loadProviderTab,
    insertProviderItem,
  };
}
