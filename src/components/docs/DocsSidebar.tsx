import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { docsNavigation } from './docsData';
import { Book, ChevronLeft, ArrowLeft } from 'lucide-react';

interface DocsSidebarProps {
    className?: string;
    onClose?: () => void;
}

import { SidebarItem } from '../ui/SidebarItem';
import { useFlowStore } from '../../store';

export const DocsSidebar: React.FC<DocsSidebarProps> = ({ className = '', onClose }) => {
    const { brandConfig } = useFlowStore();

    return (
        <aside className={`w-64 border-r border-slate-200 bg-[var(--brand-surface)] flex flex-col h-full fixed inset-y-0 left-0 z-20 transition-transform duration-300 lg:translate-x-0 ${className}`}>
            <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm">
                <Link
                    to="/home"
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                    title="Return to Canvas"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="w-px h-4 bg-slate-200"></div>

                <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <div className="p-1 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                        <Book className="w-3.5 h-3.5" />
                    </div>
                    <span>Documentation</span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {docsNavigation.map((section) => (
                    <div key={section.title}>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
                            {section.title}
                        </h3>
                        <div className="space-y-0.5">
                            {section.items.map((item) => (
                                <SidebarItem
                                    key={item.slug}
                                    to={`/docs/${item.slug}`}
                                    onClick={onClose}
                                >
                                    {item.title}
                                </SidebarItem>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                    {brandConfig.appName} Docs v1.0
                </div>
            </div>
        </aside>
    );
};
