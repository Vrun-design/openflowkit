import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface ViewHeaderProps {
    title: string;
    icon: React.ReactNode;
    onBack: () => void;
    description?: string;
    meta?: React.ReactNode;
    onClose?: () => void;
}

export const ViewHeader = ({
    title,
    icon,
    onBack,
    description,
    meta,
    onClose,
}: ViewHeaderProps) => (
    <div className="border-b border-[var(--color-brand-border)]/60 bg-[var(--brand-surface)]/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-start gap-3">
            <Button
                onClick={onBack}
                variant="ghost"
                size="icon"
                className="mt-0.5 rounded-[var(--radius-sm)]"
                icon={<ArrowLeft className="w-4 h-4" />}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium text-[var(--brand-text)]">
                    {icon}
                    <span>{title}</span>
                </div>
                {description ? (
                    <p className="mt-1 text-[11px] leading-5 text-[var(--brand-secondary)]">{description}</p>
                ) : null}
                {meta ? <div className="mt-2">{meta}</div> : null}
            </div>
            <Button
                onClick={onClose ?? onBack}
                variant="ghost"
                size="icon"
                className="rounded-[var(--radius-sm)]"
                icon={<X className="w-4 h-4" />}
            />
        </div>
    </div>
);
