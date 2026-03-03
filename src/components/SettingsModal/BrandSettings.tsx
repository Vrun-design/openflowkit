import React, { useState } from 'react';
import { useFlowStore } from '@/store';
import { BrandEditorView } from './brand/BrandEditorView';
import { BrandListView } from './brand/BrandListView';

export function BrandSettings(): React.ReactElement {
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [editingKitId, setEditingKitId] = useState<string | null>(null);
    const { activeBrandKitId } = useFlowStore();

    function openEditor(id: string): void {
        setEditingKitId(id);
        setView('editor');
    }

    if (view === 'list') {
        return <BrandListView onSelect={openEditor} />;
    }

    return (
        <BrandEditorView
            kitId={editingKitId ?? activeBrandKitId}
            onBack={() => setView('list')}
        />
    );
}
