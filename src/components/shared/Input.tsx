import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="input-group" style={{ marginBottom: props.type !== 'checkbox' ? '1rem' : 0 }}>
        {label && <label>{label}</label>}
        <input 
          ref={ref}
          className={`input-field ${error ? 'input-error' : ''} ${className}`} 
          {...props} 
        />
        {error && <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
