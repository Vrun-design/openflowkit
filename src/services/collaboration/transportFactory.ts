import { createInMemoryCollaborationTransport, type CollaborationTransport } from './transport';
import { createYjsPeerCollaborationTransport, isPeerCollaborationSupported } from './yjsPeerTransport';

export type CollaborationTransportMode = 'in-memory' | 'realtime';

export interface CollaborationTransportFactoryResult {
  transport: CollaborationTransport;
  resolvedMode: CollaborationTransportMode;
  fallbackReason?: 'missing_dependencies' | 'not_supported_yet';
}

interface CollaborationTransportFactoryOptions {
  isRealtimeSupported?: () => boolean;
  createRealtimeTransport?: () => CollaborationTransport;
}

export function createCollaborationTransportFactory(
  mode: CollaborationTransportMode,
  options: CollaborationTransportFactoryOptions = {}
): CollaborationTransportFactoryResult {
  const isRealtimeSupported = options.isRealtimeSupported ?? isPeerCollaborationSupported;
  const createRealtimeTransport = options.createRealtimeTransport ?? createYjsPeerCollaborationTransport;

  if (mode === 'in-memory') {
    return {
      transport: createInMemoryCollaborationTransport(),
      resolvedMode: 'in-memory',
    };
  }

  if (isRealtimeSupported()) {
    return {
      transport: createRealtimeTransport(),
      resolvedMode: 'realtime',
    };
  }

  return {
    transport: createInMemoryCollaborationTransport(),
    resolvedMode: 'in-memory',
    fallbackReason: 'not_supported_yet',
  };
}
