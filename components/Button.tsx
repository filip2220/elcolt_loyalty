import React, { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// PERFORMANCE: Memoize Button component to prevent unnecessary re-renders
// Buttons are used throughout the app and benefit from memoization
const Button: React.FC<ButtonProps> = React.memo(({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseClasses = 'font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center transition ease-in-out duration-150';

  const variantClasses = {
    primary: 'bg-green-700 text-white hover:bg-green-600 focus:ring-green-500 disabled:bg-green-900 disabled:text-gray-400',
    secondary: 'bg-gray-600 text-gray-200 hover:bg-gray-500 focus:ring-gray-400 disabled:bg-gray-700 disabled:text-gray-400',
  };

  const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };

  const disabledClasses = 'disabled:cursor-not-allowed';

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