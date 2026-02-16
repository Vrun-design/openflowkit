import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FlowTab } from '@/lib/types';
import { useFlowStore } from '../store';

interface FlowTabsProps {
  tabs: FlowTab[];
  activeTabId: string;
  onSwitchTab: (tabId: string) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, newName: string) => void;
}

export const FlowTabs: React.FC<FlowTabsProps> = ({
  tabs,
  activeTabId,
  onSwitchTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
}) => {
  const buttonStyle = useFlowStore(state => state.brandConfig.ui.buttonStyle);
  const isBeveled = buttonStyle === 'beveled';
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (tab: FlowTab) => {
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  const handleFinishEdit = () => {
    if (editingTabId && editName.trim()) {
      onRenameTab(editingTabId, editName.trim());
    }
    setEditingTabId(null);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditName('');
    }
  };

  return (
    <div className="flex items-center justify-center px-4 pointer-events-auto">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-xl">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`
              group relative flex items-center gap-2 px-3 py-1.5 rounded-[var(--brand-radius)] cursor-pointer select-none transition-all border
              ${activeTabId === tab.id
                ? 'bg-[var(--brand-primary-50)] border-[var(--brand-primary-200)] text-[var(--brand-primary-700)] font-medium shadow-sm'
                : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }
            `}
            onClick={() => onSwitchTab(tab.id)}
            onDoubleClick={() => handleStartEdit(tab)}
            title={tab.name}
          >
            {editingTabId === tab.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleFinishEdit}
                onKeyDown={handleKeyDown}
                className="bg-white border border-[var(--brand-primary-300)] rounded-[calc(var(--brand-radius)-4px)] px-1 py-0 text-xs font-medium w-24 outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="text-xs max-w-[120px] truncate">{tab.name}</span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              title="Close Tab"
              className={`
                p-0.5 rounded-full hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100
                ${activeTabId === tab.id ? 'text-[var(--brand-primary-400)] hover:text-[var(--brand-primary)]' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          onClick={onAddTab}
          className={`p-1.5 ml-1 rounded-full text-slate-400 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)] transition-colors ${isBeveled ? 'btn-beveled bg-white' : ''}`}
          title="New Flow Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div >
  );
};
