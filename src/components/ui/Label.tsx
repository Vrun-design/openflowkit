import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    className?: string;
}

export const Label: React.FC<LabelProps> = ({ className = '', children, ...props }) => {
    return (
        <label
            className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--brand-secondary)] ${className}`}
            {...props}
        >
            {children}
        </label>
    );
};
