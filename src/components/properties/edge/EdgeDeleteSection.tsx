import React from 'react';
import type { Edge } from 'reactflow';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EdgeDeleteSectionProps {
    selectedEdge: Edge;
    onDelete: (id: string) => void;
}

export function EdgeDeleteSection({ selectedEdge, onDelete }: EdgeDeleteSectionProps): React.ReactElement {
    return (
        <div className="pt-4 border-t border-slate-100">
            <Button
                onClick={() => onDelete(selectedEdge.id)}
                variant="danger"
                className="w-full"
                icon={<Trash2 className="w-4 h-4" />}
            >
                Delete Connection
            </Button>
        </div>
    );
}
