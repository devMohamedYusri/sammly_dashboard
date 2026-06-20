import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  highlight?: boolean;
}

const Card: React.FC<CardProps> = ({
  title,
  children,
  footer,
  className = '',
  highlight = false,
}) => {
  return (
    <div
      className={`rounded-xl border shadow-sm ${
        highlight
          ? 'border-[#d5eeea] bg-[#f0faf8]'
          : 'border-slate-200 bg-white'
      } ${className}`}
    >
      {title && (
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
