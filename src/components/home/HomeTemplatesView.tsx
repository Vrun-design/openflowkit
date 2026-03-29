import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { resolveNodeSize as resolveCanvasNodeSize } from '@/components/nodeHelpers';
import { type FlowTemplate, getFlowTemplates } from '@/services/templates';
import type { FlowNode } from '@/lib/types';

const TEMPLATE_PREVIEW_MAX_NODES = 12;
const TEMPLATE_PREVIEW_MIN_NODE_WIDTH = 48;
const TEMPLATE_PREVIEW_MIN_NODE_HEIGHT = 24;
const TEMPLATE_PREVIEW_MAX_NODE_WIDTH = 132;
const TEMPLATE_PREVIEW_MAX_NODE_HEIGHT = 72;
const TEMPLATE_PREVIEW_PADDING = 28;
const FEATURED_TEMPLATE_COUNT = 7;
const TEMPLATE_GRID_CLASS_NAME = 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

interface TemplatePreviewNode {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    shape?: FlowNode['data']['shape'];
}

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
    const templates = useMemo(() => getFlowTemplates().slice(0, FEATURED_TEMPLATE_COUNT), []);
    const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6 animate-in fade-in duration-300 sm:px-6 md:px-10 md:py-12">
            <div className="mb-8 flex flex-col gap-3 md:mb-12 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="mb-1 text-2xl font-semibold tracking-tight text-[var(--brand-text)]">
                        {t('nav.templates', 'Templates')}
                    </h1>
                    <p className="text-sm text-[var(--brand-secondary)]">
                        {t('homeTemplates.description', 'Start from a ready-made flow and customize it in the editor.')}
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
    const metadataItems = [
        t('homeTemplates.nodes', '{{count}} nodes', { count: template.nodes.length }),
        t('homeTemplates.edges', '{{count}} edges', { count: template.edges.length }),
        template.useCase ?? template.tags[0] ?? t('homeTemplates.starterTemplate', 'Starter template'),
    ];

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
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="template-preview-title"
                aria-describedby="template-preview-description"
                className="relative grid w-full max-w-6xl overflow-hidden rounded-[24px] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-2xl md:grid-cols-[340px_minmax(0,1fr)]"
            >
                <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] transition-colors hover:text-[var(--brand-text)]"
                    aria-label={t('homeTemplates.closePreview', 'Close template preview')}
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="flex flex-col border-b border-[var(--color-brand-border)] p-6 md:border-b-0 md:border-r">
                    <div className="mb-4 inline-flex w-fit items-center rounded-full border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-[var(--brand-primary)]">
                        {template.category}
                    </div>
                    <h2 id="template-preview-title" className="mb-2 text-2xl font-semibold tracking-tight text-[var(--brand-text)]">
                        {template.name}
                    </h2>
                    <p id="template-preview-description" className="mb-5 text-sm leading-6 text-[var(--brand-secondary)]">
                        {template.description}
                    </p>
                    <div className="space-y-2 text-sm text-[var(--brand-secondary)]">
                        {metadataItems.map((item) => (
                            <div key={`${template.id}-${item}`}>{item}</div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <Button
                            type="button"
                            variant="primary"
                            onClick={onUseTemplate}
                            className="w-full justify-center"
                        >
                            {t('homeTemplates.useTemplate', 'Use Template')}
                        </Button>
                    </div>
                </div>

                <div className="relative min-h-[420px] bg-[var(--brand-background)]">
                    <TemplateFlowPreview template={template} />
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

function TemplateCard({
    template,
    onSelect,
}: TemplateCardProps): React.ReactElement {
    const { t } = useTranslation();
    const metadata = [
        template.category,
        t('homeTemplates.nodes', '{{count}} nodes', { count: template.nodes.length }),
        template.tags[0] ?? t('homeTemplates.starter', 'Starter'),
    ];

    return (
        <button
            type="button"
            onClick={onSelect}
            className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[16px] border border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-surface)] text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--brand-primary-400)]/40 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
            <div className="relative flex h-[160px] w-full items-center justify-center overflow-hidden border-b border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-background)]">
                <TemplateFlowPreview template={template} />
            </div>
            <div className="flex w-full flex-col bg-[var(--brand-surface)] p-4 transition-colors group-hover:bg-[color-mix(in_srgb,var(--brand-surface),white_2%)]">
                <h3 className="mb-1.5 truncate font-semibold tracking-tight text-[13.5px] text-[var(--brand-text)] transition-colors group-hover:text-[var(--brand-primary)]">
                    {template.name}
                </h3>
                <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--brand-secondary)]">
                    {metadata.map((item, index) => (
                        <React.Fragment key={`${template.id}-${index}-${item}`}>
                            {index > 0 ? (
                                <div className="h-[3px] w-[3px] rounded-full bg-[color-mix(in_srgb,var(--brand-secondary),transparent_50%)]" />
                            ) : null}
                            <span className={index === 0 ? 'capitalize' : undefined}>{item}</span>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </button>
    );
}

function TemplateFlowPreview({ template }: { template: FlowTemplate }): React.ReactElement {
    const previewNodes = useMemo(() => createTemplatePreview(template.nodes), [template.nodes]);

    if (previewNodes.length === 0) {
        const Icon = template.icon;

        return (
            <>
                <div className="absolute inset-0 dark:hidden opacity-[0.05] transition-opacity duration-300 group-hover:opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--brand-secondary) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                <div className="absolute inset-0 hidden dark:block opacity-[0.3] transition-opacity duration-300 group-hover:opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-brand-border) 1px, transparent 0)', backgroundSize: '12px 12px' }} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,var(--brand-background)_120%)]" />
                <div className="z-10 flex h-10 w-10 items-center justify-center rounded-[10px] border border-[color-mix(in_srgb,var(--color-brand-border),transparent_50%)] bg-[var(--brand-surface)] text-[var(--brand-secondary)] shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-[var(--brand-primary-400)]/40 group-hover:text-[var(--brand-primary)] group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
                    <Icon className="h-5 w-5" />
                </div>
            </>
        );
    }

    const minX = Math.min(...previewNodes.map((node) => node.x));
    const minY = Math.min(...previewNodes.map((node) => node.y));
    const maxX = Math.max(...previewNodes.map((node) => node.x + node.width));
    const maxY = Math.max(...previewNodes.map((node) => node.y + node.height));
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);
    const viewBox = `${minX - TEMPLATE_PREVIEW_PADDING} ${minY - TEMPLATE_PREVIEW_PADDING} ${width + TEMPLATE_PREVIEW_PADDING * 2} ${height + TEMPLATE_PREVIEW_PADDING * 2}`;

    return (
        <div className="absolute inset-0 text-[var(--brand-secondary)] overflow-hidden w-full h-full">
            <div className="absolute inset-0 dark:hidden opacity-[0.06] transition-opacity duration-500 group-hover:opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--brand-secondary) 1px, transparent 0)', backgroundSize: '14px 14px' }} />
            <div className="absolute inset-0 hidden dark:block opacity-[0.35] transition-opacity duration-500 group-hover:opacity-[0.5]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-brand-border) 1px, transparent 0)', backgroundSize: '14px 14px' }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,color-mix(in_srgb,var(--brand-primary)_4%,transparent),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            
            <svg
                viewBox={viewBox}
                className="absolute inset-[10%] h-[80%] w-[80%] transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
            >
                {previewNodes.map((node) => (
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

function createTemplatePreview(nodes: FlowNode[]): TemplatePreviewNode[] {
    return nodes
        .filter((node) => !isPreviewContainerNode(node))
        .filter((node) => typeof node.position?.x === 'number' && typeof node.position?.y === 'number')
        .slice(0, TEMPLATE_PREVIEW_MAX_NODES)
        .map((node) => {
            const size = resolveNodeSize(node);
            return {
                id: node.id,
                x: node.position.x,
                y: node.position.y,
                width: clamp(size.width, TEMPLATE_PREVIEW_MIN_NODE_WIDTH, TEMPLATE_PREVIEW_MAX_NODE_WIDTH),
                height: clamp(size.height, TEMPLATE_PREVIEW_MIN_NODE_HEIGHT, TEMPLATE_PREVIEW_MAX_NODE_HEIGHT),
                shape: node.data?.shape,
            };
        });
}

function resolveNodeSize(node: FlowNode): { width: number; height: number } {
    return resolveCanvasNodeSize(node);
}

function isPreviewContainerNode(node: FlowNode): boolean {
    return node.type === 'group' || node.type === 'section' || node.type === 'swimlane';
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function getPreviewNodeRadius(node: TemplatePreviewNode): number {
    if (node.shape === 'capsule') {
        return node.height / 2;
    }

    if (node.shape === 'rectangle') {
        return 12;
    }

    return 20;
}
