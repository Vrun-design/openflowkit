import React from 'react';
import type { Edge } from 'reactflow';
import { EdgeConditionSection } from './edge/EdgeConditionSection';
import { EdgeDeleteSection } from './edge/EdgeDeleteSection';
import { EdgeLabelSection } from './edge/EdgeLabelSection';
import { EdgeStyleSection } from './edge/EdgeStyleSection';

interface EdgePropertiesProps {
    selectedEdge: Edge;
    onChange: (id: string, updates: Partial<Edge>) => void;
    onDelete: (id: string) => void;
}

export const EdgeProperties: React.FC<EdgePropertiesProps> = ({
    selectedEdge,
    onChange,
    onDelete
}) => {
    return (
        <div className="space-y-6">
            <EdgeConditionSection selectedEdge={selectedEdge} onChange={onChange} />
            <EdgeLabelSection selectedEdge={selectedEdge} onChange={onChange} />
            <EdgeStyleSection selectedEdge={selectedEdge} onChange={onChange} />
            <EdgeDeleteSection selectedEdge={selectedEdge} onDelete={onDelete} />
        </div>
    );
};
