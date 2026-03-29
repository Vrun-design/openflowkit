import React, { useMemo, useState } from 'react';
import { Layout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '../ui/SearchField';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { ViewHeader } from './ViewHeader';
import { TemplateDiagramPreview } from '@/components/templates/TemplatePresentation';
import { getFlowTemplates, type FlowTemplate } from '@/services/templates';

interface TemplatesViewProps {
  onSelectTemplate?: (t: FlowTemplate) => void;
  onClose: () => void;
  handleBack: () => void;
}

export const TemplatesView = ({
  onSelectTemplate,
  onClose,
  handleBack,
}: TemplatesViewProps): React.ReactElement => {
  const { t } = useTranslation();
  const [tSearch, setTSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const templates = useMemo(() => getFlowTemplates(), []);
  const categories = useMemo(
    () =>
      Array.from(new Set(templates.map((template) => template.category))).sort((left, right) =>
        left.localeCompare(right)
      ),
    [templates]
  );

  const handleSelect = (template: FlowTemplate) => {
    onSelectTemplate?.(template);
    onClose();
  };

  const filteredTemplates = useMemo(() => {
    const normalizedSearch = tSearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (activeCategory !== 'all' && template.category !== activeCategory) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      return (
        template.name.toLowerCase().includes(normalizedSearch) ||
        template.description.toLowerCase().includes(normalizedSearch) ||
        template.useCase.toLowerCase().includes(normalizedSearch) ||
        template.outcome.toLowerCase().includes(normalizedSearch) ||
        template.category.toLowerCase().includes(normalizedSearch) ||
        template.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch)) ||
        template.replacementHints.some((hint) => hint.toLowerCase().includes(normalizedSearch))
      );
    });
  }, [activeCategory, tSearch, templates]);

  const categoryItems = useMemo(
    () => [
      { id: 'all', label: 'ALL', count: templates.length },
      ...categories.map((category) => ({
        id: category,
        label: category.toUpperCase(),
        count: templates.filter((template) => template.category === category).length,
      })),
    ],
    [categories, templates]
  );

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_48%)]">
      <ViewHeader
        title={t('commandBar.templates.title')}
        icon={<Layout className="h-4 w-4 text-[var(--brand-primary)]" />}
        description="Start from a polished workflow or architecture template, then edit the real details on canvas."
        onBack={handleBack}
        onClose={onClose}
      />

      <div className="border-b border-[var(--color-brand-border)]/70 bg-[var(--brand-surface)]/90 px-4 py-3 backdrop-blur-sm">
        <SearchField
          value={tSearch}
          onChange={(e) => setTSearch(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder={t('commandBar.templates.placeholder')}
          autoFocus
        />

        <SegmentedTabs
          items={categoryItems}
          value={activeCategory}
          onChange={setActiveCategory}
          className="mt-3 -mx-1"
          listClassName="px-1"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        {filteredTemplates.length > 0 ? (
          <div className="space-y-3">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template)}
                className="group flex w-full items-stretch overflow-hidden rounded-[16px] border border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-surface)] text-left transition-all duration-200 hover:border-[var(--brand-primary-300)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
              >
                <div className="relative hidden w-[190px] shrink-0 border-r border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-background)] sm:block">
                  <TemplateDiagramPreview template={template} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-4">
                  <div className="mb-1 text-[13.5px] font-semibold text-[var(--brand-text)] group-hover:text-[var(--brand-primary-900)]">
                    {template.name}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--brand-secondary)]">
                    <span className="capitalize">{template.category}</span>
                    <div className="h-[3px] w-[3px] rounded-full bg-[color-mix(in_srgb,var(--brand-secondary),transparent_50%)]" />
                    <span>{formatNodeCount(template.nodes.length)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
        {filteredTemplates.length === 0 && (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-surface)]/80 px-4 py-10 text-center text-sm text-[var(--brand-secondary)]">
            {t('commandBar.templates.noResults')}
          </div>
        )}
      </div>
    </div>
  );
};

function formatNodeCount(count: number): string {
  return count === 1 ? '1 node' : `${count} nodes`;
}
