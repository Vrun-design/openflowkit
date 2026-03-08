import React from 'react';
import { Copy, MoveRight, PanelsTopLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTabActions, useTabsState } from '@/store/tabHooks';
import { ViewHeader } from './ViewHeader';

interface PagesViewProps {
    onClose: () => void;
    handleBack: () => void;
}

export function PagesView({ onClose, handleBack }: PagesViewProps): React.ReactElement {
    const navigate = useNavigate();
    const { tabs, activeTabId } = useTabsState();
    const { duplicateActiveTab, copySelectedToTab, moveSelectedToTab, setActiveTabId } = useTabActions();

    function handleDuplicateCurrentPage(): void {
        const newTabId = duplicateActiveTab();
        if (!newTabId) return;
        navigate(`/flow/${newTabId}`);
        onClose();
    }

    function handleSwitchPage(tabId: string): void {
        setActiveTabId(tabId);
        navigate(`/flow/${tabId}`);
        onClose();
    }

    return (
        <div className="flex h-full flex-col">
            <ViewHeader title="Pages" icon={<PanelsTopLeft className="h-4 w-4 text-[var(--brand-primary)]" />} onBack={handleBack} />

            <div className="border-b border-slate-100 px-4 py-2">
                <button
                    onClick={handleDuplicateCurrentPage}
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--brand-radius)] border border-slate-300 bg-white px-3 text-sm"
                >
                    <Copy className="h-4 w-4" />
                    Duplicate Current Page
                </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    return (
                        <div
                            key={tab.id}
                            className={`rounded-[var(--radius-md)] border p-3 ${
                                isActive ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]' : 'border-slate-200 bg-white'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-medium text-slate-700">{tab.name}</div>
                                    <div className="text-xs text-slate-500">{tab.nodes.length} nodes • {tab.edges.length} edges</div>
                                </div>
                                {!isActive && (
                                    <button
                                        onClick={() => handleSwitchPage(tab.id)}
                                        className="h-8 rounded-[var(--brand-radius)] border border-slate-300 bg-white px-2 text-[11px]"
                                    >
                                        Switch
                                    </button>
                                )}
                            </div>

                            {!isActive && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => copySelectedToTab(tab.id)}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-slate-300 bg-white px-2 text-[11px]"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Copy Selected Here
                                    </button>
                                    <button
                                        onClick={() => moveSelectedToTab(tab.id)}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-slate-300 bg-white px-2 text-[11px]"
                                    >
                                        <MoveRight className="h-3 w-3" />
                                        Move Selected Here
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
