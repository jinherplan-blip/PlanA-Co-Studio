import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      className={`bg-white rounded-xl border border-slate-200/60 shadow-sm p-6 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;