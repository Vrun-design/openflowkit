import React, { useMemo, useState } from 'react';
import { X, Layout, Plus } from 'lucide-react';
import { FLOW_TEMPLATES, FlowTemplate } from '../services/templates';

interface TemplatesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: FlowTemplate) => void;
}

export const TemplatesPanel: React.FC<TemplatesPanelProps> = ({ 
  isOpen, 
  onClose, 
  onSelectTemplate 
}) => {
  const [search, setSearch] = useState('');

  const filteredTemplates = useMemo(() => {
    return FLOW_TEMPLATES.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) || 
      t.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-20 left-6 bottom-8 w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 ring-1 ring-black/5 flex flex-col overflow-hidden z-50 animate-in slide-in-from-left-10 duration-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/80">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Layout className="w-4 h-4 text-indigo-600" />
          <span>Flow Templates</span>
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-slate-100 bg-white">
        <input 
          type="text" 
          placeholder="Search templates..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="p-4 overflow-y-auto custom-scrollbar space-y-3 flex-1">
        {filteredTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <div 
              key={template.id}
              className="group relative p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{template.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{template.description}</p>
                </div>
              </div>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-indigo-600 text-white rounded-full p-1 shadow-sm">
                   <Plus className="w-3 h-3" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">No templates found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
