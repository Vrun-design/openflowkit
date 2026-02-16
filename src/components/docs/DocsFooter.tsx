import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocsNavigation } from './useDocsNavigation';

export const DocsFooter: React.FC = () => {
    const { prevEntry, nextEntry } = useDocsNavigation();

    return (
        <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-4 justify-between">
            {prevEntry ? (
                <Link
                    to={`/docs/${prevEntry.item.slug}`}
                    className="group flex flex-col gap-1 p-4 rounded-lg border border-slate-200 hover:border-[var(--brand-primary-300)] hover:bg-[var(--brand-primary-50)] transition-all w-full sm:w-1/2"
                >
                    <span className="text-xs font-medium text-[var(--brand-secondary)] flex items-center gap-1 group-hover:text-[var(--brand-primary)]">
                        <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                        Previous
                    </span>
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-[var(--brand-primary-700)]">
                        {prevEntry.item.title}
                    </span>
                </Link>
            ) : <div className="hidden sm:block w-1/2" />}

            {nextEntry ? (
                <Link
                    to={`/docs/${nextEntry.item.slug}`}
                    className="group flex flex-col gap-1 p-4 rounded-lg border border-slate-200 hover:border-[var(--brand-primary-300)] hover:bg-[var(--brand-primary-50)] transition-all w-full sm:w-1/2 text-right items-end"
                >
                    <span className="text-xs font-medium text-[var(--brand-secondary)] flex items-center gap-1 group-hover:text-[var(--brand-primary)]">
                        Next
                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                    </span>
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-[var(--brand-primary-700)]">
                        {nextEntry.item.title}
                    </span>
                </Link>
            ) : <div className="hidden sm:block w-1/2" />}
        </div>
    );
};
