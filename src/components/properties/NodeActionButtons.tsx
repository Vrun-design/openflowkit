import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface NodeActionButtonsProps {
    nodeId: string;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
}

export function NodeActionButtons({ nodeId, onDuplicate, onDelete }: NodeActionButtonsProps): React.ReactElement {
    return (
        <div className="pt-4 mt-4 border-t border-slate-100 flex gap-2">
            <Button
                onClick={() => onDuplicate(nodeId)}
                variant="secondary"
                className="flex-1"
                icon={<Copy className="w-4 h-4" />}
            >
                Duplicate
            </Button>
            <Button
                onClick={() => onDelete(nodeId)}
                variant="danger"
                className="flex-1"
                icon={<Trash2 className="w-4 h-4" />}
            >
                Delete
            </Button>
        </div>
    );
}
