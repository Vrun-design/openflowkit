import { describe, expect, it, vi } from 'vitest';
import { reportRuntimeError } from './observability';

const trackEventMock = vi.fn();

vi.mock('./analytics', () => ({
    trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

describe('observability', () => {
    it('reports runtime errors through analytics', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        reportRuntimeError({
            source: 'window_error',
            message: 'Boom',
            stack: 'stack',
            metadata: { key: 'value' },
        });

        expect(trackEventMock).toHaveBeenCalledWith('runtime_error', expect.objectContaining({
            source: 'window_error',
            message: 'Boom',
            key: 'value',
        }));
        expect(errorSpy).toHaveBeenCalled();

        errorSpy.mockRestore();
    });
});
