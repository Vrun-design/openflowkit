type ToolbarButtonTone = 'neutral' | 'brand';

export const TOOLBAR_BUTTON_RADIUS_CLASS = 'rounded-[var(--radius-md)]';
export const TOOLBAR_GROUP_RADIUS_CLASS = 'rounded-[var(--radius-md)]';

function getToolbarToneClass(tone: ToolbarButtonTone): string {
    switch (tone) {
        case 'brand':
            return 'text-[var(--brand-primary)] hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)]';
        default:
            return 'text-[var(--brand-secondary)] hover:bg-[var(--brand-background)] hover:text-[var(--brand-text)]';
    }
}

export function getToolbarIconButtonClass(options?: {
    active?: boolean;
    tone?: ToolbarButtonTone;
    size?: 'default' | 'compact';
}): string {
    const { active = false, tone = 'neutral', size = 'default' } = options ?? {};
    const sizeClass = size === 'compact' ? 'h-8 w-8' : 'h-9 w-9';

    if (active) {
        return `group inline-flex items-center justify-center ${sizeClass} ${TOOLBAR_BUTTON_RADIUS_CLASS} border border-[var(--brand-primary-200)] bg-[var(--brand-primary-50)] text-[var(--brand-primary)] transition-all`;
    }

    return `group inline-flex items-center justify-center ${sizeClass} ${TOOLBAR_BUTTON_RADIUS_CLASS} transition-all ${getToolbarToneClass(tone)}`;
}

export const TOOLBAR_DIVIDER_CLASS = 'h-6 w-px bg-[var(--color-brand-border)]/80';
