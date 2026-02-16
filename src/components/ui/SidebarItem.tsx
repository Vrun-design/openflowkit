import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarItemProps {
    children: React.ReactNode;
    icon?: React.ReactNode;
    to?: string;
    onClick?: (e?: React.MouseEvent) => void;
    isActive?: boolean;
    className?: string;
    end?: boolean;
}

/**
 * A reusable sidebar item component with "perfect" states (active, hover, default).
 * Supports both internal navigation (NavLink) and action-based clicks (Button).
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({
    children,
    icon,
    to,
    onClick,
    isActive: manualIsActive,
    className = '',
    end = false
}) => {
    const baseStyles = "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors w-full text-left group";
    const activeStyles = "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-medium";
    const inactiveStyles = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

    const content = (
        <>
            {icon && <span className="shrink-0 flex items-center justify-center">{icon}</span>}
            <span className="flex-1 flex items-center justify-between truncate min-w-0">{children}</span>
        </>
    );

    if (to) {
        // External link check
        if (to.startsWith('http') || to.startsWith('#')) {
            return (
                <a
                    href={to}
                    target={to.startsWith('http') ? "_blank" : undefined}
                    rel={to.startsWith('http') ? "noopener noreferrer" : undefined}
                    onClick={onClick}
                    className={`
                        ${baseStyles}
                        ${manualIsActive ? activeStyles : inactiveStyles}
                        ${className}
                    `}
                >
                    {content}
                </a>
            );
        }

        return (
            <NavLink
                to={to}
                end={end}
                className={({ isActive }) => `
                    ${baseStyles}
                    ${isActive || manualIsActive ? activeStyles : inactiveStyles}
                    ${className}
                `}
                onClick={onClick}
            >
                {content}
            </NavLink>
        );
    }

    return (
        <button
            onClick={onClick}
            className={`
                ${baseStyles}
                ${manualIsActive ? activeStyles : inactiveStyles}
                ${className}
            `}
        >
            {content}
        </button>
    );
};
