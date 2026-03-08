import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FlowEdge } from '@/lib/types';
import { EdgeRouteSection } from './EdgeRouteSection';

function createEdge(overrides: Partial<FlowEdge> = {}): FlowEdge {
    return {
        id: 'edge-1',
        source: 'a',
        target: 'b',
        data: {},
        ...overrides,
    };
}

describe('EdgeRouteSection', () => {
    it('resets back to elk routing when manual bends exist', () => {
        const onChange = vi.fn();
        render(
            <EdgeRouteSection
                selectedEdge={createEdge({
                    data: {
                        elkPoints: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
                        routingMode: 'elk',
                        waypoint: { x: 50, y: 50 },
                        waypoints: [{ x: 70, y: 70 }],
                    },
                })}
                onChange={onChange}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /reset path/i }));

        expect(onChange).toHaveBeenCalledWith('edge-1', {
            data: {
                elkPoints: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
                routingMode: 'elk',
                waypoint: undefined,
                waypoints: undefined,
            },
        });
    });

    it('shows automatic routing state when there are no manual bends', () => {
        render(
            <EdgeRouteSection
                selectedEdge={createEdge({
                    data: {
                        routingMode: 'elk',
                        elkPoints: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
                    },
                })}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText(/elk auto-routed/i)).toBeTruthy();
        expect(screen.getByText(/connector routing is automatic/i)).toBeTruthy();
    });

    it('resets manual bends back to auto when no elk route exists', () => {
        const onChange = vi.fn();
        render(
            <EdgeRouteSection
                selectedEdge={createEdge({
                    data: {
                        routingMode: 'manual',
                        waypoints: [
                            { x: 50, y: 50 },
                            { x: 80, y: 90 },
                        ],
                    },
                })}
                onChange={onChange}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /reset path/i }));

        expect(onChange).toHaveBeenCalledWith('edge-1', {
            data: {
                routingMode: 'auto',
                waypoint: undefined,
                waypoints: undefined,
            },
        });
    });

    it('shows stored custom path hint and reset guidance', () => {
        render(
            <EdgeRouteSection
                selectedEdge={createEdge({
                    data: {
                        routingMode: 'manual',
                        waypoints: [
                            { x: 50, y: 50 },
                            { x: 80, y: 90 },
                        ],
                    },
                })}
                onChange={vi.fn()}
            />
        );

        expect(screen.getByText(/2 custom bends/i)).toBeTruthy();
        expect(screen.getByText(/reset to return to automatic routing/i)).toBeTruthy();
    });
});
