import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FlowTab } from '../types';

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
              group relative flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer select-none transition-all
              ${activeTabId === tab.id
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
                className="bg-white border border-indigo-300 rounded px-1 py-0 text-xs font-medium w-24 outline-none focus:ring-1 focus:ring-indigo-500"
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
                ${activeTabId === tab.id ? 'text-indigo-400 hover:text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
              `}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <button
          onClick={onAddTab}
          className="p-1.5 ml-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          title="New Flow Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div >
  );
};
