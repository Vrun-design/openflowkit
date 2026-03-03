import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TocItem } from './docsPageUtils';

interface DocsTocProps {
    items: TocItem[];
    onItemClick: (event: React.MouseEvent<HTMLAnchorElement>, id: string) => void;
}

export function DocsToc({ items, onItemClick }: DocsTocProps): React.ReactElement {
    const { t } = useTranslation();

    return (
        <div className="hidden xl:block w-64 shrink-0">
            <div className="sticky top-6">
                <h5 className="text-xs font-semibold text-slate-900 uppercase tracking-widest mb-4">{t('docs.onThisPage')}</h5>
                <ul className="space-y-2 text-sm border-l border-slate-100">
                    {items.map((item, index) => (
                        <li key={index}>
                            <a
                                href={`#${item.id}`}
                                onClick={(event) => onItemClick(event, item.id)}
                                className={`
                                    block pl-4 py-1 border-l -ml-px transition-colors cursor-pointer
                                    ${item.level === 2 ? 'text-slate-600 hover:text-slate-900 hover:border-slate-300' : 'text-slate-400 hover:text-slate-700 pl-8 text-xs'}
                                `}
                            >
                                {item.text}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
