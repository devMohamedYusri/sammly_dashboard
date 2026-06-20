'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

const TopBar: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="fixed left-sidebar right-0 top-0 h-topbar bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-40">
      <div className="text-slate-600">
        <p className="text-sm">Welcome back</p>
        <p className="text-lg font-semibold text-slate-900">{user?.name || 'Admin'}</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <span className="text-xl">🔔</span>
          <span className="absolute top-1 right-1 h-2 w-2 bg-accent-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <span className="text-xl">⚙️</span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
