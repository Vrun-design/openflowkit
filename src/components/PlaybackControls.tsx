import React from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Button } from './ui/Button';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    return (
        <div className="absolute bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-[var(--radius-lg)] border border-[var(--color-brand-border)]/70 bg-[var(--brand-surface)]/90 p-1.5 shadow-[var(--shadow-md)] ring-1 ring-black/5 backdrop-blur-xl transition-all duration-300">

            {/* Group 1: Step Counter */}
            <div className="flex min-w-[80px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-brand-border)]/60 bg-[var(--brand-background)]/70 px-3 py-1.5">
                <span className="text-xs font-mono text-[var(--brand-primary)] font-bold">{currentStepIndex + 1}</span>
                <span className="mx-1 text-xs font-mono text-[var(--brand-secondary)]">/</span>
                <span className="text-xs font-mono text-[var(--brand-secondary)]">{totalSteps}</span>
            </div>

            <div className="mx-1 h-6 w-px bg-[var(--color-brand-border)]/60" />

            {/* Group 2: Controls */}
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onPrev}
                    disabled={currentStepIndex <= 0}
                    className="rounded-[var(--radius-sm)] text-[var(--brand-secondary)] hover:text-[var(--brand-text)]"
                >
                    <SkipBack className="w-4 h-4" />
                </Button>

                <Button
                    variant="primary"
                    size="icon"
                    onClick={onPlayPause}
                    className="rounded-[var(--radius-sm)] bg-[var(--brand-primary)] shadow-[var(--shadow-sm)] hover:brightness-110"
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
                    className="rounded-[var(--radius-sm)] text-[var(--brand-secondary)] hover:text-[var(--brand-text)]"
                >
                    <SkipForward className="w-4 h-4" />
                </Button>
            </div>

            <div className="mx-1 h-6 w-px bg-[var(--color-brand-border)]/60" />

            {/* Group 3: Exit */}
            <Button
                variant="ghost"
                size="md"
                onClick={onStop}
                className="rounded-[var(--radius-sm)] px-3 font-medium text-[var(--brand-secondary)] hover:bg-red-500/10 hover:text-red-500"
            >
                {t('playbackControls.stop')}
            </Button>
        </div>
    );
}
