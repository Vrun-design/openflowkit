import React from 'react';
import { Search } from 'lucide-react';
import { EDITOR_FIELD_DEFAULT_CLASS } from './editorFieldStyles';

interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
    trailingContent?: React.ReactNode;
    surface?: 'default' | 'subtle';
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
    {
        className = '',
        trailingContent,
        surface = 'default',
        ...props
    },
    ref
    ): React.ReactElement {
    const surfaceClassName = surface === 'subtle'
        ? 'bg-[var(--brand-background)]/75 hover:bg-[var(--brand-background)]'
        : 'bg-[var(--brand-surface)] hover:bg-[var(--brand-surface)]';
    const trailingPaddingClassName = trailingContent ? 'pr-11' : 'pr-3';

    return (
        <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--brand-secondary)]" />
            <input
                ref={ref}
                type="text"
                className={`${EDITOR_FIELD_DEFAULT_CLASS} ${surfaceClassName} h-11 py-2.5 pl-11 ${trailingPaddingClassName} ${className}`.trim()}
                {...props}
            />
            {trailingContent ? (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {trailingContent}
                </div>
            ) : null}
        </div>
    );
});
