import { describe, expect, it } from 'vitest';
import { shouldExitStudioOnSelection } from './shouldExitStudioOnSelection';

describe('shouldExitStudioOnSelection', () => {
    it('always returns false — node/edge clicks never auto-exit studio', () => {
        expect(
            shouldExitStudioOnSelection({
                editorMode: 'studio',
                studioTab: 'ai',
                studioSelectionSnapshot: { selectedNodeId: null, selectedEdgeId: null },
                selectedNodeId: 'node-1',
                selectedEdgeId: null,
            })
        ).toBe(false);
    });

    it('returns false when studio is not open', () => {
        expect(
            shouldExitStudioOnSelection({
                editorMode: 'canvas',
                studioTab: 'ai',
                studioSelectionSnapshot: { selectedNodeId: null, selectedEdgeId: null },
                selectedNodeId: 'node-1',
                selectedEdgeId: null,
            })
        ).toBe(false);
    });

    it('returns false even when an edge is selected while studio is open', () => {
        expect(
            shouldExitStudioOnSelection({
                editorMode: 'studio',
                studioTab: 'code',
                studioSelectionSnapshot: { selectedNodeId: null, selectedEdgeId: null },
                selectedNodeId: null,
                selectedEdgeId: 'edge-1',
            })
        ).toBe(false);
    });
});
