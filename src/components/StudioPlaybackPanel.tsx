import React from 'react';
import { CheckCircle2, Eye, Film, ListOrdered, MoveDown, MoveUp, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEditorPageActions, useEditorPagesState } from '@/store/editorPageHooks';
import type { FlowEdge, FlowNode, PlaybackState } from '@/lib/types';
import { createEmptyPlaybackState } from '@/services/playback/model';
import {
    addPlaybackScene,
    deletePlaybackScene,
    generatePlaybackStateFromGraph,
    getPlaybackStepsForSelectedScene,
    reorderPlaybackTimelineStep,
    renamePlaybackScene,
    selectPlaybackScene,
    setPlaybackDefaultDuration,
    setPlaybackStepDuration,
    togglePlaybackStepInScene,
    type PlaybackGenerationPreset,
} from '@/services/playback/studio';

interface StudioPlaybackPanelProps {
    nodes: FlowNode[];
    edges: FlowEdge[];
    currentStepIndex: number;
    totalSteps: number;
    isPlaying: boolean;
    onStartPlayback: () => void;
    onPlayPause: () => void;
    onStop: () => void;
    onScrubToStep: (index: number) => void;
    onNext: () => void;
    onPrev: () => void;
    playbackSpeed: number;
    onPlaybackSpeedChange: (durationMs: number) => void;
}

const PRESET_LABELS: Record<PlaybackGenerationPreset, { label: string; description: string }> = {
    smart: { label: 'Smart', description: 'Topology first, then layout tie-breaks' },
    'top-to-bottom': { label: 'Top to bottom', description: 'Best for vertical flows and runbooks' },
    'left-to-right': { label: 'Left to right', description: 'Best for pipelines and timelines' },
    reverse: { label: 'Reverse', description: 'Flip the current visual reading order' },
};

function PlaybackPanelSection({
    title,
    children,
    description,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}): React.ReactElement {
    return (
        <section className="rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] shadow-sm">
            <div className="border-b border-[var(--color-brand-border)] px-4 py-3">
                <h4 className="text-sm font-semibold text-[var(--brand-text)]">{title}</h4>
                {description ? <p className="mt-1 text-xs text-[var(--brand-secondary)]">{description}</p> : null}
            </div>
            <div className="px-4 py-3">{children}</div>
        </section>
    );
}

