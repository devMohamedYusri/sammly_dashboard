'use client';

import React from 'react';
import Link from 'next/link';
import { useNavigation } from '@/context/NavigationContext';
import { useAuth } from '@/context/AuthContext';

const Sidebar: React.FC = () => {
  const { activeNav, setActiveNav } = useNavigation();
  const { logout } = useAuth();

  const navItems = [
    {
      id: 'users' as const,
      label: 'User Management',
      href: '/dashboard/users',
      renderIcon: (active: boolean) => (
        <img
          src="/icon-user-mgmt.svg"
          alt="User Management"
          className="w-6 h-6"
          style={active ? { filter: 'brightness(0) invert(1)' } : {}}
        />
      ),
    },
    {
      id: 'token-pricing' as const,
      label: 'Token Pricing',
      href: '/dashboard/token-pricing',
      renderIcon: (active: boolean) => (
        <img
          src="/icon-sparkles.svg"
          alt="Token Pricing"
          className="w-6 h-6"
          style={active ? { filter: 'brightness(0) invert(1)' } : {}}
        />
      ),
    },
    {
      id: 'dashboard' as const,
      label: 'Issues Analytics',
      href: '/dashboard',
      renderIcon: (active: boolean) => (
        <img
          src="/icon-headset.svg"
          alt="Issues Analytics"
          className="w-6 h-6"
          style={active ? { filter: 'brightness(0) invert(1)' } : {}}
        />
      ),
    },
    {
      id: 'sourcing' as const,
      label: 'AI & Sourcing',
      href: '/dashboard/sourcing',
      renderIcon: (active: boolean) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={active ? 'text-white' : 'text-slate-600'}
        >
          <path d="M21 21l-4.35-4.35" />
          <circle cx="11" cy="11" r="8" />
          <path d="M11 8v6M8 11h6" />
        </svg>
      ),
    },
    {
      id: 'system' as const,
      label: 'App & Feature Flags',
      href: '/dashboard/system',
      renderIcon: (active: boolean) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={active ? 'text-white' : 'text-slate-600'}
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      ),
    },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="fixed left-0 top-0 h-screen w-[237px] bg-white flex flex-col z-50 border-r border-slate-100">
      {/* Logo */}
      <div className="px-6 py-8">
        <img
          src="/sammly-logo.svg"
          alt="SAMMLY Logo"
          className="w-[160px] h-auto"
        />
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setActiveNav(item.id)}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
              activeNav === item.id
                ? 'bg-[#31A895] text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="w-6 h-6 flex items-center justify-center">
              {item.renderIcon(activeNav === item.id)}
            </span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 bg-[#FF5A6E] text-white hover:bg-[#e64e5f] transition-colors text-sm font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Log out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
