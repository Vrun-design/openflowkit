import React, { useEffect, useRef } from 'react';
import {
    Copy,
    ClipboardPaste,
    Trash2,
    BringToFront,
    SendToBack,
    CopyPlus,
    Replace,
    X,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    ArrowRightFromLine,
    ArrowDownFromLine,
    Group,
} from 'lucide-react';

export interface ContextMenuProps {
    id: string | null;
    type: 'node' | 'pane' | 'edge' | 'multi';
    position: { x: number; y: number };
    onClose: () => void;
    onCopy?: () => void;
    onPaste?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onBringToFront?: () => void;
    onSendToBack?: () => void;
    canPaste?: boolean;
    // Multi-select
    selectedCount?: number;
    onAlignNodes?: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
    onDistributeNodes?: (direction: 'horizontal' | 'vertical') => void;
    onGroupSelected?: () => void;
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
    canPaste,
    selectedCount = 0,
    onAlignNodes,
    onDistributeNodes,
    onGroupSelected,
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
                    <button onClick={onDuplicate} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors w-full text-left">
                        <Replace className="w-4 h-4" /> Reverse Direction
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button onClick={onDelete} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left">
                        <Trash2 className="w-4 h-4" /> Delete Connection
                    </button>
                </>
            )}

            {type === 'multi' && (
                <>
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {selectedCount} items selected
                    </div>

                    {/* Align */}
                    {onAlignNodes && (
                        <>
                            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">Align</div>
                            <div className="grid grid-cols-3 gap-0.5 px-2 pb-1">
                                <button onClick={() => onAlignNodes('left')} className="flex items-center justify-center p-1.5 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700" title="Align Left">
                                    <AlignStartVertical className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onAlignNodes('center')} className="flex items-center justify-center p-1.5 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700" title="Align Center">
                                    <AlignCenterVertical className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onAlignNodes('right')} className="flex items-center justify-center p-1.5 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700" title="Align Right">
                                    <AlignEndVertical className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onAlignNodes('top')} className="flex items-center justify-center p-1.5 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700" title="Align Top">
                                    <AlignStartHorizontal className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onAlignNodes('middle')} className="flex items-center justify-center p-1.5 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700" title="Align Middle">
                                    <AlignCenterHorizontal className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => onAlignNodes('bottom')} className="flex items-center justify-center p-1.5 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700" title="Align Bottom">
                                    <AlignEndHorizontal className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* Distribute */}
                    {onDistributeNodes && (
                        <>
                            <div className="h-px bg-slate-100 my-0.5" />
                            <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase">Distribute</div>
                            <button onClick={() => onDistributeNodes('horizontal')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors w-full text-left">
                                <ArrowRightFromLine className="w-4 h-4" /> Space Horizontally
                            </button>
                            <button onClick={() => onDistributeNodes('vertical')} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-md transition-colors w-full text-left">
                                <ArrowDownFromLine className="w-4 h-4" /> Space Vertically
                            </button>
                        </>
                    )}

                    {/* Group */}
                    {onGroupSelected && (
                        <>
                            <div className="h-px bg-slate-100 my-0.5" />
                            <button onClick={onGroupSelected} className="flex items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors w-full text-left">
                                <Group className="w-4 h-4" /> Group Selected
                            </button>
                        </>
                    )}

                    <div className="h-px bg-slate-100 my-0.5" />
                    <button onClick={onDelete} className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors w-full text-left">
                        <Trash2 className="w-4 h-4" /> Delete Selected ({selectedCount})
                    </button>
                </>
            )}
        </div>
    );
};
