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
import { isAssetStoreAvailable } from './assetStore';
import { migrateNodesMedia } from './assetMigration';
import { reportStorageTelemetry } from './storageTelemetry';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { acknowledgeCrashJournal, appendCrashJournal, clearCrashJournal, readCrashJournal,
  resolveRecoverableJournal,
  toLoadedDocument, type CrashJournalEntry } from './crashRecoveryJournal';

const STORE_SUBSCRIPTION_DEBOUNCE_MS = 250;
let pendingCrashRecovery: CrashJournalEntry | null = null;

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

  if (ROLLOUT_FLAGS.openCanvasCrashRecoveryV1) {
    const newestPersistedAt = loaded.documents.reduce<string | null>((latest, document) =>
      !latest || document.updatedAt > latest ? document.updatedAt : latest, null);
    pendingCrashRecovery = resolveRecoverableJournal(localStorage, newestPersistedAt);
  }

  captureAnalyticsEvent('workspace_restored', {
    document_count: workspace.documents.length,
    has_active_document: Boolean(activeDocument.activeDocumentId),
  });
}

/**
 * Migrate legacy inline data: URLs into the assets store, writing results back to
 * the store. Skips the write-back when the user edited during the await so a save
 * never resurrects stale nodes over newer edits.
 */
async function migrateStoreMediaBeforeSave(): Promise<void> {
  if (!isAssetStoreAvailable()) {
    return;
  }

  try {
    const before = useFlowStore.getState();
    const activeMigrated = await migrateNodesMedia(before.nodes);
    if (activeMigrated.changed && useFlowStore.getState().nodes === before.nodes) {
      useFlowStore.setState({
        nodes: activeMigrated.nodes,
        tabs: before.tabs.map((tab) =>
          tab.id === before.activeTabId ? { ...tab, nodes: activeMigrated.nodes } : tab
        ),
      });
    }

    // Also migrate inactive tab pages so reloads don't re-expand data URLs.
    const beforeTabs = useFlowStore.getState().tabs;
    const activeTabId = useFlowStore.getState().activeTabId;
    const migratedTabs = await Promise.all(
      beforeTabs.map(async (tab) => {
        if (tab.id === activeTabId) {
          return tab;
        }
        const migrated = await migrateNodesMedia(tab.nodes);
        return migrated.changed ? { ...tab, nodes: migrated.nodes } : tab;
      })
    );
    if (
      migratedTabs.some((tab, index) => tab !== beforeTabs[index])
      && useFlowStore.getState().tabs === beforeTabs
    ) {
      useFlowStore.setState({ tabs: migratedTabs });
    }
  } catch (error) {
    // Migration is best-effort; always fall through to save.
    reportStorageTelemetry({
      area: 'persist',
      code: 'ASSET_MIGRATE_ON_SAVE_FAILED',
      severity: 'warning',
      message: `Asset media migration failed during save; continuing with unmigrated media. ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

// Saves are chained so two overlapping snapshots can't land out of order.
let pendingPersist: Promise<void> = Promise.resolve();

function persistStoreSnapshot(): void {
  pendingPersist = pendingPersist.then(async () => {
    await migrateStoreMediaBeforeSave();

    // Re-read after the awaits above: migration writes back to the store, and the
    // user may have edited meanwhile. Saving the pre-await snapshot would drop both.
    const state = useFlowStore.getState();
    const documents = syncWorkspaceDocuments({
      documents: state.documents,
      activeDocumentId: state.activeDocumentId,
      tabs: state.tabs.map(sanitizePersistedTab),
      activeTabId: state.activeTabId,
      nodes: state.nodes,
      edges: state.edges,
    });
    const crashJournalCheckpoint = ROLLOUT_FLAGS.openCanvasCrashRecoveryV1
      ? readCrashJournal(localStorage).at(-1)?.id ?? null : null;

    await localFirstRepository.saveFlowDocuments(documents, state.activeDocumentId);
    if (ROLLOUT_FLAGS.openCanvasCrashRecoveryV1) {
      acknowledgeCrashJournal(localStorage, crashJournalCheckpoint);
    }

    if (state.aiSettings.storageMode === 'local') {
      await localFirstRepository.savePersistentAISettings(JSON.stringify(state.aiSettings));
    }
  }).catch((error) => {
    reportStorageTelemetry({
      area: 'persist',
      code: 'PERSIST_SNAPSHOT_FAILED',
      severity: 'error',
      message: `Failed to persist workspace snapshot. ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  });
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

    if (ROLLOUT_FLAGS.openCanvasCrashRecoveryV1
      && (documentsChanged || tabsChanged || activeDocumentChanged || activePageChanged)) {
      try { appendCrashJournal(state, localStorage); } catch (error) {
        reportStorageTelemetry({ area: 'persist', code: 'CRASH_JOURNAL_WRITE_FAILED',
          severity: 'warning', message: error instanceof Error ? error.message : String(error) });
      }
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      persistStoreSnapshot();
    }, STORE_SUBSCRIPTION_DEBOUNCE_MS);
  });
}

export function getPendingCrashRecovery(): CrashJournalEntry | null {
  return pendingCrashRecovery;
}

export function discardPendingCrashRecovery(): void {
  clearCrashJournal(localStorage); pendingCrashRecovery = null;
}

export function restorePendingCrashRecovery(): boolean {
  if (!pendingCrashRecovery) return false;
  const workspace = createLoadedFlowWorkspace(toLoadedDocument(pendingCrashRecovery));
  const active = getEditorPagesForDocument(workspace.documents, workspace.activeDocumentId);
  if (!active) return false;
  useFlowStore.setState({ documents: workspace.documents, activeDocumentId: active.activeDocumentId,
    tabs: active.pages, activeTabId: active.activePageId,
    nodes: active.pages.find(({ id }) => id === active.activePageId)?.nodes ?? [],
    edges: active.pages.find(({ id }) => id === active.activePageId)?.edges ?? [] });
  pendingCrashRecovery = null; persistStoreSnapshot(); return true;
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
