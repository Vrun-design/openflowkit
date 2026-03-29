import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, Activity, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { TemplateDiagramPreview } from '@/components/templates/TemplatePresentation';
import { type FlowTemplate, getFlowTemplates } from '@/services/templates';

const TEMPLATE_GRID_CLASS_NAME =
  'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

interface HomeTemplatesViewProps {
  onUseTemplate: (templateId: string) => void;
}

interface TemplatePreviewDialogProps {
  template: FlowTemplate;
  onClose: () => void;
  onUseTemplate: () => void;
}

interface TemplateCardProps {
  template: FlowTemplate;
  onSelect: () => void;
}

export function HomeTemplatesView({
  onUseTemplate,
}: HomeTemplatesViewProps): React.ReactElement {
  const { t } = useTranslation();
  const templates = useMemo(() => getFlowTemplates().filter((template) => template.featured), []);
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  return (
    <div className="flex-1 animate-in overflow-y-auto px-4 py-6 duration-300 fade-in sm:px-6 md:px-10 md:py-12">
      <div className="mb-8 flex flex-col gap-3 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[var(--brand-text)]">
            {t('nav.templates', 'Templates')}
          </h1>
          <p className="max-w-3xl text-sm text-[var(--brand-secondary)]">
            {t(
              'homeTemplates.description',
              'Start from an editable, production-grade template and swap in your real systems, roles, and workflow details.'
            )}
          </p>
        </div>
      </div>

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-secondary)]">
            {t('homeTemplates.featured', 'Featured Templates')}
          </h2>
          <span className="text-xs text-[var(--brand-secondary)]">
            {t('homeTemplates.count', '{{count}} templates', { count: templates.length })}
          </span>
        </div>

        <div className={TEMPLATE_GRID_CLASS_NAME}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() => setSelectedTemplate(template)}
            />
          ))}
        </div>
      </section>

      {selectedTemplate ? (
        <TemplatePreviewDialog
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onUseTemplate={() => onUseTemplate(selectedTemplate.id)}
        />
      ) : null}
    </div>
  );
}

function TemplatePreviewDialog({
  template,
  onClose,
  onUseTemplate,
}: TemplatePreviewDialogProps): React.ReactElement | null {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-preview-title"
        aria-describedby="template-preview-description"
        className="relative flex w-full max-w-[1080px] flex-col overflow-hidden rounded-[24px] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-2xl md:flex-row animate-in zoom-in-95 duration-200"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)]/80 text-[var(--brand-secondary)] shadow-sm backdrop-blur-md transition-all hover:scale-105 hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text)] hover:shadow"
          aria-label={t('homeTemplates.closePreview', 'Close template preview')}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex w-full flex-col border-b border-[var(--color-brand-border)] bg-[var(--brand-surface)] z-10 md:w-[420px] md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
            <div className="mb-6 flex items-center gap-3">
              <span className="inline-flex items-center rounded-md bg-[var(--brand-primary)]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-primary)] ring-1 ring-inset ring-[var(--brand-primary)]/20">
                {template.category}
              </span>
              <div className="h-1 w-1 rounded-full bg-[var(--color-brand-border)]"></div>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--brand-secondary)]">
                <Layers className="h-3.5 w-3.5" />
                {t('homeTemplates.nodes', '{{count}} nodes', { count: template.nodes.length })}
              </span>
              <div className="h-1 w-1 rounded-full bg-[var(--color-brand-border)]"></div>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--brand-secondary)]">
                <Activity className="h-3.5 w-3.5" />
                {t('homeTemplates.edges', '{{count}} edges', { count: template.edges.length })}
              </span>
            </div>

            <h2
              id="template-preview-title"
              className="mb-4 text-3xl font-bold leading-[1.15] tracking-tight text-[var(--brand-text)]"
            >
              {template.name}
            </h2>
            <p
              id="template-preview-description"
              className="mb-8 text-[15px] leading-relaxed text-[var(--brand-secondary)]"
            >
              {template.description}
            </p>

            {template.replacementHints.length > 0 && (
              <div className="mb-8 rounded-2xl border border-[var(--brand-primary)]/20 bg-gradient-to-b from-[var(--brand-primary)]/[0.03] to-transparent p-5">
                <div className="mb-4 text-[12px] font-bold uppercase tracking-widest text-[var(--brand-primary)]">
                  {t('homeTemplates.bestFirstEdits', 'Best First Edits')}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {template.replacementHints.slice(0, 5).map((hint) => (
                    <Pill key={hint}>{hint}</Pill>
                  ))}
                </div>
              </div>
            )}

            {template.useCase && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--brand-text)]">
                  {t('homeTemplates.perfectFor', 'Perfect For')}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--brand-secondary)]">
                  {template.useCase}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-brand-border)] bg-[var(--brand-background)]/50 p-6 backdrop-blur-sm">
            <Button
              type="button"
              variant="primary"
              onClick={onUseTemplate}
              className="flex h-12 w-full items-center justify-center gap-2 text-[15px] font-semibold shadow-md transition-transform active:scale-[0.98]"
            >
              {t('homeTemplates.useTemplate', 'Use Template')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="relative min-h-[400px] flex-1 bg-[var(--brand-background)] md:min-h-auto">
          <div className="absolute inset-0 z-0 bg-[radial-gradient(var(--color-brand-border)_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>
          <TemplateDiagramPreview template={template} />
        </div>
      </div>

      <button
        type="button"
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-label={t('homeTemplates.closePreview', 'Close template preview')}
      />
    </div>,
    document.body
  );
}

function TemplateCard({ template, onSelect }: TemplateCardProps): React.ReactElement {
  const metadata = [template.category, formatCountLabel(template.nodes.length, 'node')];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--color-brand-border),transparent_45%)] bg-[var(--brand-surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--brand-primary-400)]/40 hover:shadow-[0_10px_32px_rgba(0,0,0,0.08)]"
    >
      <div className="relative h-[168px] w-full overflow-hidden border-b border-[color-mix(in_srgb,var(--color-brand-border),transparent_55%)] bg-[var(--brand-background)]">
        <TemplateDiagramPreview template={template} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1.5 text-[13.5px] font-semibold tracking-tight text-[var(--brand-text)] transition-colors group-hover:text-[var(--brand-primary)]">
          {template.name}
        </h3>
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--brand-secondary)]">
          <TemplateMetadataLine templateId={template.id} items={metadata} />
        </div>
      </div>
    </button>
  );
}

function TemplateMetadataLine({
  templateId,
  items,
}: {
  templateId: string;
  items: string[];
}): React.ReactElement {
  return (
    <>
      {items.map((item, index) => (
        <React.Fragment key={`${templateId}-${item}`}>
          {index > 0 ? (
            <div className="h-[3px] w-[3px] rounded-full bg-[color-mix(in_srgb,var(--brand-secondary),transparent_50%)]" />
          ) : null}
          <span className={index === 0 ? 'capitalize' : undefined}>{item}</span>
        </React.Fragment>
      ))}
    </>
  );
}

function formatCountLabel(count: number, label: string): string {
  return count === 1 ? `1 ${label}` : `${count} ${label}s`;
}

function Pill({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <span className="inline-flex items-center rounded-lg border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-1.5 text-xs font-medium text-[var(--brand-text)] shadow-sm transition-colors hover:border-[var(--brand-primary)]/40 hover:bg-[color-mix(in_srgb,var(--brand-primary),transparent_95%)] hover:text-[var(--brand-primary)]">
      {children}
    </span>
  );
}
