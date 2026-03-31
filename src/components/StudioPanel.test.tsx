import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudioPanel } from './StudioPanel';

vi.mock('./StudioAIPanel', () => ({
  StudioAIPanel: () => <div data-testid="studio-ai-panel" />,
}));

vi.mock('./StudioCodePanel', () => ({
  StudioCodePanel: () => <div data-testid="studio-code-panel" />,
}));

function createProps(): React.ComponentProps<typeof StudioPanel> {
  return {
    onClose: vi.fn(),
    nodes: [],
    edges: [],
    onApply: vi.fn(),
    onAIGenerate: vi.fn(async () => true),
    isGenerating: false,
    streamingText: null,
    retryCount: 0,
    cancelGeneration: vi.fn(),
    pendingDiff: null,
    onConfirmDiff: vi.fn(),
    onDiscardDiff: vi.fn(),
    aiReadiness: {
      canGenerate: true,
      blockingIssue: null,
      advisory: null,
    },
    lastAIError: null,
    onClearAIError: vi.fn(),
    chatMessages: [],
    assistantThread: [],
    onClearChat: vi.fn(),
    activeTab: 'ai',
    onTabChange: vi.fn(),
    codeMode: 'openflow',
    onCodeModeChange: vi.fn(),
    selectedNode: null,
    selectedNodeCount: 0,
    onViewProperties: vi.fn(),
    playback: {
      currentStepIndex: -1,
      totalSteps: 0,
      isPlaying: false,
      onStartPlayback: vi.fn(),
      onPlayPause: vi.fn(),
      onStop: vi.fn(),
      onScrubToStep: vi.fn(),
      onNext: vi.fn(),
      onPrev: vi.fn(),
      playbackSpeed: 2000,
      onPlaybackSpeedChange: vi.fn(),
    },
  };
}

describe('StudioPanel', () => {
  it('shows the studio tabs in the shared segmented control and keeps AI as the primary workspace', async () => {
    render(<StudioPanel {...createProps()} />);

    expect(screen.getByText('Flowpilot')).toBeTruthy();
    expect(screen.getByText('Code')).toBeTruthy();
    expect(await screen.findByTestId('studio-ai-panel')).toBeTruthy();
  });
});