export function StudioPlaybackPanel({
    nodes,
    edges,
    currentStepIndex,
    totalSteps,
    isPlaying,
    onStartPlayback,
    onPlayPause,
    onStop,
    onScrubToStep,
    onNext,
    onPrev,
    playbackSpeed,
    onPlaybackSpeedChange,
}: StudioPlaybackPanelProps): React.ReactElement {
    const { pages, activePageId } = useEditorPagesState();
    const { updatePage } = useEditorPageActions();
    const activePage = pages.find((page) => page.id === activePageId);
    // Keep the raw persisted value as a stable reference for memoization.
    // The fallback empty state is resolved inside consumers to avoid creating
    // a new object on every render (which would break React Compiler deps).
    const persistedPlayback = activePage?.playback;
    // Stable empty-state fallback — created once so React Compiler can track it as a
    // stable dependency alongside `persistedPlayback` without seeing an inline allocation.
    const playback = persistedPlayback ?? createEmptyPlaybackState();
    const selectedScene = playback.selectedSceneId
        ? playback.scenes.find((scene) => scene.id === playback.selectedSceneId) ?? null
        : null;
    const sceneSteps = getPlaybackStepsForSelectedScene(playback);
    const scrubMax = Math.max(sceneSteps.length - 1, 0);
    const scrubValue = currentStepIndex >= 0 ? Math.min(currentStepIndex, scrubMax) : 0;

    function commitPlayback(nextPlayback: PlaybackState): void {
        updatePage(activePageId, { playback: nextPlayback });
    }

    function applyPreset(preset: PlaybackGenerationPreset): void {
        const nextPlayback = generatePlaybackStateFromGraph(nodes, edges, preset, playback);
        commitPlayback(nextPlayback);
        onPlaybackSpeedChange(nextPlayback.defaultStepDurationMs);
    }

    const hasPlayback = playback.timeline.length > 0;

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <PlaybackPanelSection
                title="Playback Studio"
                description="Build a guided walkthrough with ordered scenes, stable step timing, and on-canvas preview."
            >
                <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(PRESET_LABELS) as PlaybackGenerationPreset[]).map((preset) => (
                        <button
                            key={preset}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-3 py-2 text-left transition-colors hover:border-[var(--brand-primary-200)] hover:bg-[var(--brand-primary-50)]"
                        >
                            <div className="text-sm font-semibold text-[var(--brand-text)]">{PRESET_LABELS[preset].label}</div>
                            <div className="mt-1 text-[11px] leading-5 text-[var(--brand-secondary)]">{PRESET_LABELS[preset].description}</div>
                        </button>
                    ))}
                </div>
            </PlaybackPanelSection>

            <PlaybackPanelSection
                title="Scenes"
                description="Scenes control which steps belong together and what order they preview in."
            >
                <div className="space-y-2">
                    {playback.scenes.map((scene) => {
                        const isSelected = scene.id === playback.selectedSceneId;
                        return (
                            <div
                                key={scene.id}
                                className={`rounded-[var(--radius-xs)] border px-3 py-2 ${isSelected ? 'border-[var(--brand-primary-300)] bg-[var(--brand-primary-50)]' : 'border-[var(--color-brand-border)] bg-[var(--brand-background)]'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => commitPlayback(selectPlaybackScene(playback, scene.id))}
                                        className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)]"
                                        aria-label={`Select ${scene.name}`}
                                    >
                                        {isSelected ? <span className="block h-2 w-2 rounded-full bg-[var(--brand-primary)]" /> : null}
                                    </button>
                                    <input
                                        value={scene.name}
                                        onChange={(event) => commitPlayback(renamePlaybackScene(playback, scene.id, event.target.value))}
                                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--brand-text)] outline-none"
                                    />
                                    <span className="rounded-full bg-[var(--brand-surface)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">
                                        {scene.mode ?? 'auto'}
                                    </span>
                                    {scene.id !== 'scene-main' ? (
                                        <button
                                            type="button"
                                            onClick={() => commitPlayback(deletePlaybackScene(playback, scene.id))}
                                            className="rounded-full p-1 text-[var(--brand-secondary)] transition-colors hover:bg-red-50 hover:text-red-600"
                                            aria-label={`Delete ${scene.name}`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={() => commitPlayback(addPlaybackScene(playback))}
                    className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-xs font-semibold text-[var(--brand-text)] transition-colors hover:border-[var(--brand-primary-200)] hover:text-[var(--brand-primary)]"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add scene
                </button>
            </PlaybackPanelSection>

            <PlaybackPanelSection
                title="Timeline"
                description="Use the scrubber to preview step order, then fine-tune the selected scene."
            >
                {hasPlayback ? (
                    <div className="space-y-4">
                        <div className="rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">Preview</div>
                                    <div className="mt-1 text-sm font-medium text-[var(--brand-text)]">
                                        {currentStepIndex >= 0 ? `Step ${scrubValue + 1} of ${Math.max(totalSteps, sceneSteps.length)}` : 'Ready to preview'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onPrev}
                                        className="rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-2 text-[var(--brand-secondary)] hover:text-[var(--brand-text)]"
                                        aria-label="Previous step"
                                    >
                                        <MoveUp className="h-3.5 w-3.5 rotate-90" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={currentStepIndex >= 0 ? onPlayPause : onStartPlayback}
                                        className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-600)]"
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                        {currentStepIndex >= 0 ? (isPlaying ? 'Pause' : 'Play') : 'Preview'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onNext}
                                        className="rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-2 text-[var(--brand-secondary)] hover:text-[var(--brand-text)]"
                                        aria-label="Next step"
                                    >
                                        <MoveDown className="h-3.5 w-3.5 rotate-90" />
                                    </button>
                                    {currentStepIndex >= 0 ? (
                                        <button
                                            type="button"
                                            onClick={onStop}
                                            className="rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-2 text-[var(--brand-secondary)] hover:text-red-600"
                                            aria-label="Stop preview"
                                        >
                                            <Film className="h-3.5 w-3.5" />
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={scrubMax}
                                step={1}
                                value={scrubValue}
                                onChange={(event) => onScrubToStep(Number(event.target.value))}
                                className="mt-4 w-full accent-[var(--brand-primary)]"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-background)] px-3 py-2">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">Default step duration</div>
                                <div className="mt-1 text-[11px] text-[var(--brand-secondary)]">Used for new presets and fallback timing</div>
                            </div>
                            <input
                                type="number"
                                min={200}
                                step={100}
                                value={playbackSpeed}
                                onChange={(event) => {
                                    const next = Math.max(200, Number(event.target.value) || playback.defaultStepDurationMs);
                                    onPlaybackSpeedChange(next);
                                    commitPlayback(setPlaybackDefaultDuration(playback, next));
                                }}
                                className="w-24 rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            {playback.timeline.map((step, index) => {
                                const node = nodes.find((candidate) => candidate.id === step.nodeId);
                                const includedInSelectedScene = selectedScene ? selectedScene.stepIds.includes(step.id) : true;
                                return (
                                    <div
                                        key={step.id}
                                        className={`rounded-[var(--radius-xs)] border px-3 py-2 ${includedInSelectedScene ? 'border-[var(--color-brand-border)] bg-[var(--brand-surface)]' : 'border-[var(--color-brand-border)] bg-[var(--brand-background)]/60 opacity-70'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {selectedScene ? (
                                                <button
                                                    type="button"
                                                    onClick={() => commitPlayback(togglePlaybackStepInScene(playback, selectedScene.id, step.id))}
                                                    className={`flex h-5 w-5 items-center justify-center rounded border ${includedInSelectedScene ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white' : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-transparent'}`}
                                                    aria-label={`Toggle ${node?.data.label ?? step.nodeId} in scene`}
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                </button>
                                            ) : null}
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-[var(--brand-text)]">{node?.data.label ?? step.nodeId}</div>
                                                <div className="text-[11px] text-[var(--brand-secondary)]">{step.nodeId}</div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => commitPlayback(reorderPlaybackTimelineStep(playback, step.id, 'up'))}
                                                    disabled={index === 0}
                                                    className="rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-1.5 text-[var(--brand-secondary)] disabled:opacity-40"
                                                    aria-label={`Move ${step.nodeId} up`}
                                                >
                                                    <MoveUp className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => commitPlayback(reorderPlaybackTimelineStep(playback, step.id, 'down'))}
                                                    disabled={index === playback.timeline.length - 1}
                                                    className="rounded-full border border-[var(--color-brand-border)] bg-[var(--brand-surface)] p-1.5 text-[var(--brand-secondary)] disabled:opacity-40"
                                                    aria-label={`Move ${step.nodeId} down`}
                                                >
                                                    <MoveDown className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                            <input
                                                type="number"
                                                min={200}
                                                step={100}
                                                value={step.durationMs ?? playback.defaultStepDurationMs}
                                                onChange={(event) => {
                                                    const nextDuration = Math.max(200, Number(event.target.value) || playback.defaultStepDurationMs);
                                                    commitPlayback(setPlaybackStepDuration(playback, step.id, nextDuration));
                                                }}
                                                className="w-20 rounded-[var(--radius-xs)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 py-1.5 text-sm"
                                                aria-label={`Duration for ${step.nodeId}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-[var(--radius-xs)] border border-dashed border-[var(--color-brand-border)] bg-[var(--brand-background)] px-4 py-8 text-center">
                        <ListOrdered className="mx-auto h-6 w-6 text-[var(--brand-secondary)]" />
                        <div className="mt-3 text-sm font-medium text-[var(--brand-text)]">No playback timeline yet</div>
                        <div className="mt-1 text-xs text-[var(--brand-secondary)]">Generate a preset to create scenes and stable step order from the current graph.</div>
                        <button
                            type="button"
                            onClick={() => applyPreset('smart')}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-primary-600)]"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Generate smart timeline
                        </button>
                    </div>
                )}
            </PlaybackPanelSection>
        </div>
    );
}
