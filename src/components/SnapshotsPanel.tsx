import React, { useState } from 'react';
import { X, Save, Clock, Trash2, RotateCcw } from 'lucide-react';
import { FlowSnapshot } from '@/lib/types';

interface SnapshotsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    snapshots: FlowSnapshot[];
    onSaveSnapshot: (name: string) => void;
    onRestoreSnapshot: (snapshot: FlowSnapshot) => void;
    onDeleteSnapshot: (id: string) => void;
}

export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = ({
    isOpen,
    onClose,
    snapshots,
    onSaveSnapshot,
    onRestoreSnapshot,
    onDeleteSnapshot,
}) => {
    const [newSnapshotName, setNewSnapshotName] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (newSnapshotName.trim()) {
            onSaveSnapshot(newSnapshotName.trim());
            setNewSnapshotName('');
        }
    };

    return (
        <div className="absolute top-20 right-6 w-80 bg-white/95 backdrop-blur-md rounded-[var(--radius-lg)] shadow-2xl border border-white/20 ring-1 ring-black/5 flex flex-col overflow-hidden max-h-[calc(100vh-140px)] z-50 animate-in slide-in-from-right-10 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>Version History</span>
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-[var(--radius-sm)] text-slate-400 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Save Current Version</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newSnapshotName}
                        onChange={(e) => setNewSnapshotName(e.target.value)}
                        placeholder="Version Name (e.g. 'Before Refactor')"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-[var(--radius-md)] text-sm outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)]"
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    />
                    <button
                        onClick={handleSave}
                        disabled={!newSnapshotName.trim()}
                        className="p-2 bg-[var(--brand-primary)] text-white rounded-[var(--radius-md)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 flex-1">
                {snapshots.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <p className="text-sm">No snapshots saved yet.</p>
                    </div>
                ) : (
                    snapshots.map((snapshot) => (
                        <div key={snapshot.id} className="group p-3 rounded-[var(--radius-md)] border border-slate-200 bg-slate-50 hover:bg-white hover:border-[var(--brand-primary-200)] hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-800">{snapshot.name}</h4>
                                    <p className="text-xs text-slate-500">{new Date(snapshot.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => onRestoreSnapshot(snapshot)}
                                        title="Restore version"
                                        className="p-1.5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)] rounded-[var(--radius-sm)] transition-colors"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteSnapshot(snapshot.id)}
                                        title="Delete version"
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-[var(--radius-sm)] transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-2 text-xs text-slate-400">
                                <span className="bg-slate-200 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-slate-600">{snapshot.nodes.length} nodes</span>
                                <span className="bg-slate-200 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-slate-600">{snapshot.edges.length} edges</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
