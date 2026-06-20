'use client';

import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface LayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-[237px]">
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {/* Top Right User Info */}
            <div className="flex justify-end items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0E5FBF] to-[#31A895] flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                  {user?.avatar
                    ? <img src={user.avatar} alt={user.name || 'User'} className="w-full h-full object-cover" />
                    : user?.name?.charAt(0)
                  }
                </div>
                <span className="text-sm font-medium text-slate-700">{user?.name}</span>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
