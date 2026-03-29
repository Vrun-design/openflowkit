import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Layers, Lock, LockOpen, MoveVertical, Plus, Trash2, SquareStack, Crosshair, ArrowDown, ArrowUp, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFlowStore } from '@/store';
import { ViewHeader } from './ViewHeader';
import { useReactFlow } from '@/lib/reactflowCompat';
import { getNodeParentId } from '@/lib/nodeParent';
import { getSectionOrder } from '@/hooks/node-operations/utils';

interface LayersViewProps {
    onClose: () => void;
    handleBack: () => void;
}

export function LayersView({ onClose, handleBack }: LayersViewProps): React.ReactElement {
    const { t } = useTranslation();
    const [newLayerName, setNewLayerName] = useState('');
    const [sectionCursorId, setSectionCursorId] = useState<string | null>(null);
    const { fitView } = useReactFlow();
    const {
        layers,
        activeLayerId,
        nodes,
        setNodes,
        setSelectedNodeId,
        setActiveLayerId,
        addLayer,
        renameLayer,
        deleteLayer,
        toggleLayerVisibility,
        toggleLayerLock,
        moveLayer,
        moveSelectedNodesToLayer,
        selectNodesInLayer,
    } = useFlowStore();

    const orderedSections = useMemo(() => {
        const sectionById = new Map(
            nodes
                .filter((node) => node.type === 'section')
                .map((node) => [node.id, node])
        );

        return nodes
            .filter((node) => node.type === 'section')
            .sort((left, right) => {
                const orderDiff = getSectionOrder(left) - getSectionOrder(right);
                if (orderDiff !== 0) {
                    return orderDiff;
                }
                return left.position.y - right.position.y || left.position.x - right.position.x;
            })
            .map((section) => {
                let depth = 0;
                let parentId = getNodeParentId(section);

                while (parentId) {
                    const parent = sectionById.get(parentId);
                    if (!parent) {
                        break;
                    }
                    depth += 1;
                    parentId = getNodeParentId(parent);
                }

                return { section, depth };
            });
    }, [nodes]);

    function focusSection(sectionId: string): void {
        const targetSection = orderedSections.find((entry) => entry.section.id === sectionId)?.section;
        if (!targetSection) {
            return;
        }

        setSectionCursorId(sectionId);
        setSelectedNodeId(sectionId);
        fitView({ nodes: [targetSection], duration: 500, padding: 0.45 });
    }

    function moveSectionOrder(sectionId: string, direction: 'up' | 'down'): void {
        const index = orderedSections.findIndex((entry) => entry.section.id === sectionId);
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (index < 0 || swapIndex < 0 || swapIndex >= orderedSections.length) {
            return;
        }

        const current = orderedSections[index]?.section;
        const target = orderedSections[swapIndex]?.section;
        if (!current || !target) {
            return;
        }

        setNodes((existingNodes) => existingNodes.map((node) => {
            if (node.id === current.id) {
                return { ...node, data: { ...node.data, sectionOrder: getSectionOrder(target) } };
            }
            if (node.id === target.id) {
                return { ...node, data: { ...node.data, sectionOrder: getSectionOrder(current) } };
            }
            return node;
        }));
    }

    function toggleSectionFlag(sectionId: string, field: 'sectionHidden' | 'sectionLocked'): void {
        setNodes((existingNodes) => existingNodes.map((node) => (
            node.id === sectionId
                ? { ...node, data: { ...node.data, [field]: node.data?.[field] !== true } }
                : node
        )));
    }

    function focusRelativeSection(direction: 'prev' | 'next'): void {
        if (orderedSections.length === 0) {
            return;
        }

        const activeIndex = sectionCursorId
            ? orderedSections.findIndex((entry) => entry.section.id === sectionCursorId)
            : -1;
        const nextIndex = direction === 'next'
            ? Math.min(activeIndex + 1, orderedSections.length - 1)
            : Math.max(activeIndex === -1 ? 0 : activeIndex - 1, 0);

        focusSection(orderedSections[nextIndex]?.section.id ?? orderedSections[0].section.id);
    }

    function handleAddLayer(): void {
        const name = newLayerName.trim();
        const id = addLayer(name || undefined);
        setActiveLayerId(id);
        setNewLayerName('');
    }

    return (
        <div className="flex h-full flex-col">
            <ViewHeader title={t('commandBar.layers.title', 'Layers')} icon={<Layers className="h-4 w-4 text-[var(--brand-primary)]" />} onBack={handleBack} />

            <div className="border-b border-[var(--color-brand-border)] px-4 py-2">
                <div className="flex items-center gap-2">
                    <input
                        value={newLayerName}
                        onChange={(event) => setNewLayerName(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                handleAddLayer();
                            }
                        }}
                        placeholder={t('commandBar.layers.newLayerName', 'New layer name')}
                        className="h-9 w-full rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-3 text-sm"
                    />
                    <button
                        onClick={handleAddLayer}
                        className="inline-flex h-9 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-3 text-xs font-medium"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        {t('commandBar.layers.add', 'Add')}
                    </button>
                </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {layers.map((layer) => (
                    <div
                        key={layer.id}
                        className={`rounded-[var(--radius-md)] border p-3 ${
                            activeLayerId === layer.id ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]' : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)]'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <input
                                value={layer.name}
                                onChange={(event) => renameLayer(layer.id, event.target.value)}
                                className="h-8 w-full rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-xs"
                            />
                            <button
                                onClick={() => setActiveLayerId(layer.id)}
                                className="h-8 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] px-2 text-[11px]"
                            >
                                {t('commandBar.layers.active', 'Active')}
                            </button>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => toggleLayerVisibility(layer.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                            >
                                {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                {layer.visible ? t('commandBar.layers.visible', 'Visible') : t('commandBar.layers.hidden', 'Hidden')}
                            </button>
                            <button
                                onClick={() => toggleLayerLock(layer.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                            >
                                {layer.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                                {layer.locked ? t('commandBar.layers.locked', 'Locked') : t('commandBar.layers.unlocked', 'Unlocked')}
                            </button>
                            <button
                                onClick={() => moveSelectedNodesToLayer(layer.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                            >
                                <MoveVertical className="h-3 w-3" />
                                {t('commandBar.layers.moveSelectedHere', 'Move Selected Here')}
                            </button>
                            <button
                                onClick={() => selectNodesInLayer(layer.id)}
                                className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                            >
                                {t('commandBar.layers.selectLayer', 'Select Layer')}
                            </button>
                            <button
                                onClick={() => moveLayer(layer.id, 'up')}
                                className="inline-flex h-7 items-center rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                            >
                                {t('commandBar.layers.up', 'Up')}
                            </button>
                            <button
                                onClick={() => moveLayer(layer.id, 'down')}
                                className="inline-flex h-7 items-center rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                            >
                                {t('commandBar.layers.down', 'Down')}
                            </button>
                            {layer.id !== 'default' && (
                                <button
                                    onClick={() => deleteLayer(layer.id)}
                                    className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-red-200 bg-red-50 px-2 text-[11px] text-red-600"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    {t('common.delete', 'Delete')}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-3">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-text)]">
                            <SquareStack className="h-4 w-4 text-[var(--brand-primary)]" />
                            {t('commandBar.layers.sections', 'Sections')}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => focusRelativeSection('prev')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)]"
                                title={t('commandBar.layers.previousSection', 'Previous section')}
                            >
                                <SkipBack className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => focusRelativeSection('next')}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)]"
                                title={t('commandBar.layers.nextSection', 'Next section')}
                            >
                                <SkipForward className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {orderedSections.length === 0 ? (
                            <div className="rounded-[var(--brand-radius)] border border-dashed border-[var(--color-brand-border)] px-3 py-4 text-xs text-[var(--brand-secondary)]">
                                {t('commandBar.layers.noSections', 'No sections yet.')}
                            </div>
                        ) : orderedSections.map(({ section, depth }) => (
                            <div
                                key={section.id}
                                className={`rounded-[var(--brand-radius)] border px-3 py-2 ${
                                    sectionCursorId === section.id
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]'
                                        : 'border-[var(--color-brand-border)]'
                                }`}
                                style={{ marginLeft: `${depth * 14}px` }}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-[var(--brand-text)]">
                                            {section.data?.label || t('commandBar.layers.sectionFallbackName', 'Section')}
                                        </div>
                                        <div className="text-[11px] text-[var(--brand-secondary)]">
                                            {t('commandBar.layers.order', {
                                                order: getSectionOrder(section),
                                                defaultValue: 'Order {{order}}',
                                            })}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => focusSection(section.id)}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                                    >
                                        <Crosshair className="h-3 w-3" />
                                        {t('commandBar.layers.focus', 'Focus')}
                                    </button>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => toggleSectionFlag(section.id, 'sectionHidden')}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                                    >
                                        {section.data?.sectionHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                        {section.data?.sectionHidden ? t('commandBar.layers.show', 'Show') : t('commandBar.layers.hide', 'Hide')}
                                    </button>
                                    <button
                                        onClick={() => toggleSectionFlag(section.id, 'sectionLocked')}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                                    >
                                        {section.data?.sectionLocked ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                                        {section.data?.sectionLocked ? t('commandBar.layers.unlock', 'Unlock') : t('commandBar.layers.lock', 'Lock')}
                                    </button>
                                    <button
                                        onClick={() => moveSectionOrder(section.id, 'up')}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                                    >
                                        <ArrowUp className="h-3 w-3" />
                                        {t('commandBar.layers.up', 'Up')}
                                    </button>
                                    <button
                                        onClick={() => moveSectionOrder(section.id, 'down')}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] bg-[var(--brand-surface)] px-2 text-[11px]"
                                    >
                                        <ArrowDown className="h-3 w-3" />
                                        {t('commandBar.layers.down', 'Down')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t border-[var(--color-brand-border)] px-4 py-2 text-[11px] text-[var(--brand-secondary)]">
                {t('commandBar.layers.footerHint', 'Layer lock disables drag. Hidden layers are excluded from canvas render.')}
                <button
                    onClick={onClose}
                    className="ml-2 rounded-[var(--brand-radius)] border border-[var(--brand-secondary)] px-2 py-1 text-[11px]"
                >
                    {t('common.done', 'Done')}
                </button>
            </div>
        </div>
    );
}
