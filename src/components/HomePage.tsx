import React, { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '../store';
import { useWorkspaceDocumentActions, useWorkspaceDocumentsState } from '@/store/documentHooks';
import { HomeDashboard, type HomeFlowCard } from './home/HomeDashboard';
import {
  HomeBulkDeleteDialog,
  HomeFlowDeleteDialog,
  HomeFlowRenameDialog,
} from './home/HomeFlowDialogs';
import { HomeMCPView } from './home/HomeMCPView';
import { HomeSettingsView } from './home/HomeSettingsView';
import { HomeSidebar } from './home/HomeSidebar';
import { HomeTemplatesView } from './home/HomeTemplatesView';
import { shouldShowWelcomeModal } from './home/welcomeModalState';
import { syncWorkspaceDocuments } from '@/store/documentStateSync';
import {
  buildPreDeleteDocumentBackup,
  buildPreDeleteWorkspaceBackup,
  downloadDestructiveActionBackup,
  type DestructiveActionBackup,
} from '@/services/storage/destructiveActionBackup';

type HomePageTab = 'home' | 'templates' | 'settings' | 'mcp';
type HomeSettingsTab = 'general' | 'canvas' | 'shortcuts' | 'ai' | 'mcp';
type DeleteBackupState =
  | { status: 'idle' }
  | { status: 'preparing'; flowId: string }
  | { status: 'ready'; flowId: string; backup: DestructiveActionBackup }
  | { status: 'failed'; flowId: string; message: string };
type BulkDeleteBackupState =
  | { status: 'idle' }
  | { status: 'preparing'; selectionKey: string }
  | { status: 'ready'; selectionKey: string; backup: DestructiveActionBackup }
  | { status: 'failed'; selectionKey: string; message: string };

function createSelectionKey(flowIds: readonly string[]): string {
  return flowIds.join('\u0000');
}

const LazyWelcomeModal = lazy(async () => {
  const module = await import('./WelcomeModal');
  return { default: module.WelcomeModal };
});

interface HomePageProps {
  onLaunch: () => void;
  onLaunchWithTemplates: () => void;
  onLaunchWithTemplate: (templateId: string) => void;
  onLaunchWithAI: () => void;
  onImportJSON: () => void;
  onOpenFlow: (flowId: string) => void;
  activeTab?: HomePageTab;
  onSwitchTab?: (tab: HomePageTab) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onLaunch,
  onLaunchWithTemplates,
  onLaunchWithTemplate,
  onLaunchWithAI,
  onImportJSON,
  onOpenFlow,
  activeTab: propActiveTab,
  onSwitchTab,
}) => {
  const { t } = useTranslation();
  const { documents } = useWorkspaceDocumentsState();
  const { renameDocument, deleteDocument, deleteDocuments, duplicateDocument } =
    useWorkspaceDocumentActions();
  const hasWorkspaceDocuments = useFlowStore((state) => state.documents.length > 0);
  const [internalActiveTab, setInternalActiveTab] = useState<HomePageTab>('home');
  const [activeSettingsTab, setActiveSettingsTab] = useState<HomeSettingsTab>('general');
  const [flowPendingRename, setFlowPendingRename] = useState<HomeFlowCard | null>(null);
  const [flowPendingDelete, setFlowPendingDelete] = useState<HomeFlowCard | null>(null);
  const [deleteBackup, setDeleteBackup] = useState<DeleteBackupState>({ status: 'idle' });
  const [selectedFlowIdState, setSelectedFlowIdState] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [flowsPendingBulkDelete, setFlowsPendingBulkDelete] = useState<readonly string[] | null>(
    null
  );
  const [bulkDeleteBackup, setBulkDeleteBackup] = useState<BulkDeleteBackupState>({
    status: 'idle',
  });
  const showWelcomeModal = shouldShowWelcomeModal();

  const activeTab = propActiveTab ?? internalActiveTab;
  const flows: HomeFlowCard[] = hasWorkspaceDocuments ? documents : [];
  const availableFlowIds = new Set(flows.map((flow) => flow.id));
  const selectedFlowIds = new Set(
    [...selectedFlowIdState].filter((flowId) => availableFlowIds.has(flowId))
  );

  function handleTabChange(tab: HomePageTab): void {
    if (onSwitchTab) {
      onSwitchTab(tab);
    } else {
      setInternalActiveTab(tab);
    }
  }

  function handleRenameFlow(flowId: string): void {
    const flow = flows.find((entry) => entry.id === flowId);
    if (!flow) {
      return;
    }

    setFlowPendingRename(flow);
  }

  function handleDeleteFlow(flowId: string): void {
    const flow = flows.find((entry) => entry.id === flowId);
    if (!flow) {
      return;
    }

    setFlowPendingDelete(flow);
    setDeleteBackup({ status: 'preparing', flowId });
    const state = useFlowStore.getState();
    const documentToDelete = syncWorkspaceDocuments(state).find(
      (document) => document.id === flowId
    );
    if (!documentToDelete) {
      setDeleteBackup({
        status: 'failed',
        flowId,
        message: 'The flow is no longer available.',
      });
      return;
    }
    void buildPreDeleteDocumentBackup(documentToDelete).then(
      (backup) =>
        setDeleteBackup((current) =>
          current.status !== 'idle' && current.flowId === flowId
            ? { status: 'ready', flowId, backup }
            : current
        ),
      () =>
        setDeleteBackup((current) =>
          current.status !== 'idle' && current.flowId === flowId
            ? {
                status: 'failed',
                flowId,
                message: 'A safe backup could not be prepared. The flow was not deleted.',
              }
            : current
        )
    );
  }

  function submitFlowRename(nextName: string): void {
    if (!flowPendingRename) {
      return;
    }

    const trimmedName = nextName.trim();
    if (!trimmedName || trimmedName === flowPendingRename.name) {
      setFlowPendingRename(null);
      return;
    }

    renameDocument(flowPendingRename.id, trimmedName);
    setFlowPendingRename(null);
  }

  function confirmFlowDelete(): void {
    if (!flowPendingDelete || deleteBackup.status !== 'ready') {
      return;
    }
    try {
      downloadDestructiveActionBackup(deleteBackup.backup);
      deleteDocument(flowPendingDelete.id);
      setSelectedFlowIdState((selected) => {
        const next = new Set(selected);
        next.delete(flowPendingDelete.id);
        return next;
      });
      setFlowPendingDelete(null);
      setDeleteBackup({ status: 'idle' });
    } catch {
      setDeleteBackup({
        status: 'failed',
        flowId: flowPendingDelete.id,
        message: 'The backup download failed. The flow was not deleted.',
      });
    }
  }

  function handleDuplicateFlow(flowId: string): void {
    const newFlowId = duplicateDocument(flowId);
    if (newFlowId) {
      onOpenFlow(newFlowId);
    }
  }

  function toggleFlowSelection(flowId: string): void {
    if (!availableFlowIds.has(flowId)) return;
    setSelectedFlowIdState((selected) => {
      const next = new Set(selected);
      if (next.has(flowId)) next.delete(flowId);
      else next.add(flowId);
      return next;
    });
  }

  function prepareBulkDelete(): void {
    const selectedIds = flows
      .map((flow) => flow.id)
      .filter((flowId) => selectedFlowIds.has(flowId));
    if (selectedIds.length === 0) return;

    const selectionKey = createSelectionKey(selectedIds);
    setFlowsPendingBulkDelete(selectedIds);
    setBulkDeleteBackup({ status: 'preparing', selectionKey });
    const selectedIdSet = new Set(selectedIds);
    const documentsToDelete = syncWorkspaceDocuments(useFlowStore.getState()).filter((document) =>
      selectedIdSet.has(document.id)
    );
    if (documentsToDelete.length !== selectedIds.length) {
      setBulkDeleteBackup({
        status: 'failed',
        selectionKey,
        message: t(
          'home.bulkDelete.selectionUnavailable',
          'One or more selected flows are no longer available. Nothing was deleted.'
        ),
      });
      return;
    }

    void buildPreDeleteWorkspaceBackup(documentsToDelete).then(
      (backup) =>
        setBulkDeleteBackup((current) =>
          current.status !== 'idle' && current.selectionKey === selectionKey
            ? { status: 'ready', selectionKey, backup }
            : current
        ),
      () =>
        setBulkDeleteBackup((current) =>
          current.status !== 'idle' && current.selectionKey === selectionKey
            ? {
                status: 'failed',
                selectionKey,
                message: t(
                  'home.bulkDelete.backupFailed',
                  'A complete workspace backup could not be prepared. Nothing was deleted.'
                ),
              }
            : current
        )
    );
  }

  function confirmBulkDelete(): void {
    if (!flowsPendingBulkDelete || bulkDeleteBackup.status !== 'ready') return;
    const selectionKey = createSelectionKey(flowsPendingBulkDelete);
    if (bulkDeleteBackup.selectionKey !== selectionKey) return;

    try {
      downloadDestructiveActionBackup(bulkDeleteBackup.backup);
      deleteDocuments(flowsPendingBulkDelete);
      setSelectedFlowIdState(new Set());
      setFlowsPendingBulkDelete(null);
      setBulkDeleteBackup({ status: 'idle' });
    } catch {
      setBulkDeleteBackup({
        status: 'failed',
        selectionKey,
        message: t(
          'home.bulkDelete.downloadFailed',
          'The workspace backup download failed. Nothing was deleted.'
        ),
      });
    }
  }

  function closeBulkDelete(): void {
    setFlowsPendingBulkDelete(null);
    setBulkDeleteBackup({ status: 'idle' });
  }

  return (
    <div className="min-h-screen bg-[var(--brand-background)] flex flex-col text-[var(--brand-text)] md:flex-row">
      <HomeSidebar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main Content */}
      <main
        id="main-content"
        className="flex-1 flex min-w-0 flex-col bg-[var(--brand-surface)] md:ml-64"
      >
        {activeTab === 'home' && (
          <HomeDashboard
            flows={flows}
            onCreateNew={onLaunch}
            onOpenTemplates={onLaunchWithTemplates}
            onPromptWithAI={onLaunchWithAI}
            onImportJSON={onImportJSON}
            onOpenFlow={onOpenFlow}
            onRenameFlow={handleRenameFlow}
            onDuplicateFlow={handleDuplicateFlow}
            onDeleteFlow={handleDeleteFlow}
            selectedFlowIds={selectedFlowIds}
            onToggleFlowSelection={toggleFlowSelection}
            onSelectAllFlows={() => setSelectedFlowIdState(new Set(flows.map((flow) => flow.id)))}
            onClearFlowSelection={() => setSelectedFlowIdState(new Set())}
            onDeleteSelectedFlows={prepareBulkDelete}
          />
        )}

        {activeTab === 'templates' && <HomeTemplatesView onUseTemplate={onLaunchWithTemplate} />}

        {activeTab === 'mcp' && <HomeMCPView />}

        {activeTab === 'settings' && (
          <HomeSettingsView
            activeSettingsTab={activeSettingsTab}
            onSettingsTabChange={setActiveSettingsTab}
          />
        )}
      </main>
      <HomeFlowRenameDialog
        key={flowPendingRename?.id ?? 'rename-closed'}
        flowName={flowPendingRename?.name ?? ''}
        isOpen={flowPendingRename !== null}
        onClose={() => setFlowPendingRename(null)}
        onSubmit={submitFlowRename}
      />
      <HomeFlowDeleteDialog
        key={flowPendingDelete?.id ?? 'delete-closed'}
        flowName={flowPendingDelete?.name ?? ''}
        isOpen={flowPendingDelete !== null}
        backupStatus={deleteBackup.status}
        backupError={deleteBackup.status === 'failed' ? deleteBackup.message : undefined}
        onClose={() => {
          setFlowPendingDelete(null);
          setDeleteBackup({ status: 'idle' });
        }}
        onConfirm={confirmFlowDelete}
      />
      <HomeBulkDeleteDialog
        key={flowsPendingBulkDelete?.join(':') ?? 'bulk-delete-closed'}
        flowCount={flowsPendingBulkDelete?.length ?? 0}
        isOpen={flowsPendingBulkDelete !== null}
        backupStatus={bulkDeleteBackup.status}
        backupError={bulkDeleteBackup.status === 'failed' ? bulkDeleteBackup.message : undefined}
        onClose={closeBulkDelete}
        onConfirm={confirmBulkDelete}
      />
      {showWelcomeModal ? (
        <Suspense fallback={null}>
          <LazyWelcomeModal
            onOpenTemplates={onLaunchWithTemplates}
            onPromptWithAI={onLaunchWithAI}
            onImport={onImportJSON}
            onBlankCanvas={onLaunch}
          />
        </Suspense>
      ) : null}
    </div>
  );
};
