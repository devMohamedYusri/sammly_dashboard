'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useNavigation } from '@/context/NavigationContext';
import { useAuth } from '@/context/AuthContext';

const Sidebar: React.FC = () => {
  const { activeNav, setActiveNav } = useNavigation();
  const { logout, user } = useAuth();
  const pathname = usePathname();
  const isFounder = user?.role === 'founder';

  const navItems = [
    {
      id: 'overview' as const,
      label: 'Command Center',
      href: '/dashboard',
      icon: '/icon-telemetry.svg',
      founderOnly: false,
    },
    {
      id: 'users' as const,
      label: 'User Management',
      href: '/dashboard/users',
      icon: '/icon-user-mgmt.svg',
      founderOnly: false,
    },
    {
      id: 'token-pricing' as const,
      label: 'Token Pricing',
      href: '/dashboard/token-pricing',
      icon: '/icon-sparkles.svg',
      founderOnly: true,
    },
    {
      id: 'support' as const,
      label: 'Customer Support',
      href: '/dashboard/support',
      icon: '/icon-headset.svg',
      founderOnly: false,
    },
    {
      id: 'sourcing' as const,
      label: 'AI & Sourcing',
      href: '/dashboard/sourcing',
      icon: '/icon-sourcing.svg',
      founderOnly: false,
    },
    {
      id: 'financials' as const,
      label: 'Financials & Equity',
      href: '/dashboard/financials',
      icon: '/icon-financials.svg',
      founderOnly: true,
    },
    {
      id: 'design-test' as const,
      label: 'AI Design Playground',
      href: '/dashboard/design-test',
      icon: '/icon-sparkles.svg',
      founderOnly: false,
    },
  ];

  // Derive active tab from current route URL pathname
  const getCurrentNav = () => {
    if (!pathname) return activeNav;
    if (pathname.startsWith('/dashboard/users')) return 'users';
    if (pathname.startsWith('/dashboard/token-pricing')) return 'token-pricing';
    if (pathname.startsWith('/dashboard/support') || pathname.startsWith('/dashboard/issue')) return 'support';
    if (pathname.startsWith('/dashboard/sourcing')) return 'sourcing';
    if (pathname.startsWith('/dashboard/financials')) return 'financials';
    if (pathname.startsWith('/dashboard/design-test')) return 'design-test';
    if (pathname === '/dashboard') return 'overview';
    return activeNav;
  };

  const currentNav = getCurrentNav();

  const visibleNavItems = navItems.filter(item => !item.founderOnly || isFounder);

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
        {visibleNavItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            onClick={() => setActiveNav(item.id)}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-all ${
              currentNav === item.id
                ? 'bg-[#31A895] text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="w-6 h-6 flex items-center justify-center">
              <img
                src={item.icon}
                alt={item.label}
                className="w-6 h-6"
                style={currentNav === item.id ? { filter: 'brightness(0) invert(1)' } : {}}
              />
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
