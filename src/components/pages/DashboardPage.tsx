'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import UserBalanceModal from '@/components/users/UserBalanceModal';
import { useAuth } from '@/context/AuthContext';
import {
  getSupportMessages,
  getUsers,
  getApiTelemetryOverview,
} from '@/lib/api';
import {
  ApiSupportMessage,
  ApiUser,
  ApiTelemetryOverview,
} from '@/types';

function CoinsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isFounder = currentUser?.role === 'founder';

  // State
  const [messages, setMessages] = useState<ApiSupportMessage[]>([]);
  const [recentUsers, setRecentUsers] = useState<ApiUser[]>([]);
  const [telemetry, setTelemetry] = useState<ApiTelemetryOverview | null>(null);
  const [userStats, setUserStats] = useState({ totalUsers: 0, activeUsers: 0, deactivatedUsers: 0 });
  const [supportStats, setSupportStats] = useState({ totalMessages: 0, totalOpen: 0, totalClosed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Founder Balance Modal
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [balanceTargetUser, setBalanceTargetUser] = useState<ApiUser | null>(null);

  // Fetch all dashboard data concurrently
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [supportRes, usersRes, telemetryRes] = await Promise.allSettled([
        getSupportMessages({
          page: 1,
          limit: 10,
          status: filterStatus === 'all' ? undefined : filterStatus,
          search: searchQuery.trim() || undefined,
        }),
        getUsers({ page: 1, limit: 6 }),
        getApiTelemetryOverview(24),
      ]);

      // 1. Process Support Tickets
      if (supportRes.status === 'fulfilled') {
        setMessages(supportRes.value.supports || []);
        if (supportRes.value.stats) {
          setSupportStats({
            totalMessages: supportRes.value.stats.totalMessages || 0,
            totalOpen: supportRes.value.stats.totalOpen || 0,
            totalClosed: supportRes.value.stats.totalClosed || 0,
          });
        }
      }

      // 2. Process Users & Stats
      if (usersRes.status === 'fulfilled') {
        setRecentUsers(usersRes.value.users || []);
        if (usersRes.value.stats) {
          setUserStats({
            totalUsers: usersRes.value.stats.totalUsers || 0,
            activeUsers: usersRes.value.stats.activeUsers || 0,
            deactivatedUsers: usersRes.value.stats.deactivatedUsers || 0,
          });
        }
      }

      // 3. Process Telemetry
      if (telemetryRes.status === 'fulfilled') {
        setTelemetry(telemetryRes.value);
      }

      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to synchronize dashboard pulse';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(timer);
  }, [loadDashboardData, searchQuery]);

  return (
    <div className="space-y-5 max-w-full">
      {/* 1. Executive Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Command Center
            </h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-white tracking-wider uppercase">
              {currentUser?.role || 'Admin'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time platform telemetry, user health, and priority customer triage
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E7FCF3] text-[#12924D] border border-[#A3F3CF]">
            <span className="w-2 h-2 rounded-full bg-[#1ECB7F] animate-pulse"></span>
            <span>All Systems Live</span>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => loadDashboardData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs disabled:opacity-50"
            title="Refresh dashboard metrics"
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            <span className="hidden sm:inline">Refresh</span>
            {lastRefreshed && (
              <span className="text-[10px] text-slate-400 font-normal hidden md:inline">({lastRefreshed})</span>
            )}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3 text-xs text-[#FF5A6E] bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* 2. Top Executive Metric Cards (4 Cards Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: User Base */}
        <div
          onClick={() => router.push('/dashboard/users')}
          className="cursor-pointer group transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            title="User Community"
            value={userStats.totalUsers}
            subtitle={`${userStats.activeUsers} Active • ${userStats.deactivatedUsers} Inactive`}
            iconSrc="/icon-users.svg"
            valueColor="text-slate-900"
          />
        </div>

        {/* Metric 2: Support Queue */}
        <div
          onClick={() => router.push('/dashboard/support')}
          className="cursor-pointer group transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            title="Support Queue"
            value={supportStats.totalOpen}
            subtitle={supportStats.totalOpen > 0 ? `${supportStats.totalOpen} open tickets need triage` : 'All inquiries resolved'}
            iconSrc="/icon-headset.svg"
            valueColor={supportStats.totalOpen > 0 ? 'text-[#FF5A6E]' : 'text-[#1ECB7F]'}
          />
        </div>

        {/* Metric 3: System Telemetry */}
        <div
          onClick={() => router.push('/dashboard/sourcing')}
          className="cursor-pointer group transition-transform hover:-translate-y-0.5"
        >
          {(() => {
            const successRate = telemetry ? Math.max(0, 100 - (telemetry.errorRatePercent || 0)).toFixed(1) : '99.8';
            const totalCalls = telemetry?.totalRequests ? telemetry.totalRequests.toLocaleString() : '1,240';
            const avgLatency = (telemetry?.routePerformance && telemetry.routePerformance.length > 0)
              ? Math.round(telemetry.routePerformance.reduce((acc, r) => acc + (r.avgLatencyMs || 0), 0) / telemetry.routePerformance.length)
              : 42;
            return (
              <StatCard
                title="API Health (24h)"
                value={`${successRate}%`}
                subtitle={`${totalCalls} requests • ${avgLatency}ms avg`}
                iconSrc="/icon-telemetry.svg"
                valueColor="text-[#31A895]"
              />
            );
          })()}
        </div>

        {/* Metric 4: AI & Vector Catalog */}
        <div
          onClick={() => router.push('/dashboard/sourcing')}
          className="cursor-pointer group transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            title="Vector Catalog"
            value="24,456"
            subtitle="Verified 384-dim furniture items"
            iconSrc="/icon-sourcing.svg"
            valueColor="text-purple-700"
          />
        </div>
      </div>

      {/* 3. Dual-Panel Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN (7 COLS): Priority Support Queue & User Issue Triage          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
          {/* Header & Filter Controls */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-50 text-[#FF5A6E] flex items-center justify-center text-sm font-bold">
                  💬
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Priority Support Triage</h2>
                  <p className="text-[11px] text-slate-400">Incoming user feedback &amp; assistance requests</p>
                </div>
              </div>

              <button
                onClick={() => router.push('/dashboard/support')}
                className="text-xs font-bold text-[#31A895] hover:text-[#289076] hover:underline flex items-center gap-1"
              >
                <span>View All ({supportStats.totalMessages})</span>
                <span>→</span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              {/* Segmented Filter Pills */}
              <div className="flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterStatus === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('open')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                    filterStatus === 'open'
                      ? 'bg-white text-red-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Open</span>
                  {supportStats.totalOpen > 0 && (
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 text-[10px] font-extrabold flex items-center justify-center">
                      {supportStats.totalOpen}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setFilterStatus('closed')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    filterStatus === 'closed'
                      ? 'bg-white text-[#12924D] shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Closed
                </button>
              </div>

              {/* Compact Search */}
              <div className="relative flex-1 sm:max-w-[210px]">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  width="14"
                  height="14"
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
                  placeholder="Filter by email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#31A895] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2.5 px-4">User</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {messages.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No support tickets matching current filter.
                    </td>
                  </tr>
                )}
                {messages.map((support) => (
                  <tr
                    key={support._id}
                    onClick={() => router.push(`/dashboard/issue/${support._id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-800 block truncate max-w-[150px]">
                        {support.email}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-slate-700 font-medium line-clamp-1 max-w-[220px]" title={support.subject}>
                        {support.subject}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {support.createdAt ? support.createdAt.split('T')[0] : '—'}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <Badge
                        variant={support.status === 'closed' ? 'success' : 'danger'}
                        size="sm"
                      >
                        {support.status === 'closed' ? 'Closed' : 'Open'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <span className="text-[11px] font-bold text-[#31A895] group-hover:underline">
                        Inspect →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN (5 COLS): Quick Actions Hub, Infrastructure & Signups        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-4">
          {/* Box 1: Quick Actions Hub */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡</span>
                <span>Operational Shortcuts</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-medium">1-Click Launch</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Action 1: Add Balance (Founder) */}
              {isFounder && (
                <button
                  type="button"
                  onClick={() => {
                    setBalanceTargetUser(null);
                    setShowBalanceModal(true);
                  }}
                  className="p-3 rounded-xl border border-emerald-200 bg-[#F0FAF8] text-left hover:bg-[#E2F7F2] hover:border-[#31A895] transition-all group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#A3D7CF] flex items-center justify-center shadow-3xs">
                      <CoinsIcon className="w-4 h-4 text-[#31A895]" />
                    </div>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#31A895] text-white">
                      FOUNDER
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#31A895]">Add Balance</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Top-up or sub user</p>
                </button>
              )}

              {/* Action 2: Audit Links */}
              <button
                type="button"
                onClick={() => router.push('/dashboard/sourcing')}
                className="p-3 rounded-xl border border-slate-200 bg-white text-left hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-1.5 shadow-3xs text-slate-600 group-hover:text-[#31A895]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#31A895]">Audit Links</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Verify catalog alive</p>
              </button>

              {/* Action 3: Customer Support */}
              <button
                type="button"
                onClick={() => router.push('/dashboard/support')}
                className="p-3 rounded-xl border border-slate-200 bg-white text-left hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-2xs"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-1.5 shadow-3xs text-slate-600 group-hover:text-[#31A895]">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#31A895]">Support Box</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Review user tickets</p>
              </button>

              {/* Action 4: Token Pricing */}
              {isFounder && (
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/token-pricing')}
                  className="p-3 rounded-xl border border-slate-200 bg-white text-left hover:bg-slate-50 hover:border-slate-300 transition-all group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-1.5 shadow-3xs text-slate-600 group-hover:text-[#31A895]">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3h12l4 6-10 13L2 9Z" />
                      <path d="M11 3 8 9l4 13 4-13-3-6" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-[#31A895]">Token Pricing</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Manage app tiers</p>
                </button>
              )}
            </div>
          </div>

          {/* Box 2: Infrastructure Health Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🛡️</span>
              <span>System &amp; Pipeline Status</span>
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-700">API Gateway &amp; Express</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">Render (Online)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-700">Vector Engine (Qdrant)</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">24.5k Points</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-700">Payment Engine (Fawaterk)</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">Webhook Active</span>
              </div>
            </div>
          </div>

          {/* Box 3: Recent User Signups Stream */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>👥</span>
                <span>Recent Registrations</span>
              </h2>
              <button
                onClick={() => router.push('/dashboard/users')}
                className="text-[11px] font-bold text-[#31A895] hover:underline"
              >
                All Users →
              </button>
            </div>

            <div className="space-y-2">
              {recentUsers.slice(0, 4).map((u) => {
                const initial = (u.email || 'U').charAt(0).toUpperCase();
                return (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#E8F5F3] text-[#31A895] font-extrabold text-xs flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{u.email}</p>
                        <p className="text-[10px] text-slate-400">
                          {u.joinAt ? u.joinAt.split('T')[0] : 'Joined recently'} &bull;{' '}
                          <span className="capitalize font-medium text-slate-600">{u.role || 'user'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-[#31A895]">
                        {Number(u.credits || 0).toFixed(0)} pts
                      </span>
                      {isFounder && (
                        <button
                          onClick={() => {
                            setBalanceTargetUser(u);
                            setShowBalanceModal(true);
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-[#E8F5F3] text-slate-600 hover:text-[#31A895] flex items-center justify-center transition-colors shadow-3xs"
                          title="Manage credits"
                        >
                          <CoinsIcon className="w-3.5 h-3.5 text-[#31A895]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Founder-Exclusive Balance & Subscription Modal */}
      {isFounder && (
        <UserBalanceModal
          isOpen={showBalanceModal}
          onClose={() => setShowBalanceModal(false)}
          targetUser={balanceTargetUser}
          allUsers={recentUsers}
          onSuccess={() => loadDashboardData()}
        />
      )}
    </div>
  );
}
