import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface ViewHeaderProps {
    title: string;
    icon: React.ReactNode;
    onBack: () => void;
    onClose?: () => void; // Optional if we want global close, but usually passed via context or prop if needed, currently mainly used for layout consistency
}

export const ViewHeader = ({ title, icon, onBack }: ViewHeaderProps) => (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/50 bg-slate-50/50">
        <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="rounded-[var(--radius-sm)] h-6 w-6"
            icon={<ArrowLeft className="w-4 h-4" />}
        />
        <div className="flex items-center gap-2 font-medium text-slate-700">
            {icon}
            <span>{title}</span>
        </div>
        {/* Close button is typically handled by parent container's overlay click or Esc, 
            but in the original it was sometimes present. 
            However, the main Close is on the `RootView` header. 
            Sub-views usually just have Back. 
            Original `ViewHeader` had a Close button on the right that called `onBack` (which effectively closes if it was root, or goes back).
            Wait, original code:
            <div className="ml-auto">
                <Button onClick={onBack} ... icon={<X ... />} />
            </div>
            It calls `onBack`.
        */}
        <div className="ml-auto">
            <Button
                onClick={onBack}
                variant="ghost"
                size="icon"
                className="rounded-full h-6 w-6"
                icon={<X className="w-4 h-4" />}
            />
        </div>
    </div>
);
