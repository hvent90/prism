import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  title?: string;
  className?: string;
  type?: 'button' | 'submit';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  title,
  className = '',
  type = 'button',
}) => {
  const baseClasses = 'btn';
  const variantClasses = `btn-${variant}`;
  const sizeClasses = size === 'sm' ? 'btn-sm' : '';
  const disabledClasses = disabled ? 'disabled' : '';
  
  const allClasses = [baseClasses, variantClasses, sizeClasses, disabledClasses, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={allClasses}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}; 