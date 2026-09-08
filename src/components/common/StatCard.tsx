import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  iconSrc?: string;
  iconBg?: string;
  valueColor?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconSrc,
  iconBg = 'bg-[#E8F5F3]',
  valueColor = 'text-slate-900',
  subtitle,
}) => {
  const valueStr = String(value ?? '');
  // Dynamically scale font size so 6+ digit numbers or currencies don't overflow
  const isLargeNumber = valueStr.length > 13;
  const isMediumNumber = valueStr.length > 9;

  const fontClass = isLargeNumber
    ? 'text-lg sm:text-xl'
    : isMediumNumber
    ? 'text-xl sm:text-2xl'
    : 'text-2xl sm:text-3xl';

  return (
    <div className="flex items-center gap-3.5 rounded-xl p-4 sm:p-5 bg-[#f0faf8] border border-[#d5eeea] min-w-0 w-full shadow-sm hover:shadow transition-shadow">
      <div className={`${iconBg} w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 flex items-center justify-center p-2 text-[#31A895]`}>
        {iconSrc ? (
          <img src={iconSrc} alt={title} className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
        ) : icon ? (
          <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
            {icon}
          </div>
        ) : null}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="text-xs sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate" title={title}>
          {title}
        </p>
        <p
          className={`${fontClass} font-bold ${valueColor} truncate tracking-tight mt-0.5 leading-tight`}
          title={valueStr}
        >
          {valueStr}
        </p>
        {subtitle && (
          <p className="text-[10px] text-slate-400 truncate mt-0.5" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;

