import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ title, children, className = '', style }) => {
  return (
    <div className={`glass-panel ${className}`} style={{ padding: '1.5rem', ...style }}>
      {title && <h3 className="text-serif" style={{ marginTop: 0, marginBottom: '1.5rem' }}>{title}</h3>}
      {children}
    </div>
  );
};
