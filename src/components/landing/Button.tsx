import React from 'react';
import { useFlowStore } from '../../store';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'default' | 'pill' | 'square';
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  shape = 'default',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps): React.ReactElement {
  const buttonStyle = useFlowStore(state => state.brandConfig.ui.buttonStyle);

  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";

  const isBeveled = buttonStyle === 'beveled';

  // Note: We use specific shadow stacks here to create the bevel effect. 
  // Avoid adding extra 'shadow-lg' classes on the component usage, as it will override these.
  const variants = {
    primary: `
      bg-[var(--brand-primary)] text-white 
      ${isBeveled ? 'border border-[color-mix(in_srgb,var(--brand-primary),black_20%)] shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.3),inset_0px_-3px_0px_0px_rgba(0,0,0,0.18),0px_4px_8px_-2px_rgba(0,0,0,0.05),0px_3px_5px_-2px_rgba(0,0,0,0.05)]' : 'border border-transparent'}
      hover:bg-[var(--brand-primary-600)] hover:-translate-y-[0.5px] 
      ${isBeveled ? 'hover:shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.35),inset_0px_-3px_0px_0px_rgba(0,0,0,0.2),0px_15px_20px_-5px_rgba(0,0,0,0.08),0px_8px_8px_-5px_rgba(0,0,0,0.03)]' : ''}
      active:translate-y-[0.5px] 
      ${isBeveled ? 'active:shadow-[inset_0px_1.5px_3px_rgba(0,0,0,0.18)]' : ''}
    `.replace(/\s+/g, ' ').trim(),

    secondary: `
      bg-white text-brand-dark 
      ${isBeveled ? 'border border-brand-border shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.8),inset_0px_-2px_0px_0px_rgba(0,0,0,0.05),0px_1px_1.5px_0_rgba(0,0,0,0.03)]' : 'border border-brand-border'}
      hover:bg-brand-canvas hover:border-gray-300 hover:-translate-y-[0.5px] 
      ${isBeveled ? 'hover:shadow-[inset_0px_1px_0px_0px_rgba(255,255,255,0.8),inset_0px_-2px_0px_0px_rgba(0,0,0,0.07),0px_4px_8px_-2px_rgba(0,0,0,0.05)]' : ''}
      active:translate-y-[0.5px] 
      ${isBeveled ? 'active:shadow-[inset_0px_1.5px_3px_rgba(0,0,0,0.03)]' : ''}
    `.replace(/\s+/g, ' ').trim(),

    outline: "bg-transparent text-brand-primary border border-brand-border hover:border-brand-primary/30 hover:bg-brand-canvas",
    ghost: "bg-transparent text-brand-secondary hover:text-brand-primary hover:bg-brand-canvas",
  };

  const sizes = {
    sm: "text-[13px] px-4 py-1.5 gap-1.5 h-8",
    md: "text-sm px-5 py-2.5 gap-2 h-10",
    lg: "text-base px-8 py-3.5 gap-2.5 h-12",
    xl: "text-[16px] px-8 py-4 gap-2.5 h-14 font-semibold",
  };

  const shapes = {
    default: "rounded-[var(--brand-radius)]",
    pill: "rounded-full",
    square: "rounded-none",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${shapes[shape]} ${className}`}
      {...props}
    >
      {children}
      {icon && <span className="ml-1">{icon}</span>}
    </button>
  );
}