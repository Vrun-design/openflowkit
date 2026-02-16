import { useState, useCallback, useEffect, useRef } from 'react';
import { useReactFlow, Node, Edge } from 'reactflow';
import { useFlowStore } from '../store';

export interface PlaybackState {
    isPlaying: boolean;
    currentStepIndex: number; // -1 if not started
    totalSteps: number;
    steps: string[]; // Array of Node IDs
    playbackSpeed: number; // ms
}

export function usePlayback() {
    const { nodes, edges, setNodes } = useFlowStore();
    const { fitView } = useReactFlow();

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [playbackSpeed, setPlaybackSpeed] = useState(2000);
    const [steps, setSteps] = useState<string[]>([]);

    const playbackInterval = useRef<NodeJS.Timeout | null>(null);
    const initialStyles = useRef<Record<string, any>>({});

    // 1. Generate Sequence (Top-Left to Bottom-Right)
    const generateSequence = useCallback(() => {
        return [...nodes]
            .sort((a, b) => {
                const yDiff = a.position.y - b.position.y;
                // Group by rows (within 50px tolerance)
                if (Math.abs(yDiff) > 50) return yDiff;
                // Then sort by column
                return a.position.x - b.position.x;
            })
            .map(n => n.id);
    }, [nodes]);

    // Restore styles when stopping
    const restoreStyles = useCallback(() => {
        if (Object.keys(initialStyles.current).length > 0) {
            setNodes(nds => nds.map(n => {
                const originalStyle = initialStyles.current[n.id];
                return originalStyle ? { ...n, style: originalStyle } : n;
            }));
            initialStyles.current = {};
        }
    }, [setNodes]);

    // Playback Controls
    const startPlayback = useCallback(() => {
        // Capture initial styles
        if (Object.keys(initialStyles.current).length === 0) {
            const styles: Record<string, any> = {};
            nodes.forEach(n => { styles[n.id] = n.style || {}; });
            initialStyles.current = styles;
        }

        const newSteps = generateSequence();
        setSteps(newSteps);
        setCurrentStepIndex(0);
        setIsPlaying(false); // Start manually as requested
    }, [generateSequence, nodes]);

    const stopPlayback = useCallback(() => {
        setIsPlaying(false);
        setCurrentStepIndex(-1);
        restoreStyles();
        if (playbackInterval.current) clearInterval(playbackInterval.current);
    }, [restoreStyles]);

    const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

    const nextStep = useCallback(() => {
        setCurrentStepIndex(prev => {
            if (prev < steps.length - 1) return prev + 1;
            setIsPlaying(false); // Pause at end
            return prev;
        });
    }, [steps.length]);

    const prevStep = useCallback(() => {
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
    }, []);

    // Auto-Advance Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        const isFinished = currentStepIndex >= steps.length - 1;

        if (isPlaying && !isFinished) {
            interval = setInterval(nextStep, playbackSpeed);
        } else if (isPlaying && isFinished) {
            setIsPlaying(false);
        }

        return () => { if (interval) clearInterval(interval); };
    }, [isPlaying, currentStepIndex, playbackSpeed, steps.length, nextStep]);

    // Viewport & Focus Effect
    useEffect(() => {
        if (currentStepIndex < 0 || !steps[currentStepIndex]) return;

        const nodeId = steps[currentStepIndex];

        // Apply Focus Styles
        setNodes(nds => nds.map(n => {
            const isActive = n.id === nodeId;
            return {
                ...n,
                style: {
                    ...n.style,
                    opacity: isActive ? 1 : 0.2,
                    filter: isActive
                        ? 'drop-shadow(0 0 12px var(--brand-primary))'
                        : 'grayscale(100%)',
                    transition: 'all 0.5s ease'
                }
            };
        }));

        // Focus Viewport
        fitView({
            nodes: [{ id: nodeId }],
            duration: 800,
            padding: 2,
            minZoom: 0.5,
            maxZoom: 1.5
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
        setPlaybackSpeed
    };
}
