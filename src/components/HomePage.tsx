import React, { Suspense, lazy, useState } from 'react';
import { useFlowStore } from '../store';
import { useWorkspaceDocumentActions, useWorkspaceDocumentsState } from '@/store/documentHooks';
import { HomeDashboard, type HomeFlowCard } from './home/HomeDashboard';
import { HomeFlowDeleteDialog, HomeFlowRenameDialog } from './home/HomeFlowDialogs';
import { HomeSettingsView } from './home/HomeSettingsView';
import { HomeSidebar } from './home/HomeSidebar';
import { HomeTemplatesView } from './home/HomeTemplatesView';
import { shouldShowWelcomeModal } from './home/welcomeModalState';

type HomePageTab = 'home' | 'templates' | 'settings';
type HomeSettingsTab = 'general' | 'canvas' | 'shortcuts' | 'ai';

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
  const { documents } = useWorkspaceDocumentsState();
  const { renameDocument, deleteDocument, duplicateDocument } = useWorkspaceDocumentActions();
  const hasWorkspaceDocuments = useFlowStore((state) => state.documents.length > 0);
  const [internalActiveTab, setInternalActiveTab] = useState<HomePageTab>('home');
  const [activeSettingsTab, setActiveSettingsTab] = useState<HomeSettingsTab>('general');
  const [flowPendingRename, setFlowPendingRename] = useState<HomeFlowCard | null>(null);
  const [flowPendingDelete, setFlowPendingDelete] = useState<HomeFlowCard | null>(null);
  const showWelcomeModal = shouldShowWelcomeModal();

  const activeTab = propActiveTab ?? internalActiveTab;
  const flows: HomeFlowCard[] = hasWorkspaceDocuments ? documents : [];

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
    if (!flowPendingDelete) {
      return;
    }

    deleteDocument(flowPendingDelete.id);
    setFlowPendingDelete(null);
  }

  function handleDuplicateFlow(flowId: string): void {
    const newFlowId = duplicateDocument(flowId);
    if (newFlowId) {
      onOpenFlow(newFlowId);
    }
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
          />
        )}

        {activeTab === 'templates' && (
          <HomeTemplatesView onUseTemplate={onLaunchWithTemplate} />
        )}

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
        onClose={() => setFlowPendingDelete(null)}
        onConfirm={confirmFlowDelete}
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
