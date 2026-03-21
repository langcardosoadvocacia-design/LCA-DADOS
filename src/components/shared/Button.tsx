import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  style,
  ...props 
}) => {
  let baseClass = 'btn-primary';
  if (variant === 'outline') baseClass = 'btn-outline';
  if (variant === 'danger') baseClass = 'btn-danger';
  if (variant === 'secondary') baseClass = 'btn-secondary';
  if (variant === 'ghost') baseClass = 'btn-ghost';
  
  return (
    <button 
      className={`${baseClass} ${className}`} 
      style={{ width: fullWidth ? '100%' : undefined, ...style }}
      {...props}
    >
      {children}
    </button>
  );
};
