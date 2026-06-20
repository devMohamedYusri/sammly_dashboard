import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  iconSrc?: string;
  iconBg?: string;
  valueColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconSrc,
  iconBg = 'bg-transparent',
  valueColor = 'text-slate-900',
}) => {
  return (
    <div className="flex items-center gap-4 rounded-xl p-5 bg-[#f0faf8] border border-[#d5eeea]">
      <div className={`${iconBg} rounded-full flex items-center justify-center`}>
        {iconSrc ? (
          <img src={iconSrc} alt={title} className="w-12 h-12" />
        ) : icon ? (
          <div className="w-12 h-12 flex items-center justify-center">
            {icon}
          </div>
        ) : null}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
