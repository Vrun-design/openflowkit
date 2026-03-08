import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocsChatbot } from './DocsChatbot';

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('rehype-raw', () => ({ default: [] }));
vi.mock('remark-gfm', () => ({ default: [] }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      fallbackOrParams?: string | Record<string, string>,
      maybeParams?: Record<string, string>
    ) => {
      const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
      const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : maybeParams;

      if (key === 'chatbot.welcomeMessage' && params?.appName) {
        return `Welcome to ${params.appName}`;
      }

      return fallback ?? key;
    },
  }),
}));

vi.mock('@/store/brandHooks', () => ({
  useBrandConfig: () => ({
    appName: 'OpenFlowKit',
    faviconUrl: '',
  }),
}));

vi.mock('../../store', () => ({
  useFlowStore: (selector: (state: { aiSettings: object }) => unknown) =>
    selector({ aiSettings: {} }),
}));

vi.mock('../icons/OpenFlowLogo', () => ({
  OpenFlowLogo: ({ className }: { className?: string }) => <div className={className}>Logo</div>,
}));

vi.mock('./MarkdownComponents', () => ({
  MarkdownComponents: {},
}));

const useDocsChatbotStateMock = vi.fn();

vi.mock('./chatbot/useDocsChatbotState', () => ({
  useDocsChatbotState: (params: unknown) => useDocsChatbotStateMock(params),
}));

describe('DocsChatbot', () => {
  it('focuses the composer and exposes an accessible label on the first-run state', () => {
    useDocsChatbotStateMock.mockReturnValue({
      messages: [],
      input: '',
      setInput: vi.fn(),
      isLoading: false,
      error: null,
      messagesEndRef: { current: null },
      handleSend: vi.fn(),
      resetChat: vi.fn(),
    });

    render(<DocsChatbot />);

    const composer = screen.getByRole('textbox', { name: 'chatbot.messagePlaceholder' });
    expect(document.activeElement).toBe(composer);
  });

  it('renders message history inside a polite log region', () => {
    useDocsChatbotStateMock.mockReturnValue({
      messages: [
        { role: 'user', parts: [{ text: 'How do I export?' }] },
        { role: 'model', parts: [{ text: 'Use the export menu.' }] },
      ],
      input: '',
      setInput: vi.fn(),
      isLoading: false,
      error: null,
      messagesEndRef: { current: null },
      handleSend: vi.fn(),
      resetChat: vi.fn(),
    });

    render(<DocsChatbot />);

    expect(screen.getByRole('log')).toBeTruthy();
    expect(screen.getByText('How do I export?')).toBeTruthy();
    expect(screen.getByText('Use the export menu.')).toBeTruthy();
  });
});
