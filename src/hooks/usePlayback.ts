import { useState, useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from '@/lib/reactflowCompat';
import { useFlowStore } from '../store';
import {
    applyPlaybackStepStyles,
    buildPlaybackSequence,
    buildPlaybackSequenceFromState,
    capturePlaybackStyles,
    restorePlaybackStyles,
} from '@/services/playback/contracts';

export function usePlayback() {
    const { nodes, tabs, activeTabId, setNodes } = useFlowStore();
    const { fitView } = useReactFlow();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [playbackSpeed, setPlaybackSpeed] = useState(2000);
    const [steps, setSteps] = useState(() => buildPlaybackSequence([]).steps);

    const initialStyles = useRef(capturePlaybackStyles([]));

    const resolveSequence = useCallback(() => {
        const activeTabPlayback = tabs.find((tab) => tab.id === activeTabId)?.playback;
        return buildPlaybackSequenceFromState(nodes, activeTabPlayback, playbackSpeed);
    }, [activeTabId, nodes, playbackSpeed, tabs]);

    const restoreStyles = useCallback(() => {
        if (Object.keys(initialStyles.current).length > 0) {
            setNodes((nds) => restorePlaybackStyles(nds, initialStyles.current));
            initialStyles.current = {};
        }
    }, [setNodes]);

    const startPlayback = useCallback(() => {
        if (Object.keys(initialStyles.current).length === 0) {
            initialStyles.current = capturePlaybackStyles(nodes);
        }

        const sequence = resolveSequence();
        setSteps(sequence.steps);
        setCurrentStepIndex(sequence.steps.length > 0 ? 0 : -1);
        setIsPlaying(false);
    }, [nodes, resolveSequence]);

    const jumpToStep = useCallback((stepIndex: number) => {
        const normalizedIndex = Math.max(0, stepIndex);

        if (Object.keys(initialStyles.current).length === 0) {
            initialStyles.current = capturePlaybackStyles(nodes);
        }

        const sequence = resolveSequence();
        if (sequence.steps.length === 0) {
            setSteps([]);
            setCurrentStepIndex(-1);
            setIsPlaying(false);
            return;
        }

        setSteps(sequence.steps);
        setCurrentStepIndex(Math.min(normalizedIndex, sequence.steps.length - 1));
        setIsPlaying(false);
    }, [nodes, resolveSequence]);

    const stopPlayback = useCallback(() => {
        setIsPlaying(false);
        setCurrentStepIndex(-1);
        restoreStyles();
    }, [restoreStyles]);

    const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

    const nextStep = useCallback(() => {
        setCurrentStepIndex(prev => {
            if (prev < steps.length - 1) return prev + 1;
            setIsPlaying(false);
            return prev;
        });
    }, [steps.length]);

    const prevStep = useCallback(() => {
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        const isFinished = currentStepIndex >= steps.length - 1;

        if (isPlaying && !isFinished) {
            interval = setInterval(nextStep, playbackSpeed);
        }

        return () => { if (interval) clearInterval(interval); };
    }, [isPlaying, currentStepIndex, playbackSpeed, steps.length, nextStep]);

    useEffect(() => {
        if (currentStepIndex < 0 || !steps[currentStepIndex]) return;

        const step = steps[currentStepIndex];

        setNodes((nds) => applyPlaybackStepStyles(nds, step, initialStyles.current));

        fitView({
            nodes: [{ id: step.nodeId }],
            duration: step.viewport.duration,
            padding: step.viewport.padding,
            minZoom: step.viewport.minZoom,
            maxZoom: step.viewport.maxZoom
        });
    }, [currentStepIndex, steps, fitView, setNodes]);

    return {
        isPlaying,
        currentStepIndex,
        totalSteps: steps.length,
        startPlayback,
        stopPlayback,
        togglePlay,
        nextStep,
        prevStep,
        setPlaybackSpeed,
        playbackSpeed,
        jumpToStep,
    };
}
