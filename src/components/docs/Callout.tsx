import React from 'react';
import { Info, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

export type CalloutType = 'info' | 'warning' | 'success' | 'tip';

interface CalloutProps {
    type?: CalloutType;
    title?: string;
    children: React.ReactNode;
}

export const Callout: React.FC<CalloutProps> = ({ type = 'info', title, children }) => {
    const styles = {
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-900',
            icon: <Info className="w-5 h-5 text-blue-500" />
        },
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-900',
            icon: <AlertTriangle className="w-5 h-5 text-amber-500" />
        },
        success: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-900',
            icon: <CheckCircle className="w-5 h-5 text-green-500" />
        },
        tip: {
            bg: 'bg-violet-50',
            border: 'border-violet-200',
            text: 'text-violet-900',
            icon: <Lightbulb className="w-5 h-5 text-violet-500" />
        }
    };

    const style = styles[type];

    return (
        <div className={`my-6 p-4 rounded-lg border flex gap-4 ${style.bg} ${style.border}`}>
            <div className="shrink-0 mt-0.5">{style.icon}</div>
            <div className={`space-y-1 ${style.text}`}>
                {title && <h4 className="font-semibold text-sm">{title}</h4>}
                <div className="text-sm leading-relaxed opacity-90">{children}</div>
            </div>
        </div>
    );
};
