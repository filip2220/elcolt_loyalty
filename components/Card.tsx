import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

// PERFORMANCE: Memoize Card component to prevent unnecessary re-renders
// This is a pure presentational component that only depends on props
const Card: React.FC<CardProps> = React.memo(({ children, className = '' }) => {
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;