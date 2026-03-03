import { trackEvent } from './analytics';

interface RuntimeErrorPayload {
    source: 'error_boundary' | 'window_error' | 'unhandled_rejection';
    message: string;
    stack?: string;
    metadata?: Record<string, unknown>;
}

function normalizeError(input: unknown): { message: string; stack?: string } {
    if (input instanceof Error) {
        return {
            message: input.message || 'Unknown error',
            stack: input.stack,
        };
    }

    return {
        message: typeof input === 'string' ? input : JSON.stringify(input),
    };
}

export function reportRuntimeError(payload: RuntimeErrorPayload): void {
    const safePayload = {
        source: payload.source,
        message: payload.message,
        stack: payload.stack,
        ...payload.metadata,
    };

    trackEvent('runtime_error', safePayload);
    console.error('[RuntimeError]', safePayload);
}

let handlersInstalled = false;

export function installGlobalErrorHandlers(): void {
    if (handlersInstalled || typeof window === 'undefined') return;
    handlersInstalled = true;

    window.addEventListener('error', (event) => {
        const normalized = normalizeError(event.error ?? event.message);
        reportRuntimeError({
            source: 'window_error',
            message: normalized.message,
            stack: normalized.stack,
            metadata: {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            },
        });
    });

    window.addEventListener('unhandledrejection', (event) => {
        const normalized = normalizeError(event.reason);
        reportRuntimeError({
            source: 'unhandled_rejection',
            message: normalized.message,
            stack: normalized.stack,
        });
    });
}
