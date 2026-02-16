import React from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    sideOffset?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
    children,
    text,
    side = 'top',
    sideOffset = 12
}) => {
    // Simple positioning logic based on side
    // Defaulting to the existing style (top) for now, but adding flexibility for future

    const positionClasses = {
        top: 'bottom-full mb-2',
        bottom: 'top-full mt-2',
        left: 'right-full mr-2',
        right: 'left-full ml-2',
    };

    const arrowClasses = {
        top: '-bottom-1 left-1/2 -translate-x-1/2 border-t-slate-900 border-x-transparent border-b-transparent',
        bottom: '-top-1 left-1/2 -translate-x-1/2 border-b-slate-900 border-x-transparent border-t-transparent',
        left: '-right-1 top-1/2 -translate-y-1/2 border-l-slate-900 border-y-transparent border-r-transparent',
        right: '-left-1 top-1/2 -translate-y-1/2 border-r-slate-900 border-y-transparent border-l-transparent',
    };

    return (
        <div className="group relative flex items-center justify-center">
            {children}
            <span
                className={`absolute ${positionClasses[side]} px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}
            >
                {text}
                <span className={`absolute border-4 border-transparent ${arrowClasses[side]}`}></span>
            </span>
        </div>
    );
};
