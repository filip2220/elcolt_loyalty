import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'bordered';
}

// Premium card component with tactical/outdoor aesthetic
const Card: React.FC<CardProps> = React.memo(({ 
  children, 
  className = '',
  variant = 'default'
}) => {
  const baseClasses = `
    rounded-sm
    transition-all duration-300 ease-out
    animate-fade-in
  `;

  const variantClasses = {
    default: `
      bg-gradient-to-b from-slate-850 to-slate-900
      border border-slate-700/50
      shadow-lg shadow-black/20
    `,
    elevated: `
      bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900
      border border-slate-600/30
      shadow-xl shadow-black/30
      hover:shadow-2xl hover:shadow-black/40
      hover:border-slate-600/50
    `,
    bordered: `
      bg-slate-900/80
      border-2 border-brass-500/30
      shadow-lg shadow-brass-900/10
    `,
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} p-6 ${className}`}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
