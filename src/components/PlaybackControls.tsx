import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Square } from 'lucide-react';
import { Button } from './ui/Button';

interface PlaybackControlsProps {
    isPlaying: boolean;
    currentStepIndex: number;
    totalSteps: number;
    onPlayPause: () => void;
    onNext: () => void;
    onPrev: () => void;
    onStop: () => void;
}

export function PlaybackControls({
    isPlaying,
    currentStepIndex,
    totalSteps,
    onPlayPause,
    onNext,
    onPrev,
    onStop
}: PlaybackControlsProps) {
    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center p-1.5 bg-white/90 backdrop-blur-xl shadow-2xl rounded-[var(--radius-lg)] border border-white/20 ring-1 ring-black/5 transition-all duration-300 z-50 gap-1">

            {/* Group 1: Step Counter */}
            <div className="flex items-center justify-center bg-slate-100/50 px-3 py-1.5 rounded-[var(--radius-md)] border border-slate-200/60 min-w-[80px]">
                <span className="text-xs font-mono text-[var(--brand-primary)] font-bold">{currentStepIndex + 1}</span>
                <span className="text-xs font-mono text-slate-400 mx-1">/</span>
                <span className="text-xs font-mono text-slate-500">{totalSteps}</span>
            </div>

            <div className="w-px h-6 bg-slate-200/50 mx-1" />

            {/* Group 2: Controls */}
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPrev}
                    disabled={currentStepIndex <= 0}
                    className="h-9 w-9 text-slate-500 hover:text-slate-900 rounded-[var(--radius-sm)]"
                >
                    <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                    variant="primary"
                    size="icon"
                    onClick={onPlayPause}
                    className="h-10 w-10 shadow-md bg-[var(--brand-primary)] hover:brightness-110 rounded-[var(--radius-sm)]"
                >
                    {isPlaying ? (
                        <Pause className="w-5 h-5 text-white" />
                    ) : (
                        <Play className="w-5 h-5 text-white ml-0.5" />
                    )}
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onNext}
                    disabled={currentStepIndex >= totalSteps - 1}
                    className="h-9 w-9 text-slate-500 hover:text-slate-900 rounded-[var(--radius-sm)]"
                >
                    <SkipForward className="w-4 h-4" />
                </Button>
            </div>

            <div className="w-px h-6 bg-slate-200/50 mx-1" />

            {/* Group 3: Exit */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onStop}
                className="h-10 px-3 text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-[var(--radius-sm)]"
            >
                Stop
            </Button>
        </div>
    );
}
