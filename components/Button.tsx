import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Tactical-styled button component with hunting/outdoor aesthetic
const Button: React.FC<ButtonProps> = React.memo(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = `
    font-display font-semibold uppercase tracking-wider
    rounded-sm
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950
    flex items-center justify-center gap-2
    transition-all duration-200 ease-out
    transform active:scale-[0.98]
    border
  `;

  const variantClasses = {
    primary: `
      bg-gradient-to-b from-amber-500 to-amber-600
      hover:from-amber-400 hover:to-amber-500
      text-slate-950 
      border-amber-700
      focus:ring-amber-500
      shadow-lg shadow-amber-900/30
      hover:shadow-xl hover:shadow-amber-900/40
      disabled:from-slate-700 disabled:to-slate-800 
      disabled:text-slate-500 disabled:border-slate-600
      disabled:shadow-none
    `,
    secondary: `
      bg-gradient-to-b from-olive-500 to-olive-600
      hover:from-olive-400 hover:to-olive-500
      text-cream
      border-olive-600
      focus:ring-olive-500
      shadow-md shadow-black/20
      disabled:from-slate-700 disabled:to-slate-800 
      disabled:text-slate-500 disabled:border-slate-600
    `,
    ghost: `
      bg-transparent
      hover:bg-slate-800
      text-stone-300
      border-slate-700
      hover:border-slate-600
      focus:ring-brass-500
    `,
  };

  const sizeClasses = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-2.5 px-5 text-base',
    lg: 'py-3.5 px-7 text-lg',
  };

  const disabledClasses = 'disabled:cursor-not-allowed disabled:transform-none';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
