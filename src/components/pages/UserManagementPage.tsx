'use client';

import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '@/components/common/DataTable';
import Badge from '@/components/common/Badge';
import StatCard from '@/components/common/StatCard';
import UserBalanceModal from '@/components/users/UserBalanceModal';
import { useAuth } from '@/context/AuthContext';
import { getUsers, activateUser, deactivateUser } from '@/lib/api';
import { ApiUser } from '@/types';

function CoinsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const isFounder = currentUser?.role === 'founder';

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, deactivatedUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Pending' | 'Inactive'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Founder Balance & Subscription Modal State
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceTargetUser, setBalanceTargetUser] = useState<ApiUser | null>(null);

  const fetchUsers = useCallback(async (isLoadMore = false) => {
    setLoading(true);
    try {
      let apiStatus: 'active' | 'deactivated' | 'pending' | undefined = undefined;
      if (filterStatus === 'Active') apiStatus = 'active';
      else if (filterStatus === 'Inactive') apiStatus = 'deactivated';
      else if (filterStatus === 'Pending') apiStatus = 'pending';

      const targetPage = isLoadMore ? page : 1;
      const data = await getUsers({
        page: targetPage,
        limit: 20,
        status: apiStatus,
        search: searchQuery.trim() || undefined,
      });

      if (isLoadMore) {
        setUsers((prev) => [...prev, ...data.users]);
      } else {
        setUsers(data.users);
      }

      if (data.stats) {
        setStats({
          totalUsers: data.stats.totalUsers || 0,
          activeUsers: data.stats.activeUsers || 0,
          deactivatedUsers: data.stats.deactivatedUsers || 0,
        });
      }
      setHasMore(data.pagination.hasMore);
      setError(null);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load users';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, page, searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(
      () => {
        fetchUsers(false);
      },
      searchQuery ? 300 : 0
    );

    return () => clearTimeout(delayDebounceFn);
  }, [filterStatus, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleToggleStatus = async (user: ApiUser) => {
    try {
      if (user.status === 'active') {
        await deactivateUser(user._id);
      } else {
        await activateUser(user._id);
      }
      fetchUsers(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user status';
      alert(msg);
    }
  };

  const tableColumns = [
    {
      key: 'email' as const,
      label: 'USER / EMAIL',
      render: (value: unknown, row: ApiUser) => {
        const initial = (row.email || 'U').charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8F5F3] text-[#31A895] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#d5eeea]">
              {initial}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 block truncate text-xs sm:text-sm">
                {row.email}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {row.username ? `@${row.username}` : 'No username set'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role' as const,
      label: 'ROLE',
      width: '110px',
      render: (value: unknown) => {
        const roleStr = String(value || 'user').toLowerCase();
        if (roleStr === 'founder') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 border border-purple-200">
              FOUNDER
            </span>
          );
        }
        if (roleStr === 'admin') {
          return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200">
              ADMIN
            </span>
          );
        }
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            USER
          </span>
        );
      },
    },
    {
      key: 'credits' as const,
      label: 'CREDITS & PLAN',
      render: (value: unknown, row: ApiUser) => {
        const amount = Number(row.credits !== undefined ? row.credits : (row.tokens || 0));
        const sub = row.subscriptionDetails;
        const isActiveSub = sub?.status === 'active';
        const isLapsed = sub?.status === 'lapsed';

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                {amount.toFixed(1)}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">pts</span>
            </div>

            {isActiveSub ? (
              <div className="flex flex-col gap-0.5">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 w-fit"
                  title={`Expires: ${sub?.expiresAt ? sub.expiresAt.split('T')[0] : 'Active'}`}
                >
                  <span>👑</span>
                  <span>{sub?.planTitle || sub?.interval?.replace('_', ' ') || 'Subscribed'}</span>
                </span>
                {sub?.totalCycles && sub.totalCycles > 1 && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Mo {sub.dispatchedCycles || 1}/{sub.totalCycles}
                    {sub.nextDispatchDate ? ` • Next: ${sub.nextDispatchDate.split('T')[0]}` : ''}
                  </span>
                )}
              </div>
            ) : isLapsed ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 w-fit"
                title={`30d warranty grace period ends: ${sub?.gracePeriodExpiresAt ? sub.gracePeriodExpiresAt.split('T')[0] : 'Soon'}`}
              >
                <span>⏳</span>
                <span>Lapsed (30d Grace)</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium">Free Tier</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'joinAt' as const,
      label: 'JOINED',
      width: '110px',
      render: (value: unknown) => {
        const dateStr = String(value || '');
        return (
          <span className="text-xs text-slate-500 whitespace-nowrap font-medium">
            {dateStr ? dateStr.split('T')[0] : '—'}
          </span>
        );
      },
    },
    {
      key: 'status' as const,
      label: 'STATUS',
      width: '100px',
      render: (value: unknown) => {
        const statusStr = String(value);
        let variant: 'success' | 'danger' | 'warning' = 'danger';
        if (statusStr === 'active') variant = 'success';
        else if (statusStr === 'pending') variant = 'warning';

        const displayLabel = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
        return <Badge variant={variant} size="sm">{displayLabel}</Badge>;
      },
    },
    {
      key: '_id' as const,
      label: 'ACTION',
      width: '140px',
      render: (value: unknown, row: ApiUser) => {
        const isTargetFounder = row.role === 'founder';
        const isTargetAdmin = row.role === 'admin';

        // Founder cannot be deactivated
        if (isTargetFounder) {
          return <span className="text-xs text-slate-400 italic">Protected</span>;
        }

        // Admin cannot be modified if current user is not a founder
        if (isTargetAdmin && !isFounder) {
          return <span className="text-xs text-slate-400 italic">Admin</span>;
        }

        return (
          <div className="flex items-center gap-2">
            {isFounder && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBalanceTargetUser(row);
                  setShowBalanceModal(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#31A895] bg-[#E8F5F3] hover:bg-[#d5eeea] rounded-lg transition-colors border border-[#A3D7CF] shadow-2xs"
                title="Manage credits & subscription"
              >
                <CoinsIcon className="w-3.5 h-3.5 text-[#31A895]" />
                <span>Balance</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleStatus(row);
              }}
              className={`px-2 py-1 text-xs font-semibold rounded-lg transition-colors ${
                row.status === 'active'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-[#31A895] hover:bg-emerald-50'
              }`}
            >
              {row.status === 'active' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 max-w-full">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Directory, account permissions, and founder credit allocations
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Refresh */}
          <button
            onClick={() => fetchUsers(false)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh user directory"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Refresh</span>
            {lastRefreshed && (
              <span className="text-[10px] text-slate-400 font-normal hidden md:inline">({lastRefreshed})</span>
            )}
          </button>

          {/* Quick Balance Button (Founder Only) */}
          {isFounder && (
            <button
              onClick={() => {
                setBalanceTargetUser(null);
                setShowBalanceModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#31A895] text-white text-xs font-bold hover:bg-[#289076] transition-colors shadow-xs cursor-pointer"
            >
              <CoinsIcon className="w-4 h-4 text-white" />
              <span>Quick Balance &amp; Sub</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Stats Cards (3 Compact Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          title="TOTAL USERS"
          value={stats.totalUsers}
          iconSrc="/icon-users.svg"
          subtitle="Registered accounts"
        />
        <StatCard
          title="ACTIVE ACCOUNTS"
          value={stats.activeUsers}
          iconSrc="/icon-check.svg"
          valueColor="text-[#1ECB7F]"
          subtitle="Verified & active"
        />
        <StatCard
          title="INACTIVE / DEACTIVATED"
          value={stats.deactivatedUsers}
          iconSrc="/icon-close.svg"
          valueColor="text-[#FF5A6E]"
          subtitle="Suspended accounts"
        />
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by email or username..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895] bg-slate-50/50 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Segmented Status Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto overflow-x-auto max-w-full">
            {(
              [
                { id: 'all', label: 'All Users', count: stats.totalUsers },
                { id: 'Active', label: 'Active', count: stats.activeUsers },
                { id: 'Pending', label: 'Pending', count: null },
                { id: 'Inactive', label: 'Inactive', count: stats.deactivatedUsers },
              ] as const
            ).map((tab) => {
              const isSelected = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterStatus(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 text-xs text-[#FF5A6E] bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* 4. Data Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {users.length === 0 && !loading && (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            <div className="text-3xl mb-2">🔍</div>
            <p className="font-semibold text-slate-700">No users found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your search query or status filter.
            </p>
          </div>
        )}

        {users.length > 0 && (
          <div className="overflow-x-auto">
            <DataTable
              columns={tableColumns}
              data={users}
            />
          </div>
        )}

        {/* Load More Pagination */}
        {hasMore && (
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
            <button
              onClick={() => {
                setPage((prev) => prev + 1);
                fetchUsers(true);
              }}
              disabled={loading}
              className="px-6 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl transition-colors text-xs disabled:opacity-50 shadow-2xs"
            >
              {loading ? 'Loading...' : 'Load More Users'}
            </button>
          </div>
        )}
      </div>

      {/* 5. Founder-Exclusive Balance & Subscription Modal */}
      {isFounder && (
        <UserBalanceModal
          isOpen={showBalanceModal}
          onClose={() => setShowBalanceModal(false)}
          targetUser={balanceTargetUser}
          allUsers={users}
          onSuccess={() => fetchUsers(false)}
        />
      )}
    </div>
  );
}
