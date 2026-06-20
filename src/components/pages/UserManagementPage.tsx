'use client';

import React, { useState, useEffect } from 'react';
import DataTable from '@/components/common/DataTable';
import Badge from '@/components/common/Badge';
import StatCard from '@/components/common/StatCard';
import { getUsers, activateUser, deactivateUser } from '@/lib/api';
import { ApiUser } from '@/types';

export default function UserManagementPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, deactivatedUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // values: 'all' | 'Active' | 'Inactive'

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let apiStatus: 'active' | 'deactivated' | undefined = undefined;
      if (filterStatus === 'Active') apiStatus = 'active';
      else if (filterStatus === 'Inactive') apiStatus = 'deactivated';

      const data = await getUsers({
        page,
        limit: 20,
        status: apiStatus,
        search: searchQuery.trim() || undefined,
      });

      if (page === 1) {
        setUsers(data.users);
      } else {
        setUsers((prev) => [...prev, ...data.users]);
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
    } catch (err: any) {
      setError(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(
      () => {
        fetchUsers();
      },
      searchQuery ? 300 : 0
    );

    return () => clearTimeout(delayDebounceFn);
  }, [page, filterStatus, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
    setPage(1);
  };

  const handleToggleStatus = async (user: ApiUser) => {
    try {
      if (user.status === 'active') {
        await deactivateUser(user._id);
      } else {
        await activateUser(user._id);
      }
      // Re-fetch users to reflect changes
      fetchUsers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update user status');
    }
  };

  const tableColumns = [
    { key: 'email' as const, label: 'EMAIL' },
    { key: 'username' as const, label: 'USERNAME' },
    { key: 'joinAt' as const, label: 'JOINED' },
    {
      key: 'status' as const,
      label: 'STATUS',
      render: (value: unknown) => {
        const statusStr = String(value);
        const variant = statusStr === 'active' ? 'success' as const : 'danger' as const;
        const displayLabel = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
        return <Badge variant={variant}>{displayLabel}</Badge>;
      }
    },
    {
      key: '_id' as const,
      label: 'ACTION',
      render: (value: unknown, row: ApiUser) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleStatus(row);
          }}
          className={`text-sm font-medium ${
            row.status === 'active'
              ? 'text-[#FF5A6E] hover:text-[#e64e5f]'
              : 'text-[#31A895] hover:text-[#289076]'
          }`}
        >
          {row.status === 'active' ? 'Deactivate' : 'Activate'}
        </button>
      )
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500 mt-1">Activate or deactivate user accounts</p>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by email or username..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={handleStatusChange}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent min-w-[160px]"
        >
          <option value="all">All Users</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 text-sm text-[#FF5A6E] bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="TOTAL USERS"
          value={stats.totalUsers}
          iconSrc="/icon-users.svg"
        />
        <StatCard
          title="ACTIVE"
          value={stats.activeUsers}
          iconSrc="/icon-check.svg"
          valueColor="text-[#1ECB7F]"
        />
        <StatCard
          title="INACTIVE"
          value={stats.deactivatedUsers}
          iconSrc="/icon-close.svg"
          valueColor="text-[#FF5A6E]"
        />
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {users.length === 0 && !loading && (
          <div className="px-6 py-8 text-center text-sm text-slate-500 bg-white">
            No users found.
          </div>
        )}
        {users.length > 0 && (
          <DataTable
            columns={tableColumns}
            data={users}
          />
        )}
      </div>

      {/* Pagination Load More */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
