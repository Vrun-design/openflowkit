import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudioAIPanel } from './StudioAIPanel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallbackOrOptions?: string | { defaultValue?: string },
      maybeOptions?: { defaultValue?: string }
    ) => {
      if (typeof fallbackOrOptions === 'string') {
        return fallbackOrOptions;
      }

      return fallbackOrOptions?.defaultValue ?? maybeOptions?.defaultValue ?? key;
    },
  }),
}));

vi.mock('./command-bar/useAIViewState', () => ({
  useAIViewState: () => ({
    prompt: 'Add Redis between API and DB',
    setPrompt: vi.fn(),
    selectedImage: null,
    setSelectedImage: vi.fn(),
    fileInputRef: createRef<HTMLInputElement>(),
    scrollRef: createRef<HTMLDivElement>(),
    handleGenerate: vi.fn(),
    handleKeyDown: vi.fn(),
    handleImageSelect: vi.fn(),
  }),
}));

describe('StudioAIPanel', () => {
  it('shows the settings CTA when ai is unavailable', () => {
    render(
      <StudioAIPanel
        onAIGenerate={vi.fn().mockResolvedValue(false)}
        isGenerating={false}
        streamingText={null}
        retryCount={0}
        onCancelGeneration={vi.fn()}
        pendingDiff={null}
        onConfirmDiff={vi.fn()}
        onDiscardDiff={vi.fn()}
        aiReadiness={{
          canGenerate: false,
          blockingIssue: null,
          advisory: null,
        }}
        lastError={null}
        onClearError={vi.fn()}
        chatMessages={[]}
        onClearChat={vi.fn()}
        nodeCount={0}
        selectedNodeCount={0}
      />
    );

    expect(screen.getByRole('button', { name: 'Add AI key to start generating' })).toBeInTheDocument();
  });

  it('opens settings instead of generating when AI is not configured', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    render(
      <StudioAIPanel
        onAIGenerate={vi.fn().mockResolvedValue(false)}
        isGenerating={false}
        streamingText={null}
        retryCount={0}
        onCancelGeneration={vi.fn()}
        pendingDiff={null}
        onConfirmDiff={vi.fn()}
        onDiscardDiff={vi.fn()}
        aiReadiness={{
          canGenerate: false,
          blockingIssue: {
            tone: 'error',
            title: 'OpenAI is not ready yet',
            detail: 'Add your OpenAI API key in Settings before generating.',
          },
          advisory: null,
        }}
        lastError={null}
        onClearError={vi.fn()}
        chatMessages={[]}
        onClearChat={vi.fn()}
        nodeCount={3}
        selectedNodeCount={0}
      />
    );

    expect(screen.queryByText('OpenAI is not ready yet')).not.toBeInTheDocument();
    expect(screen.queryByText('Add your OpenAI API key in Settings before generating.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Generate with Flowpilot' }));

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);
    expect((dispatchEventSpy.mock.calls[0]?.[0] as CustomEvent).type).toBe('open-ai-settings');

    dispatchEventSpy.mockRestore();
  });

  it('removes the inline create/edit explainer copy', () => {
    const onClearError = vi.fn();

    render(
      <StudioAIPanel
        onAIGenerate={vi.fn().mockResolvedValue(false)}
        isGenerating={false}
        streamingText={null}
        retryCount={0}
        onCancelGeneration={vi.fn()}
        pendingDiff={null}
        onConfirmDiff={vi.fn()}
        onDiscardDiff={vi.fn()}
        aiReadiness={{
          canGenerate: true,
          blockingIssue: null,
          advisory: null,
        }}
        lastError="The provider rejected this request."
        onClearError={onClearError}
        chatMessages={[]}
        onClearChat={vi.fn()}
        nodeCount={1}
        selectedNodeCount={0}
      />
    );

    expect(screen.queryByText(/Create mode replaces the canvas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Describe one concrete change at a time/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Update auth service' } });
    expect(onClearError).toHaveBeenCalledTimes(1);
  });

  it('opens settings from the empty-state CTA', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    render(
      <StudioAIPanel
        onAIGenerate={vi.fn().mockResolvedValue(false)}
        isGenerating={false}
        streamingText={null}
        retryCount={0}
        onCancelGeneration={vi.fn()}
        pendingDiff={null}
        onConfirmDiff={vi.fn()}
        onDiscardDiff={vi.fn()}
        aiReadiness={{
          canGenerate: false,
          blockingIssue: null,
          advisory: null,
        }}
        lastError={null}
        onClearError={vi.fn()}
        chatMessages={[]}
        onClearChat={vi.fn()}
        nodeCount={0}
        selectedNodeCount={0}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add AI key to start generating' }));

    expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    expect(dispatchEventSpy.mock.calls[0]?.[0]).toBeInstanceOf(CustomEvent);
    expect((dispatchEventSpy.mock.calls[0]?.[0] as CustomEvent).type).toBe('open-ai-settings');

    dispatchEventSpy.mockRestore();
  });

  it('renders the active generation mode with selected segmented styling', () => {
    render(
      <StudioAIPanel
        onAIGenerate={vi.fn().mockResolvedValue(false)}
        isGenerating={false}
        streamingText={null}
        retryCount={0}
        onCancelGeneration={vi.fn()}
        pendingDiff={null}
        onConfirmDiff={vi.fn()}
        onDiscardDiff={vi.fn()}
        aiReadiness={{
          canGenerate: true,
          blockingIssue: null,
          advisory: null,
        }}
        lastError={null}
        onClearError={vi.fn()}
        chatMessages={[]}
        onClearChat={vi.fn()}
        nodeCount={3}
        selectedNodeCount={0}
      />
    );

    expect(screen.getByRole('button', { name: 'Edit current' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Create new' })).toHaveAttribute('aria-pressed', 'false');
  });
});
