import React from 'react';

export default function Button({ children, className = '', variant = 'primary', disabled = false, ...props }) {
  const cls = `btn ${variant === 'primary' ? 'btn--primary' : ''} ${disabled ? 'btn--disabled' : ''} ${className}`.trim();
  return (
    <button className={cls} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
