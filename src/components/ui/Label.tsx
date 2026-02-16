import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    className?: string;
}

export const Label: React.FC<LabelProps> = ({ className = '', children, ...props }) => {
    return (
        <label
            className={`text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5 ${className}`}
            {...props}
        >
            {children}
        </label>
    );
};
