import React from 'react';
import {
  Copy,
  Layout,
  WandSparkles,
  Pencil,
  Plus,
  Trash2,
  LayoutTemplate,
  FileInput,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { Tooltip } from '../Tooltip';
import type { WorkspaceDocumentPreview } from '@/store/workspaceDocumentModel';
import { recordOnboardingEvent } from '@/services/onboarding/events';

const AUTOSAVED_LABEL = 'Autosaved';

export interface HomeFlowCard {
  id: string;
  name: string;
  nodeCount: number;
  edgeCount: number;
  updatedAt?: string;
  isActive?: boolean;
  preview: WorkspaceDocumentPreview | null;
}

interface HomeDashboardProps {
  flows: HomeFlowCard[];
  onCreateNew: () => void;
  onOpenTemplates: () => void;
  onPromptWithAI: () => void;
  onImportJSON: () => void;
  onOpenFlow: (flowId: string) => void;
  onRenameFlow: (flowId: string) => void;
  onDuplicateFlow: (flowId: string) => void;
  onDeleteFlow: (flowId: string) => void;
}

export function HomeDashboard({
  flows,
  onCreateNew,
  onOpenTemplates,
  onPromptWithAI,
  onImportJSON,
  onOpenFlow,
  onRenameFlow,
  onDuplicateFlow,
  onDeleteFlow,
}: HomeDashboardProps): React.ReactElement {
  const { t } = useTranslation();
  const hasFlows = flows.length > 0;
  const secondaryActionIconClass =
    'h-4 w-4 text-[var(--brand-secondary)] transition-transform duration-300 group-hover:scale-110';

  function handleCreateNew(): void {
    recordOnboardingEvent('welcome_blank_selected', { source: 'home-dashboard' });
    onCreateNew();
  }

  function handlePromptWithAI(): void {
    recordOnboardingEvent('welcome_prompt_selected', { source: 'home-dashboard' });
    onPromptWithAI();
  }

  function handleImportJSON(): void {
    recordOnboardingEvent('welcome_import_selected', { source: 'home-dashboard' });
    onImportJSON();
  }

  function handleOpenTemplates(): void {
    recordOnboardingEvent('welcome_template_selected', { source: 'home-dashboard' });
    onOpenTemplates();
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 animate-in fade-in duration-300 sm:px-6 md:px-10 md:py-12">
      <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--brand-text)] tracking-tight mb-1">
            {t('home.title', 'Dashboard')}
          </h1>
          <p className="text-[var(--brand-secondary)] text-sm">
            {t('home.description', 'Manage your flows and diagrams.')}
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          data-testid="home-create-new-header"
          variant="primary"
          size="sm"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
          {t('home.createNew', 'Create new')}
        </Button>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-[var(--brand-secondary)] uppercase tracking-wider">
              {t('home.recentFiles', 'Recent Files')}
            </h2>
            <Tooltip
              text={t(
                'home.localStorageHint',
                'Autosaved on this device. We do not upload your diagram data to our servers.'
              )}
              side="right"
            >
              <div className="flex cursor-default items-center justify-center text-[var(--brand-primary)] hover:brightness-110 transition-all duration-200">
                <ShieldCheck
                  className="w-[13px] h-[13px]"
                  fill="currentColor"
                  stroke="white"
                  strokeWidth={1.5}
                />
              </div>
            </Tooltip>
          </div>
          {hasFlows && (
            <span className="text-xs text-[var(--brand-secondary)]">
              {flows.length} {t('home.files', 'files')}
            </span>
          )}
        </div>

        {!hasFlows ? (
          <div
            className="flex w-full flex-col py-2 sm:py-6 animate-in fade-in zoom-in-[0.99] duration-700"
            data-testid="home-empty-state"
          >
            <div className="relative overflow-hidden w-full max-w-[840px] mx-auto rounded-[24px] bg-[var(--brand-surface)] border border-[var(--color-brand-border)]/80 shadow-[0_8px_30px_rgba(0,0,0,0.03)]">
              {/* Super-delicate background gradient inside card */}
              <div className="absolute top-0 left-0 w-full h-[140px] bg-gradient-to-b from-[var(--brand-background)] to-[var(--brand-surface)] pointer-events-none"></div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[120px] bg-[var(--brand-primary)]/5 blur-[50px] rounded-full pointer-events-none"></div>

              <div className="relative z-10 flex flex-col items-center px-6 py-10 text-center">
                {/* Sleek Icon */}
                <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[var(--brand-surface)] shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-[var(--color-brand-border)]/60 mb-5 relative group cursor-default">
                  <div className="absolute inset-0 bg-[var(--brand-primary)]/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[18px]"></div>
                  <Layout
                    className="w-8 h-8 text-[var(--brand-primary)] transition-transform group-hover:scale-105 duration-500"
                    strokeWidth={1.5}
                  />
                </div>

                <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-[var(--brand-text)] mb-2">
                  {t('home.homeEmptyTitle', 'Create your first flow')}
                </h2>
                <p className="text-[14px] text-[var(--brand-secondary)] max-w-[500px] mb-8 leading-relaxed">
                  {t(
                    'home.homeEmptySubtitle',
                    'Design enterprise-grade architectures instantly. Start from a blank canvas, describe your infrastructure with our AI builder, or use a tailored template.'
                  )}
                </p>

                {/* Action Grid strictly inside the card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-[640px]">
                  <Button
                    onClick={handleCreateNew}
                    data-testid="home-create-new-main"
                    variant="primary"
                    size="lg"
                    className="w-full text-[14.5px]"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />{' '}
                    {t('home.homeBlankCanvas', 'Blank Canvas')}
                  </Button>

                  <Button
                    onClick={handlePromptWithAI}
                    data-testid="home-generate-with-ai"
                    variant="secondary"
                    size="lg"
                    className="w-full text-[14.5px] group"
                  >
                    <WandSparkles className={secondaryActionIconClass} strokeWidth={2} />{' '}
                    {t('home.homeFlowpilotAI', 'Flowpilot AI')}
                  </Button>

                  <Button
                    onClick={handleOpenTemplates}
                    data-testid="home-open-templates"
                    variant="secondary"
                    size="lg"
                    className="w-full text-[14.5px]"
                  >
                    <LayoutTemplate className={secondaryActionIconClass} strokeWidth={2} />{' '}
                    {t('home.homeTemplates', 'Templates')}
                  </Button>
                </div>

                <div className="mt-8 flex items-center justify-center pt-6 border-t border-[var(--color-brand-border)]/60 w-full max-w-[640px]">
                  <ImportExistingFileButton
                    label={t('home.homeImportFile', 'Or import an existing file')}
                    onClick={handleImportJSON}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {flows.map((flow) => (
              <div
                key={flow.id}
                onClick={() => onOpenFlow(flow.id)}
                className="group relative cursor-pointer flex flex-col overflow-hidden rounded-[16px] border border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-surface)] transition-all duration-300 hover:border-[var(--brand-primary-400)]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
              >
                <div className="relative flex h-[160px] w-full items-center justify-center overflow-hidden border-b border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-background)]">
                  <FlowPreview preview={flow.preview} />

                  {/* Sleek Floating Actions Pill */}
                  <div className="absolute right-3 top-3 z-20 flex items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--color-brand-border),white_10%)] bg-[var(--brand-surface)]/80 backdrop-blur-md p-1 opacity-0 transform translate-y-[-4px] transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 shadow-lg">
                    <FlowCardActionButton
                      label={t('common.rename', 'Rename')}
                      onClick={() => onRenameFlow(flow.id)}
                      hoverClassName="hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] focus-visible:ring-[var(--brand-primary)]"
                    >
                      <Pencil className="h-3 w-3" />
                    </FlowCardActionButton>
                    <FlowCardActionButton
                      label={t('common.duplicate', 'Duplicate')}
                      onClick={() => onDuplicateFlow(flow.id)}
                      hoverClassName="hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)] focus-visible:ring-[var(--brand-primary)]"
                    >
                      <Copy className="h-3 w-3" />
                    </FlowCardActionButton>
                    {/* Divider */}
                    <div className="h-3 w-[1px] bg-[var(--color-brand-border)] mx-0.5"></div>
                    <FlowCardActionButton
                      label={t('common.delete', 'Delete')}
                      onClick={() => onDeleteFlow(flow.id)}
                      hoverClassName="hover:bg-red-500/10 hover:text-red-500 focus-visible:ring-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </FlowCardActionButton>
                  </div>
                </div>
                <div className="flex flex-col p-4 bg-[var(--brand-surface)] transition-colors group-hover:bg-[color-mix(in_srgb,var(--brand-surface),white_2%)]">
                  <h3 className="font-semibold text-[13.5px] text-[var(--brand-text)] tracking-tight truncate mb-1.5 group-hover:text-[var(--brand-primary)] transition-colors">
                    {flow.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--brand-secondary)]">
                    <span>{formatUpdatedAt(flow.updatedAt)}</span>
                    <div className="h-[3px] w-[3px] rounded-full bg-[color-mix(in_srgb,var(--brand-secondary),transparent_50%)]"></div>
                    <span>
                      {flow.nodeCount} node{flow.nodeCount !== 1 ? 's' : ''}
                    </span>
                    {flow.isActive && (
                      <>
                        <div className="h-[3px] w-[3px] rounded-full bg-[color-mix(in_srgb,var(--brand-secondary),transparent_50%)]"></div>
                        <span className="text-[var(--brand-primary)]">
                          {t('home.currentFlow', 'Current')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatUpdatedAt(updatedAt?: string): string {
  if (!updatedAt) {
    return AUTOSAVED_LABEL;
  }

  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) {
    return AUTOSAVED_LABEL;
  }

  return new Date(parsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getPreviewNodeRadius(node: WorkspaceDocumentPreview['nodes'][number]): number {
  if (node.shape === 'capsule') {
    return node.height / 2;
  }

  if (node.shape === 'rectangle') {
    return 12;
  }

  return 20;
}

interface FlowPreviewProps {
  preview: WorkspaceDocumentPreview | null;
}

function FlowPreview({ preview }: FlowPreviewProps): React.ReactElement {
  if (!preview || preview.nodes.length === 0) {
    return <EmptyFlowPreview />;
  }

  const padding = 24;
  const minX = Math.min(...preview.nodes.map((node) => node.x));
  const minY = Math.min(...preview.nodes.map((node) => node.y));
  const maxX = Math.max(...preview.nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...preview.nodes.map((node) => node.y + node.height));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const viewBox = `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;

  return (
    <div className="absolute inset-0 text-[var(--brand-secondary)] overflow-hidden w-full h-full">
      <div
        className="absolute inset-0 dark:hidden opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.15]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--brand-secondary) 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block opacity-[0.35] transition-opacity duration-500 group-hover:opacity-[0.5]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--color-brand-border) 1px, transparent 0)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--brand-primary)_4%,transparent),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <svg
        viewBox={viewBox}
        className="absolute inset-[10%] h-[80%] w-[80%] transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {preview.nodes.map((node) => (
          <rect
            key={node.id}
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={getPreviewNodeRadius(node)}
            fill="currentColor"
            fillOpacity="0.12"
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_20px_var(--brand-background)] opacity-[0.85]" />
    </div>
  );
}

interface ImportExistingFileButtonProps {
  label: string;
  onClick: () => void;
}

function ImportExistingFileButton({
  label,
  onClick,
}: ImportExistingFileButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--brand-secondary)] transition-colors hover:text-[var(--brand-text)] focus:outline-none focus-visible:underline"
    >
      <FileInput className="w-[14px] h-[14px]" />
      {label}
    </button>
  );
}

interface FlowCardActionButtonProps {
  children: React.ReactNode;
  hoverClassName: string;
  label: string;
  onClick: () => void;
}

function FlowCardActionButton({
  children,
  hoverClassName,
  label,
  onClick,
}: FlowCardActionButtonProps): React.ReactElement {
  function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onClick();
  }

  return (
    <Tooltip text={label} side="bottom">
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[var(--brand-secondary)] transition-colors focus-visible:outline-none focus-visible:ring-2 ${hoverClassName}`}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function EmptyFlowPreview(): React.ReactElement {
  return (
    <>
      <div
        className="absolute inset-0 dark:hidden opacity-[0.05] transition-opacity duration-300 group-hover:opacity-[0.15]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--brand-secondary) 1px, transparent 0)',
          backgroundSize: '12px 12px',
        }}
      />
      <div
        className="absolute inset-0 hidden dark:block opacity-[0.3] transition-opacity duration-300 group-hover:opacity-[0.4]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, var(--color-brand-border) 1px, transparent 0)',
          backgroundSize: '12px 12px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--brand-background)_120%)]" />
      <div className="z-10 flex h-10 w-10 items-center justify-center rounded-[10px] border border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-[var(--brand-primary-400)]/40 group-hover:text-[var(--brand-primary)] group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <Layout className="w-4 h-4" />
      </div>
    </>
  );
}
