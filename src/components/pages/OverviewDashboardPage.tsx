'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import {
  getLedgerOverview,
  getUsers,
  getApiTelemetryOverview,
  getSourcingQualityMetrics,
  getSupportMessages,
} from '@/lib/api';
import {
  FinancialOverviewData,
  ApiUsersResponse,
  ApiTelemetryOverview,
  SourcingQualityMetrics,
  ApiSupportMessage,
} from '@/types';

export default function OverviewDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [financials, setFinancials] = useState<FinancialOverviewData | null>(null);
  const [userStats, setUserStats] = useState<ApiUsersResponse['data']['stats'] | null>(null);
  const [telemetry, setTelemetry] = useState<ApiTelemetryOverview | null>(null);
  const [sourcing, setSourcing] = useState<SourcingQualityMetrics | null>(null);
  const [supportTickets, setSupportTickets] = useState<{
    stats: { totalMessages: number; totalOpen: number; totalClosed: number };
    recent: ApiSupportMessage[];
  } | null>(null);

  const loadAllMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [finRes, usersRes, telRes, srcRes, supRes] = await Promise.allSettled([
        getLedgerOverview(),
        getUsers({ page: 1, limit: 1 }),
        getApiTelemetryOverview(24),
        getSourcingQualityMetrics(),
        getSupportMessages({ page: 1, limit: 5 }),
      ]);

      if (finRes.status === 'fulfilled') setFinancials(finRes.value);
      if (usersRes.status === 'fulfilled' && usersRes.value.stats) setUserStats(usersRes.value.stats);
      if (telRes.status === 'fulfilled') setTelemetry(telRes.value);
      if (srcRes.status === 'fulfilled') setSourcing(srcRes.value);
      if (supRes.status === 'fulfilled') {
        setSupportTickets({
          stats: supRes.value.stats || { totalMessages: 0, totalOpen: 0, totalClosed: 0 },
          recent: supRes.value.supports || [],
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to aggregate overview metrics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMetrics();
  }, []);

  const formatEGP = (num: number) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(num || 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Command Center</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Live operational health, founder debt waterfall, AI sourcing telemetry, and user management
          </p>
        </div>

        <button
          onClick={loadAllMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm self-start sm:self-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          Refresh All
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-[#FF5A6E] text-sm">
          {error}
        </div>
      )}

      {/* Primary KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <StatCard
          title="TOTAL ACCOUNTS"
          value={userStats?.totalUsers || 0}
          iconSrc="/icon-user-mgmt.svg"
          valueColor="text-slate-900"
        />

        {/* Gross Revenue */}
        <StatCard
          title="GROSS PLATFORM REVENUE"
          value={formatEGP(financials?.platformRevenue.grossPlatformRevenueEGP || 0)}
          iconSrc="/icon-sparkles.svg"
          valueColor="text-[#0E5FBF]"
        />

        {/* Outstanding Debt */}
        <StatCard
          title="OUTSTANDING FOUNDER DEBT"
          value={formatEGP(financials?.debtWaterfall.netOutstandingDebtEGP || 0)}
          iconSrc="/icon-financials.svg"
          valueColor="text-[#FF5A6E]"
        />

        {/* Open Support Issues */}
        <StatCard
          title="OPEN SUPPORT TICKETS"
          value={supportTickets?.stats.totalOpen || 0}
          iconSrc="/icon-headset.svg"
          valueColor={supportTickets?.stats.totalOpen ? 'text-[#FF5A6E]' : 'text-[#1ECB7F]'}
        />
      </div>

      {/* Grid: Financials & AI Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pillar 1: Financial Ledger & Debt Waterfall */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#E8F5F3] text-[#31A895]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Founder Debt & Waterfall</h2>
                <p className="text-xs text-slate-500">Append-only cryptographic ledger</p>
              </div>
            </div>

            <Link
              href="/dashboard/financials"
              className="text-xs font-semibold text-[#31A895] hover:underline flex items-center gap-1"
            >
              Open Ledger ➔
            </Link>
          </div>

          {financials ? (
            <div className="space-y-4">
              {/* Chain Status Pill */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Cryptographic Chain:</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${
                    financials.security.chainIntegrityValid
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {financials.security.cryptographicChain} ({financials.security.totalVerifiedBlocks} blocks)
                </span>
              </div>

              {/* Progress */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">Debt Payoff Progress</span>
                  <span className="font-bold text-[#31A895]">
                    {financials.debtWaterfall.payoffProgressPercent}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#1ECB7F] to-[#31A895]"
                    style={{ width: `${financials.debtWaterfall.payoffProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Repaid: {formatEGP(financials.debtWaterfall.totalRepaidDebtEGP)}</span>
                  <span>Injected: {formatEGP(financials.debtWaterfall.totalInjectedDebtEGP)}</span>
                </div>
              </div>

              {/* Dividend Lock Banner */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">
                    {financials.debtWaterfall.dividendStatus === 'UNLOCKED' ? '🔓' : '🔒'}
                  </span>
                  <span className="font-semibold text-slate-800">
                    {financials.debtWaterfall.dividendStatus === 'UNLOCKED'
                      ? 'Dividends Unlocked'
                      : 'Dividends Locked (100% Debt First)'}
                  </span>
                </div>
                <span className="text-slate-500 font-mono text-xs">
                  {financials.platformRevenue.completedTransactionsCount} Paymob txns
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">Loading financial status...</div>
          )}
        </div>

        {/* Pillar 2: AI Sourcing & API Telemetry */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-[#E8F5F3] text-[#31A895]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900">AI & Sourcing Health</h2>
                <p className="text-xs text-slate-500">Gemini Vision & Render DINOv2 telemetry</p>
              </div>
            </div>

            <Link
              href="/dashboard/sourcing"
              className="text-xs font-semibold text-[#31A895] hover:underline flex items-center gap-1"
            >
              View Telemetry ➔
            </Link>
          </div>

          <div className="space-y-4">
            {/* Telemetry Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs text-slate-500 block">24h Volume</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {telemetry?.totalRequests || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs text-slate-500 block">Error Rate</span>
                <span className="text-base font-bold text-[#1ECB7F] mt-0.5 block">
                  {telemetry?.errorRatePercent?.toFixed(1) || 0}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-xs text-slate-500 block">Rejection Rate</span>
                <span className="text-base font-bold text-slate-800 mt-0.5 block">
                  {sourcing?.rejectionRatePercent?.toFixed(1) || 0}%
                </span>
              </div>
            </div>

            {/* Sourcing Latency Preview */}
            {sourcing?.latencyBreakdown && (
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <span className="font-semibold text-slate-700 block">Average Latency Pipeline:</span>
                <div className="grid grid-cols-3 text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px]">GEMINI VISION</span>
                    <span className="font-semibold">{sourcing.latencyBreakdown.avgGeminiVisionMs}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">DINOV2 EMBED</span>
                    <span className="font-semibold">{sourcing.latencyBreakdown.avgRenderDinoSearchMs}ms</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">TOTAL ROUNDTRIP</span>
                    <span className="font-semibold text-[#31A895]">
                      {sourcing.latencyBreakdown.avgTotalRoundtripMs}ms
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pillar 3: Recent Customer Support Messages */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎧</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Customer Support Messages</h2>
              <p className="text-xs text-slate-500">
                {supportTickets?.stats.totalOpen || 0} open tickets requiring team review
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/support"
            className="text-xs font-semibold text-[#31A895] hover:underline"
          >
            View All Tickets ({supportTickets?.stats.totalMessages || 0}) ➔
          </Link>
        </div>

        {supportTickets?.recent && supportTickets.recent.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase">
                  <th className="pb-3">EMAIL</th>
                  <th className="pb-3">SUBJECT</th>
                  <th className="pb-3">DATE</th>
                  <th className="pb-3">STATUS</th>
                  <th className="pb-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supportTickets.recent.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 text-xs text-slate-700">{ticket.email}</td>
                    <td className="py-3 text-xs font-medium text-slate-900">{ticket.subject}</td>
                    <td className="py-3 text-xs text-slate-500">
                      {ticket.createdAt ? ticket.createdAt.split('T')[0] : ''}
                    </td>
                    <td className="py-3">
                      <Badge variant={ticket.status === 'closed' ? 'success' : 'danger'} size="sm">
                        {ticket.status === 'closed' ? 'Closed' : 'Open'}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/dashboard/issue/${ticket._id}`}
                        className="text-xs font-semibold text-[#31A895] hover:underline"
                      >
                        Inspect & Notes ➔
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-6 text-slate-400 text-xs">No active support tickets.</p>
        )}
      </div>
    </div>
  );
}
