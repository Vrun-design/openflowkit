import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface NodeActionButtonOption {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'secondary' | 'ghost' | 'danger' | 'primary';
}

interface NodeActionButtonsProps {
    nodeId: string;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    secondaryActions?: NodeActionButtonOption[];
}

export function NodeActionButtons({
    nodeId,
    onDuplicate,
    onDelete,
    secondaryActions = [],
}: NodeActionButtonsProps): React.ReactElement {
    return (
        <div className="mt-4 flex gap-2 border-t border-[var(--color-brand-border)] pt-4">
            {secondaryActions.map((action) => (
                <Button
                    key={action.id}
                    onClick={action.onClick}
                    variant={action.variant ?? 'ghost'}
                    className="flex-1"
                    icon={action.icon}
                >
                    {action.label}
                </Button>
            ))}
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
