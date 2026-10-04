'use client';

import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface LayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoggedIn, isLoading, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading || !isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#31A895] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full">
            {/* Top Right User Info */}
            <div className="flex justify-end items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0E5FBF] to-[#31A895] flex items-center justify-center text-white font-bold text-sm overflow-hidden shadow-sm shrink-0">
                  {user?.avatar
                    ? <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                    : user?.name?.charAt(0)?.toUpperCase()
                  }
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-semibold text-slate-800 leading-tight truncate max-w-[180px]">{user?.name}</span>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded mt-0.5 ${
                    user?.role === 'founder'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {user?.role || 'Admin'}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full min-w-0">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
