import { useCallback, useState } from 'react';

interface UseFlowCanvasConnectionStateParams {
    onConnectStart: (event: unknown, params: unknown) => void;
    onConnectEnd: (event: unknown) => void;
}

interface UseFlowCanvasConnectionStateResult {
    isConnecting: boolean;
    onConnectStartWrapper: (event: unknown, params: unknown) => void;
    onConnectEndWrapper: (event: unknown) => void;
}

export function useFlowCanvasConnectionState({
    onConnectStart,
    onConnectEnd,
}: UseFlowCanvasConnectionStateParams): UseFlowCanvasConnectionStateResult {
    const [isConnecting, setIsConnecting] = useState(false);

    const onConnectStartWrapper = useCallback((event: unknown, params: unknown) => {
        setIsConnecting(true);
        onConnectStart(event, params);
    }, [onConnectStart]);

    const onConnectEndWrapper = useCallback((event: unknown) => {
        setIsConnecting(false);
        onConnectEnd(event);
    }, [onConnectEnd]);

    return {
        isConnecting,
        onConnectStartWrapper,
        onConnectEndWrapper,
    };
}
