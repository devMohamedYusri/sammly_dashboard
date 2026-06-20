'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import { getSupportMessages } from '@/lib/api';
import { ApiSupportMessage } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ApiSupportMessage[]>([]);
  const [stats, setStats] = useState({ totalMessages: 0, totalOpen: 0, totalClosed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    let active = true;
    const fetchSupport = async () => {
      setLoading(true);
      try {
        const queryParams: any = {
          page,
          limit: 20,
          status: filterStatus === 'all' ? undefined : filterStatus,
          search: searchQuery.trim() || undefined,
        };
        const data = await getSupportMessages(queryParams);
        if (active) {
          if (page === 1) {
            setMessages(data.supports);
          } else {
            setMessages((prev) => [...prev, ...data.supports]);
          }
          if (data.stats) {
            setStats({
              totalMessages: data.stats.totalMessages || 0,
              totalOpen: data.stats.totalOpen || 0,
              totalClosed: data.stats.totalClosed || 0,
            });
          }
          setHasMore(data.pagination.hasMore);
          setError(null);
        }
      } catch (err: any) {
        if (active) {
          setError(err?.message || 'Failed to load support messages');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const delayDebounceFn = setTimeout(
      () => {
        fetchSupport();
      },
      searchQuery ? 300 : 0
    );

    return () => {
      active = false;
      clearTimeout(delayDebounceFn);
    };
  }, [page, filterStatus, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value as any);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issues Analytics</h1>
        <p className="text-slate-500 mt-1">Track and monitor app issues reported by users</p>
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
            placeholder="Search by email ..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={handleStatusChange}
          className="px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent min-w-[140px]"
        >
          <option value="all">Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
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
          title="Total Issues"
          value={stats.totalMessages}
          iconSrc="/icon-users.svg"
        />
        <StatCard
          title="Closed"
          value={stats.totalClosed}
          iconSrc="/icon-check.svg"
          valueColor="text-[#1ECB7F]"
        />
        <StatCard
          title="Open"
          value={stats.totalOpen}
          iconSrc="/icon-close.svg"
          valueColor="text-[#FF5A6E]"
        />
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">EMAIL</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SUBJECT</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">DATE</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {messages.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                  No issues found.
                </td>
              </tr>
            )}
            {messages.map((support) => (
              <tr
                key={support._id}
                onClick={() => router.push(`/dashboard/issue/${support._id}`)}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 text-sm text-slate-700">
                  {support.email}
                </td>
                <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                  {support.subject}
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  {support.createdAt ? support.createdAt.split('T')[0] : ''}
                </td>
                <td className="px-6 py-4">
                  <Badge variant={support.status === 'closed' ? 'success' : 'danger'}>
                    {support.status === 'closed' ? 'Closed' : 'Open'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

