import React, { useEffect, useMemo, useState } from 'react';
import { useReactFlow } from '@/lib/reactflowCompat';
import type { FlowNode } from '@/lib/types';
import { Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SearchField } from '../ui/SearchField';
import { SegmentedTabs } from '../ui/SegmentedTabs';
import { Select } from '../ui/Select';
import { ViewHeader } from './ViewHeader';
import { useFlowStore } from '../../store';
import { useTabActions, useTabsState } from '@/store/tabHooks';
import { EMPTY_QUERY, matchesNodeQuery, type QueryState } from './searchQuery';
import { readLocalStorageJson, writeLocalStorageJson } from '@/services/storage/uiLocalStorage';
import { EDITOR_FIELD_COMPACT_CLASS } from '../ui/editorFieldStyles';

interface QueryPreset {
    id: string;
    name: string;
    query: QueryState;
}


interface SearchViewProps {
    nodes: FlowNode[];
    onClose: () => void;
    handleBack: () => void;
}

const QUERY_PRESETS_STORAGE_KEY = 'openflowkit-query-presets-v1';
export const SearchView = ({
    nodes,
    onClose,
    handleBack
}: SearchViewProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [query, setQuery] = useState<QueryState>(EMPTY_QUERY);
    const [scope, setScope] = useState<'current' | 'all'>('current');
    const [presetName, setPresetName] = useState('');
    const [queryPresets, setQueryPresets] = useState<QueryPreset[]>(() => {
        const parsed = readLocalStorageJson<QueryPreset[]>(QUERY_PRESETS_STORAGE_KEY, []);
        return Array.isArray(parsed) ? parsed : [];
    });
    const [selectedPresetId, setSelectedPresetId] = useState('');
    const { fitView } = useReactFlow();
    const { tabs, activeTabId } = useTabsState();
    const { setActiveTabId } = useTabActions();
    const { setSelectedNodeId, setNodes, setEdges } = useFlowStore();

    useEffect(() => {
        writeLocalStorageJson(QUERY_PRESETS_STORAGE_KEY, queryPresets);
    }, [queryPresets]);

    const scopeNodes = useMemo(() => {
        if (scope === 'current') {
            return nodes.map((node) => ({
                node,
                tabId: activeTabId,
                tabName: tabs.find((tab) => tab.id === activeTabId)?.name ?? 'Current',
            }));
        }

        return tabs.flatMap((tab) => {
            const tabNodes = tab.id === activeTabId ? nodes : tab.nodes;
            return tabNodes.map((node) => ({
                node,
                tabId: tab.id,
                tabName: tab.name,
            }));
        });
    }, [scope, nodes, tabs, activeTabId]);

    const filteredNodes = useMemo(() => {
        return scopeNodes.filter((item) => matchesNodeQuery(item.node, query));
    }, [scopeNodes, query]);

    const uniqueNodeTypes = useMemo(
        () => Array.from(new Set(nodes.map((node) => node.type).filter(Boolean))).sort(),
        [nodes]
    );

    const uniqueShapes = useMemo(
        () => Array.from(new Set(nodes.map((node) => node.data?.shape).filter(Boolean))).sort(),
        [nodes]
    );

    const uniqueColors = useMemo(
        () => Array.from(new Set(nodes.map((node) => node.data?.color).filter(Boolean))).sort(),
        [nodes]
    );
    const scopeItems = useMemo(() => ([
        { id: 'current', label: 'Current page' },
        { id: 'all', label: 'All pages' },
    ]), []);
    const nodeTypeOptions = useMemo(() => [{ value: '', label: 'Any type' }, ...uniqueNodeTypes.map((item) => ({ value: item, label: item }))], [uniqueNodeTypes]);
    const shapeOptions = useMemo(() => [{ value: '', label: 'Any shape' }, ...uniqueShapes.map((item) => ({ value: String(item), label: String(item) }))], [uniqueShapes]);
    const colorOptions = useMemo(() => [{ value: '', label: 'Any color' }, ...uniqueColors.map((item) => ({ value: String(item), label: String(item) }))], [uniqueColors]);
    const presetOptions = useMemo(() => [{ value: '', label: 'Load preset...' }, ...queryPresets.map((preset) => ({ value: preset.id, label: preset.name }))], [queryPresets]);

    const handleSelectNode = (node: FlowNode, tabId: string) => {
        if (tabId !== activeTabId) {
            setActiveTabId(tabId);
            navigate(`/flow/${tabId}`);
        }
        setSelectedNodeId(node.id);
        setTimeout(() => {
            fitView({ nodes: [node], duration: 800, padding: 1.5 });
        }, tabId === activeTabId ? 0 : 60);
        onClose();
    };

    function applyQuerySelection(): void {
        const selectedIds = new Set(filteredNodes.filter((item) => item.tabId === activeTabId).map((item) => item.node.id));
        setNodes((existingNodes) => existingNodes.map((node) => ({
            ...node,
            selected: selectedIds.has(node.id),
        })));
        setEdges((existingEdges) => existingEdges.map((edge) => ({ ...edge, selected: false })));
        const activeFilteredNodes = filteredNodes.filter((item) => item.tabId === activeTabId).map((item) => item.node);
        setSelectedNodeId(activeFilteredNodes.length > 0 ? activeFilteredNodes[0].id : null);
        if (activeFilteredNodes.length > 0) {
            fitView({ nodes: activeFilteredNodes, duration: 600, padding: 0.5 });
        }
    }

    function saveQueryPreset(): void {
        const name = presetName.trim();
        if (!name) {
            return;
        }
        const preset: QueryPreset = {
            id: `query-preset-${Date.now()}`,
            name,
            query: { ...query },
        };
        setQueryPresets((existing) => [preset, ...existing]);
        setPresetName('');
        setSelectedPresetId(preset.id);
    }

    function loadPreset(presetId: string): void {
        setSelectedPresetId(presetId);
        const preset = queryPresets.find((item) => item.id === presetId);
        if (!preset) {
            return;
        }
        setQuery(preset.query);
    }

    function deleteSelectedPreset(): void {
        if (!selectedPresetId) {
            return;
        }
        setQueryPresets((existing) => existing.filter((preset) => preset.id !== selectedPresetId));
        setSelectedPresetId('');
    }

    function getInitials(str: string) {
        return str.slice(0, 2).toUpperCase();
    }

    return (
        <div className="flex flex-col h-full">
            <ViewHeader
                title={t('commandBar.search.title')}
                icon={<Search className="w-4 h-4 text-[var(--brand-primary)]" />}
                description="Find nodes quickly across the current page or the whole workspace."
                onBack={handleBack}
                onClose={onClose}
            />

            <div className="border-b border-[var(--color-brand-border)] px-4 py-2">
                <SearchField
                    value={query.text}
                    onChange={e => setQuery((current) => ({ ...current, text: e.target.value }))}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={t('commandBar.search.placeholder')}
                    autoFocus
                />
                <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-brand-border)] bg-[var(--brand-background)]/70 p-3">
                    <SegmentedTabs
                        items={scopeItems}
                        value={scope}
                        onChange={(value) => setScope(value as 'current' | 'all')}
                        size="sm"
                    />
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">
                        <Filter className="h-3.5 w-3.5" />
                        Query Selection
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Select
                            value={query.nodeType}
                            onChange={(value) => setQuery((current) => ({ ...current, nodeType: value }))}
                            options={nodeTypeOptions}
                            placeholder="Any type"
                        />
                        <Select
                            value={query.shape}
                            onChange={(value) => setQuery((current) => ({ ...current, shape: value }))}
                            options={shapeOptions}
                            placeholder="Any shape"
                        />
                        <Select
                            value={query.color}
                            onChange={(value) => setQuery((current) => ({ ...current, color: value }))}
                            options={colorOptions}
                            placeholder="Any color"
                        />
                        <input
                            value={query.labelContains}
                            onChange={(event) => setQuery((current) => ({ ...current, labelContains: event.target.value }))}
                            placeholder="Label contains..."
                            className={`${EDITOR_FIELD_COMPACT_CLASS} px-3`}
                        />
                        <input
                            value={query.metadataKey}
                            onChange={(event) => setQuery((current) => ({ ...current, metadataKey: event.target.value }))}
                            placeholder="Metadata key"
                            className={`${EDITOR_FIELD_COMPACT_CLASS} px-3`}
                        />
                        <input
                            value={query.metadataValue}
                            onChange={(event) => setQuery((current) => ({ ...current, metadataValue: event.target.value }))}
                            placeholder="Metadata value"
                            className={`${EDITOR_FIELD_COMPACT_CLASS} px-3`}
                        />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            onClick={applyQuerySelection}
                            className="h-8 rounded-[var(--brand-radius)] bg-[var(--brand-primary)] px-3 text-xs font-medium text-white"
                        >
                            Apply Selection
                        </button>
                        <button
                            onClick={() => setQuery(EMPTY_QUERY)}
                            className="h-8 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 text-xs text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                        >
                            Clear Query
                        </button>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                        <input
                            value={presetName}
                            onChange={(event) => setPresetName(event.target.value)}
                            placeholder="Preset name"
                            className={EDITOR_FIELD_COMPACT_CLASS}
                        />
                        <button
                            onClick={saveQueryPreset}
                            className="h-8 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 text-xs text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                        >
                            Save Preset
                        </button>
                        <button
                            onClick={deleteSelectedPreset}
                            className="h-8 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 text-xs text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                        >
                            Delete
                        </button>
                    </div>
                    <Select
                        value={selectedPresetId}
                        onChange={loadPreset}
                        options={presetOptions}
                        placeholder="Load preset..."
                        className="mt-2"
                    />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--brand-secondary)]">
                    <span>
                        {t('commandBar.search.showingCount', { count: filteredNodes.length })}
                    </span>
                    <span>
                        {t('commandBar.search.totalCount', { count: scopeNodes.length })}
                    </span>
                </div>
            </div>

            <div className="overflow-y-auto p-2 grid grid-cols-1 gap-1 max-h-[350px]">
                {filteredNodes.map(({ node, tabId, tabName }) => (
                    <div
                        key={`${tabId}:${node.id}`}
                        onClick={() => handleSelectNode(node, tabId)}
                        className="group flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border border-transparent p-3 transition-all hover:border-[var(--color-brand-border)] hover:bg-[var(--brand-background)]/70"
                    >
                        <div className={`w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 text-white font-bold text-xs
                            ${node.type === 'start' ? 'bg-emerald-500' :
                                node.type === 'end' ? 'bg-red-500' :
                                    node.type === 'decision' ? 'bg-amber-500' :
                                        'bg-blue-500'}
                        `}>
                            {getInitials(node.data?.label || node.type || '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="truncate text-sm font-medium text-[var(--brand-text)] group-hover:text-[var(--brand-primary-700)]">
                                {node.data?.label || t('commandBar.search.untitled')}
                            </h4>
                            <p className="line-clamp-1 text-xs text-[var(--brand-secondary)]">
                                {node.data?.subLabel || `${t('commandBar.search.type')}: ${node.type}`}
                            </p>
                        </div>
                        <div className="rounded bg-[var(--brand-surface)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--brand-secondary)]">
                            {node.id}
                        </div>
                        {scope === 'all' && (
                            <div className="rounded bg-[var(--brand-surface)] px-1.5 py-0.5 text-[10px] text-[var(--brand-secondary)]">
                                {tabName}
                            </div>
                        )}
                    </div>
                ))}
                {filteredNodes.length === 0 && (
                    <div className="py-8 text-center text-sm text-[var(--brand-secondary)]">{t('commandBar.search.noResults')}</div>
                )}
            </div>
        </div>
    );
};
