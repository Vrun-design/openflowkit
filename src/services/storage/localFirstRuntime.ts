import { DEFAULT_AI_SETTINGS } from '@/store';
import { captureAnalyticsEvent } from '@/services/analytics/analytics';
import { sanitizeAISettings } from '@/store/aiSettings';
import { clearPersistedAISettings, loadPersistedAISettings } from '@/store/aiSettingsPersistence';
import { sanitizePersistedTab } from '@/store/persistence';
import { syncWorkspaceDocuments } from '@/store/documentStateSync';
import { getEditorPagesForDocument } from '@/store/workspaceDocumentModel';
import type { FlowStoreState } from '@/store';
import { useFlowStore } from '@/store';
import { createPersistedDocumentsFromTabs } from './persistedDocumentAdapters';
import {
  createLoadedFlowWorkspace,
  localFirstRepository,
  type PersistedChatMessage,
} from './localFirstRepository';
import {
  parseLegacyChatMessagesJson,
  parsePersistentAISettingsJson,
} from './storageSchemas';

const STORE_SUBSCRIPTION_DEBOUNCE_MS = 250;

type StoreWithPersist = typeof useFlowStore & {
  persist?: {
    hasHydrated: () => boolean;
    rehydrate: () => Promise<void>;
    onFinishHydration: (listener: () => void) => () => void;
  };
};

async function waitForStoreHydration(): Promise<void> {
  const persistedStore = useFlowStore as StoreWithPersist;
  const persistApi = persistedStore.persist;

  if (!persistApi) {
    return;
  }

  await persistApi.rehydrate();
  if (persistApi.hasHydrated()) {
    return;
  }

  await new Promise<void>((resolve) => {
    const unsubscribe = persistApi.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

function buildChatMessageId(documentId: string, index: number): string {
  return `${documentId}:${index}`;
}

function toPersistedChatMessages(documentId: string, serialized: string | null): PersistedChatMessage[] {
  const parsed = parseLegacyChatMessagesJson(serialized);
  if (parsed.length === 0) {
    return [];
  }

  const startedAt = Date.now();
  return parsed.map((message, index) => ({
    id: buildChatMessageId(documentId, index),
    documentId,
    role: message.role,
    parts: message.parts,
    createdAt: new Date(startedAt + index).toISOString(),
  }));
}

async function migrateLegacyStoreIntoRepositoryIfNeeded(): Promise<void> {
  const currentState = useFlowStore.getState();
  const loaded = await localFirstRepository.loadWorkspaceSnapshot();
  if (loaded.documents.length > 0) {
    return;
  }

  const tabs = currentState.tabs.map(sanitizePersistedTab);
  if (tabs.length === 0) {
    return;
  }

  await localFirstRepository.saveDocuments(
    createPersistedDocumentsFromTabs(tabs),
    currentState.activeTabId,
  );

  await Promise.all(
    tabs.map(async (tab) => {
      const legacyChatRaw = localStorage.getItem(`ofk_chat_history_${tab.id}`);
      const persistedMessages = toPersistedChatMessages(tab.id, legacyChatRaw);
      if (persistedMessages.length > 0) {
        await localFirstRepository.replaceChatThread(tab.id, persistedMessages);
      }
    })
  );

  const persistedAiSettings = loadPersistedAISettings();
  if (persistedAiSettings.storageMode === 'local') {
    await localFirstRepository.savePersistentAISettings(JSON.stringify(persistedAiSettings));
    clearPersistedAISettings();
  }
}

async function hydrateStoreFromRepository(): Promise<void> {
  const loaded = await localFirstRepository.loadWorkspaceSnapshot();
  const workspace = createLoadedFlowWorkspace(loaded);
  const activeDocument = getEditorPagesForDocument(workspace.documents, workspace.activeDocumentId);
  if (!activeDocument) {
    captureAnalyticsEvent('workspace_restored', {
      document_count: 0,
      has_active_document: false,
    });
    return;
  }

  const persistentAiSettings = await localFirstRepository.loadPersistentAISettings();
  const parsedPersistentAiSettings = parsePersistentAISettingsJson(
    persistentAiSettings
  ) as Partial<FlowStoreState['aiSettings']> | undefined;
  const aiSettings = parsedPersistentAiSettings
    ? sanitizeAISettings(parsedPersistentAiSettings, DEFAULT_AI_SETTINGS)
    : loadPersistedAISettings();

  useFlowStore.setState((currentState) => ({
    ...currentState,
    documents: workspace.documents,
    activeDocumentId: activeDocument.activeDocumentId,
    tabs: activeDocument.pages,
    activeTabId: activeDocument.activePageId,
    nodes: activeDocument.pages.find((page) => page.id === activeDocument.activePageId)?.nodes ?? [],
    edges: activeDocument.pages.find((page) => page.id === activeDocument.activePageId)?.edges ?? [],
    aiSettings,
  }));

  captureAnalyticsEvent('workspace_restored', {
    document_count: workspace.documents.length,
    has_active_document: Boolean(activeDocument.activeDocumentId),
  });
}

function persistStoreSnapshot(): void {
  const nextState = useFlowStore.getState();
  const documents = syncWorkspaceDocuments({
    documents: nextState.documents,
    activeDocumentId: nextState.activeDocumentId,
    tabs: nextState.tabs.map(sanitizePersistedTab),
    activeTabId: nextState.activeTabId,
    nodes: nextState.nodes,
    edges: nextState.edges,
  });

  void localFirstRepository.saveFlowDocuments(
    documents,
    nextState.activeDocumentId,
  );

  if (nextState.aiSettings.storageMode === 'local') {
    void localFirstRepository.savePersistentAISettings(JSON.stringify(nextState.aiSettings));
  }
}

let syncStopper: (() => void) | null = null;
let initializationPromise: Promise<void> | null = null;

export async function initializeLocalFirstPersistence(): Promise<void> {
  await waitForStoreHydration();
  await migrateLegacyStoreIntoRepositoryIfNeeded();
  await hydrateStoreFromRepository();

  if (syncStopper) {
    return;
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  syncStopper = useFlowStore.subscribe((state, previousState) => {
    const documentsChanged = state.documents !== previousState.documents;
    const tabsChanged = state.tabs !== previousState.tabs;
    const activeDocumentChanged = state.activeDocumentId !== previousState.activeDocumentId;
    const activePageChanged = state.activeTabId !== previousState.activeTabId;
    const aiSettingsChanged = state.aiSettings !== previousState.aiSettings;

    if (!documentsChanged && !tabsChanged && !activeDocumentChanged && !activePageChanged && !aiSettingsChanged) {
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      persistStoreSnapshot();
    }, STORE_SUBSCRIPTION_DEBOUNCE_MS);
  });
}

export function ensureLocalFirstPersistenceReady(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeLocalFirstPersistence().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}
