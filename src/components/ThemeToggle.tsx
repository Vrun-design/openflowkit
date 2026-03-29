import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Tooltip } from './Tooltip';

export function ThemeToggle(): React.ReactElement {
    const { resolvedTheme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    };

    return (
        <Tooltip text={resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'} side="top">
            <button
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-brand-border)] bg-[var(--brand-surface)] text-[var(--brand-text-muted)] hover:bg-[var(--brand-surface-hover)] hover:text-[var(--brand-text)] transition-colors"
            >
                {resolvedTheme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                ) : (
                    <Moon className="h-4 w-4" />
                )}
            </button>
        </Tooltip>
    );
}
