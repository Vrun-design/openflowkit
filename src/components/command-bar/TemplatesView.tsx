import React, { useState, useMemo } from 'react';
import { Layout, Plus } from 'lucide-react';
import { Input } from '../ui/Input';
import { ViewHeader } from './ViewHeader';
import { FLOW_TEMPLATES, FlowTemplate } from '../../services/templates';

interface TemplatesViewProps {
    onSelectTemplate?: (t: FlowTemplate) => void;
    onClose: () => void;
    handleBack: () => void;
}

export const TemplatesView = ({
    onSelectTemplate,
    onClose,
    handleBack
}: TemplatesViewProps) => {
    const [tSearch, setTSearch] = useState('');

    const filteredTemplates = useMemo(() => {
        return FLOW_TEMPLATES.filter(t =>
            t.name.toLowerCase().includes(tSearch.toLowerCase()) ||
            t.description.toLowerCase().includes(tSearch.toLowerCase())
        );
    }, [tSearch]);

    return (
        <div className="flex flex-col h-full">
            <ViewHeader title="Templates" icon={<Layout className="w-4 h-4 text-[var(--brand-primary)]" />} onBack={handleBack} />

            <div className="px-4 py-2 border-b border-slate-100">
                <Input
                    value={tSearch}
                    onChange={e => setTSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="Search templates..."
                    className="w-full focus:border-[var(--brand-primary-400)]"
                    autoFocus
                />
            </div>

            <div className="overflow-y-auto p-2 grid grid-cols-1 gap-1 max-h-[350px]">
                {filteredTemplates.map(t => {
                    const Icon = t.icon;
                    return (
                        <div
                            key={t.id}
                            onClick={() => { onSelectTemplate?.(t); onClose(); }}
                            className="group flex items-start gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--brand-primary-50)] border border-transparent hover:border-[var(--brand-primary-100)] cursor-pointer transition-all"
                        >
                            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--brand-primary-50)] text-[var(--brand-primary-600)] flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-[var(--brand-primary-700)] group-hover:shadow-sm transition-all scale-100 group-hover:scale-105">
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-slate-700 group-hover:text-[var(--brand-primary-900)] truncate">{t.name}</h4>
                                <p className="text-xs text-slate-400 group-hover:text-[var(--brand-primary-700)]/70 line-clamp-1">{t.description}</p>
                            </div>
                            <Plus className="w-4 h-4 text-slate-300 group-hover:text-[var(--brand-primary-400)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    );
                })}
                {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">No templates found</div>
                )}
            </div>
        </div>
    );
};
