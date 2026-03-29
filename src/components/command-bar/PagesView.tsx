import React from 'react';
import { Copy, MoveRight, PanelsTopLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEditorPageActions, useEditorPagesState } from '@/store/editorPageHooks';
import { ViewHeader } from './ViewHeader';

interface PagesViewProps {
    onClose: () => void;
    handleBack: () => void;
}

export function PagesView({ onClose, handleBack }: PagesViewProps): React.ReactElement {
    const navigate = useNavigate();
    const { pages, activePageId } = useEditorPagesState();
    const { duplicateActivePage, copySelectedToPage, moveSelectedToPage, setActivePageId } = useEditorPageActions();

    function handleDuplicateCurrentPage(): void {
        const newPageId = duplicateActivePage();
        if (!newPageId) return;
        navigate(`/flow/${newPageId}`);
        onClose();
    }

    function handleSwitchPage(pageId: string): void {
        setActivePageId(pageId);
        navigate(`/flow/${pageId}`);
        onClose();
    }

    return (
        <div className="flex h-full flex-col">
            <ViewHeader title="Pages" icon={<PanelsTopLeft className="h-4 w-4 text-[var(--brand-primary)]" />} onBack={handleBack} />

            <div className="border-b border-[var(--color-brand-border)] px-4 py-2">
                <button
                    onClick={handleDuplicateCurrentPage}
                    className="inline-flex h-9 items-center gap-2 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-3 text-sm text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                >
                    <Copy className="h-4 w-4" />
                    Duplicate Current Page
                </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {pages.map((page) => {
                    const isActive = page.id === activePageId;
                    return (
                        <div
                            key={page.id}
                            className={`rounded-[var(--radius-md)] border p-3 ${
                                isActive ? 'border-[var(--brand-primary)] bg-[var(--brand-primary-50)]' : 'border-[var(--color-brand-border)] bg-[var(--brand-surface)]'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-sm font-medium text-[var(--brand-text)]">{page.name}</div>
                                    <div className="text-xs text-[var(--brand-secondary)]">{page.nodes.length} nodes • {page.edges.length} edges</div>
                                </div>
                                {!isActive && (
                                    <button
                                        onClick={() => handleSwitchPage(page.id)}
                                        className="h-8 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 text-[11px] text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                                    >
                                        Switch
                                    </button>
                                )}
                            </div>

                            {!isActive && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => copySelectedToPage(page.id)}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 text-[11px] text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Copy Selected Here
                                    </button>
                                    <button
                                        onClick={() => moveSelectedToPage(page.id)}
                                        className="inline-flex h-7 items-center gap-1 rounded-[var(--brand-radius)] border border-[var(--color-brand-border)] bg-[var(--brand-surface)] px-2 text-[11px] text-[var(--brand-text)] hover:border-[var(--brand-secondary)] hover:bg-[var(--brand-background)]"
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
