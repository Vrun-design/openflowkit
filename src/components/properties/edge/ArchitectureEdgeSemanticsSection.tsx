import React from 'react';
import type { FlowEdge } from '@/lib/types';
import {
  applyArchitectureDirection,
  architectureSideToHandleId,
  buildArchitectureEdgeLabel,
  getDirectionFromMarkers,
  handleIdToArchitectureSide,
  normalizeArchitectureEdgeDirection,
  normalizeArchitectureEdgeSide,
} from './architectureSemantics';

interface ArchitectureEdgeSemanticsSectionProps {
  selectedEdge: FlowEdge;
  onChange: (id: string, updates: Partial<FlowEdge>) => void;
}

export function ArchitectureEdgeSemanticsSection({
  selectedEdge,
  onChange,
}: ArchitectureEdgeSemanticsSectionProps): React.ReactElement {
  const currentProtocol = typeof selectedEdge.data?.archProtocol === 'string' ? selectedEdge.data.archProtocol : '';
  const currentPort = typeof selectedEdge.data?.archPort === 'string' ? selectedEdge.data.archPort : '';
  const currentSourceSide = normalizeArchitectureEdgeSide(
    selectedEdge.data?.archSourceSide || handleIdToArchitectureSide(selectedEdge.sourceHandle || undefined)
  );
  const currentTargetSide = normalizeArchitectureEdgeSide(
    selectedEdge.data?.archTargetSide || handleIdToArchitectureSide(selectedEdge.targetHandle || undefined)
  );
  const currentDirection = normalizeArchitectureEdgeDirection(
    selectedEdge.data?.archDirection || getDirectionFromMarkers(selectedEdge)
  );

  const updateSemantics = (updates: Partial<NonNullable<FlowEdge['data']>>): void => {
    const nextData = {
      ...selectedEdge.data,
      ...updates,
    };
    const direction = normalizeArchitectureEdgeDirection(nextData.archDirection);
    const markers = applyArchitectureDirection(
      { ...selectedEdge, data: nextData },
      direction
    );
    onChange(selectedEdge.id, {
      data: nextData,
      ...markers,
    });
  };

  const updateProtocol = (protocol: string): void => {
    const nextLabel = buildArchitectureEdgeLabel(protocol, currentPort);
    updateSemantics({
      archProtocol: protocol || undefined,
    });
    onChange(selectedEdge.id, {
      label: nextLabel || undefined,
    });
  };

  const updatePort = (port: string): void => {
    const nextLabel = buildArchitectureEdgeLabel(currentProtocol, port);
    updateSemantics({
      archPort: port || undefined,
    });
    onChange(selectedEdge.id, {
      label: nextLabel || undefined,
    });
  };

  const updateDirection = (direction: string): void => {
    updateSemantics({
      archDirection: normalizeArchitectureEdgeDirection(direction),
    });
  };

  const updateSourceSide = (side: string): void => {
    const normalizedSide = normalizeArchitectureEdgeSide(side);
    const nextData = {
      ...selectedEdge.data,
      archSourceSide: normalizedSide,
    };
    const direction = normalizeArchitectureEdgeDirection(nextData.archDirection);
    const markers = applyArchitectureDirection(
      { ...selectedEdge, data: nextData },
      direction
    );
    onChange(selectedEdge.id, {
      data: nextData,
      sourceHandle: architectureSideToHandleId(normalizedSide),
      ...markers,
    });
  };

  const updateTargetSide = (side: string): void => {
    const normalizedSide = normalizeArchitectureEdgeSide(side);
    const nextData = {
      ...selectedEdge.data,
      archTargetSide: normalizedSide,
    };
    const direction = normalizeArchitectureEdgeDirection(nextData.archDirection);
    const markers = applyArchitectureDirection(
      { ...selectedEdge, data: nextData },
      direction
    );
    onChange(selectedEdge.id, {
      data: nextData,
      targetHandle: architectureSideToHandleId(normalizedSide),
      ...markers,
    });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={currentDirection}
          onChange={(event) => updateDirection(event.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
        >
          <option value="-->">Forward (--&gt;)</option>
          <option value="<--">Reverse (&lt;--)</option>
          <option value="<-->">Bidirectional (&lt;--&gt;)</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={currentSourceSide || ''}
            onChange={(event) => updateSourceSide(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Src side</option>
            <option value="L">L</option>
            <option value="R">R</option>
            <option value="T">T</option>
            <option value="B">B</option>
          </select>
          <select
            value={currentTargetSide || ''}
            onChange={(event) => updateTargetSide(event.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="">Tgt side</option>
            <option value="L">L</option>
            <option value="R">R</option>
            <option value="T">T</option>
            <option value="B">B</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={currentProtocol}
          onChange={(event) => updateProtocol(event.target.value)}
          placeholder="Protocol (HTTPS)"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        />
        <input
          value={currentPort}
          onChange={(event) => updatePort(event.target.value)}
          placeholder="Port (443)"
          className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
        />
      </div>
    </div>
  );
}
