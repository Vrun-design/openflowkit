import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocsNavigation } from './useDocsNavigation';

export const DocsBreadcrumbs: React.FC = () => {
    const { currentEntry } = useDocsNavigation();

    if (!currentEntry) return null;

    return (
        <nav className="flex items-center text-sm text-[var(--brand-secondary)] mb-6 overflow-x-auto whitespace-nowrap">
            <Link to="/docs" className="hover:text-[var(--brand-primary)] transition-colors">
                <Home className="w-4 h-4" />
            </Link>
            <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
            <span className="font-medium text-slate-600">{currentEntry.section}</span>
            <ChevronRight className="w-4 h-4 mx-2 text-slate-300" />
            <span className="font-medium text-[var(--brand-primary)]">{currentEntry.item.title}</span>
        </nav>
    );
};
