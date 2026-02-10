import React, { useEffect, useRef } from 'react';
import {
    Copy,
    ClipboardPaste,
    Trash2,
    BringToFront,
    SendToBack,
    CopyPlus,
    Replace,
    X
} from 'lucide-react';

export interface ContextMenuProps {
    id: string | null;
    type: 'node' | 'pane' | 'edge';
    position: { x: number; y: number };
    onClose: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onBringToFront?: () => void;
    onSendToBack?: () => void;
    canPaste?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    id,
    type,
    position,
    onClose,
    onCopy,
    onPaste,
    onDuplicate,
    onDelete,
    onBringToFront,
    onSendToBack,
    canPaste
}) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{ top: position.y, left: position.x }}
            className="absolute z-50 bg-white rounded-lg shadow-xl border border-slate-100 p-1.5 min-w-[200px] flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
        >
            {type === 'node' && (
                <>
                    <button onClick={onCopy} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors w-full text-left">
                        <Copy className="w-4 h-4" /> Copy
                    </button>
                    <button onClick={onDuplicate} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors w-full text-left">
                        <CopyPlus className="w-4 h-4" /> Duplicate
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button onClick={onBringToFront} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors w-full text-left">
                        <BringToFront className="w-4 h-4" /> Bring to Front
                    </button>
                    <button onClick={onSendToBack} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors w-full text-left">
                        <SendToBack className="w-4 h-4" /> Send to Back
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button onClick={onDelete} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </>
            )}

            {type === 'pane' && (
                <>
                    <button
                        onClick={onPaste}
                        disabled={!canPaste}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left ${!canPaste ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        <ClipboardPaste className="w-4 h-4" /> Paste
                    </button>
                </>
            )}

            {type === 'edge' && (
                <>
                    <button onClick={onDelete} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left">
                        <Trash2 className="w-4 h-4" /> Delete Connection
                    </button>
                </>
            )}
        </div>
    );
};
