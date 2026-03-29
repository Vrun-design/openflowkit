import React from 'react';
import { Loader2 } from 'lucide-react';
import { IS_BEVELED } from '@/lib/brand';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  shape?: 'default' | 'pill' | 'square';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'primary',
      size = 'md',
      shape = 'default',
      isLoading,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isBeveled = IS_BEVELED;

    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all focus:outline-none disabled:pointer-events-none disabled:shadow-none active:scale-[0.98] disabled:active:scale-100';

    const variants = {
      primary: `
            bg-[var(--brand-primary)] text-white 
            ${isBeveled ? 'btn-beveled-primary' : 'shadow-sm hover:shadow-md'}
            hover:brightness-110 disabled:border-[color-mix(in_srgb,var(--brand-primary),var(--color-brand-border)_55%)] disabled:bg-[color-mix(in_srgb,var(--brand-primary),var(--brand-surface)_62%)] disabled:text-[color-mix(in_srgb,white,transparent_12%)] disabled:opacity-75
        `
        .replace(/\s+/g, ' ')
        .trim(),

      secondary: `
            bg-[var(--brand-surface)] text-[var(--brand-text)] border border-[var(--color-brand-border)] dark:bg-[color-mix(in_srgb,var(--brand-surface),white_6%)] dark:border-[color-mix(in_srgb,var(--color-brand-border),white_16%)]
            ${isBeveled ? 'btn-beveled-secondary' : 'shadow-sm hover:shadow-md'}
            hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary-200)] disabled:border-[var(--color-brand-border)] disabled:bg-[var(--brand-background)] disabled:text-[var(--brand-secondary)]
        `
        .replace(/\s+/g, ' ')
        .trim(),

      ghost:
        'text-[var(--brand-secondary)] hover:bg-[var(--brand-primary-50)] hover:text-[var(--brand-primary)] transition-colors',
      danger:
        'border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/15 hover:text-red-400 active:scale-95 disabled:border-red-500/10 disabled:bg-red-500/5 disabled:text-red-400/60',
      icon: 'text-[var(--brand-secondary)] hover:text-[var(--brand-text)] hover:bg-[var(--brand-background)] active:scale-95',
    };

    const sizes = {
      sm: 'h-9 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
      xl: 'h-14 px-8 text-lg font-semibold gap-2.5',
      icon: 'h-9 w-9 p-0',
    };

    const shapes = {
      default: 'rounded-[var(--radius-md)]',
      pill: 'rounded-full',
      square: 'rounded-none',
    };

    return (
      <button
        ref={ref}
        className={`
                ${baseStyles}
                ${variants[variant]}
                ${sizes[size]}
                ${shapes[shape]}
                ${className}
            `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {!isLoading && icon && <span className={`${children ? '' : ''}`}>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
