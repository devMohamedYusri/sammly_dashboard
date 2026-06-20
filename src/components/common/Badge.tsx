import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-[#E7FCF3] text-[#12924D] border border-[#A3F3CF]',
    danger: 'bg-[#FFE8EC] text-[#CC2236] border border-[#FFA3B3]',
    warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    info: 'bg-[#E8F5F3] text-[#1F6857] border border-[#A3D7CF]',
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded',
    md: 'text-xs px-3 py-1 rounded-md',
    lg: 'text-sm px-4 py-1.5 rounded-lg',
  };

  return (
    <span
      className={`inline-block font-medium ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
