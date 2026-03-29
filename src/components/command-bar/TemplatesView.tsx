import React, { useState, useMemo } from 'react';
import { Layout } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SearchField } from '../ui/SearchField';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { ViewHeader } from './ViewHeader';
import { getFlowTemplates, type FlowTemplate } from '../../services/templates';

interface TemplatesViewProps {
    onSelectTemplate?: (t: FlowTemplate) => void;
    onClose: () => void;
    handleBack: () => void;
}

export const TemplatesView = ({
    onSelectTemplate,
    onClose,
    handleBack
}: TemplatesViewProps) => {
    const { t } = useTranslation();
    const [tSearch, setTSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const templates = useMemo(() => getFlowTemplates(), []);
    const categories = useMemo(() => Array.from(new Set(templates.map((template) => template.category))).sort((left, right) => left.localeCompare(right)), [templates]);

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
            return template.name.toLowerCase().includes(normalizedSearch)
                || template.description.toLowerCase().includes(normalizedSearch)
                || template.category.toLowerCase().includes(normalizedSearch)
                || template.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
        });
    }, [activeCategory, tSearch, templates]);
    const categoryItems = useMemo(() => ([
        { id: 'all', label: 'ALL', count: templates.length },
        ...categories.map((category) => ({
            id: category,
            label: category.toUpperCase(),
            count: templates.filter((template) => template.category === category).length,
        })),
    ]), [categories, templates]);

    return (
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.08),_transparent_48%)]">
            <ViewHeader
                title={t('commandBar.templates.title')}
                icon={<Layout className="w-4 h-4 text-[var(--brand-primary)]" />}
                description="Start from a curated developer-builder diagram, then customize it on the canvas."
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                        {filteredTemplates.map((template) => {
                            const Icon = template.icon;
                            return (
                                <button
                                    key={template.id}
                                    type="button"
                                    onClick={() => handleSelect(template)}
                                    className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-4 text-center transition-colors hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)]"
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] text-[var(--brand-secondary)] transition-colors group-hover:border-[var(--brand-primary-200)] group-hover:bg-[var(--brand-surface)] group-hover:text-[var(--brand-primary)]">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="text-xs font-semibold text-[var(--brand-text)] group-hover:text-[var(--brand-primary-900)]">
                                        {template.name}
                                    </div>
                                    {template.useCase ? (
                                        <div className="line-clamp-2 text-[10px] leading-4 text-[var(--brand-secondary)]">
                                            {template.useCase}
                                        </div>
                                    ) : null}
                                    <div className="text-[10px] font-medium text-[var(--brand-secondary)] opacity-60 uppercase tracking-widest">
                                        {template.category}
                                    </div>
                                </button>
                            );
                        })}
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
