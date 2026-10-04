'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import { getMarketingStrategyAnalytics } from '@/lib/api';
import { MarketingStrategyAnalyticsData } from '@/types';

interface GrowthMarketingTabProps {
  isFounder: boolean;
  onNavigateToPurchases?: () => void;
  onNavigateToLedger?: () => void;
}

export default function GrowthMarketingTab({
  isFounder,
  onNavigateToPurchases,
  onNavigateToLedger,
}: GrowthMarketingTabProps) {
  // State
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [data, setData] = useState<MarketingStrategyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Interactive CAC & Ad Spend Simulator State
  const [simAdSpend, setSimAdSpend] = useState<number>(5000);
  const [simCustomers, setSimCustomers] = useState<number>(20);

  // Load analytics
  const fetchAnalytics = useCallback(async (selectedTimeframe: string, isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await getMarketingStrategyAnalytics(selectedTimeframe);
      setData(result);
      // Initialize simulator with actual data if available
      if (result.funnel.payingUsers > 0) {
        setSimCustomers(result.funnel.payingUsers);
      }
      if (result.burnAndRunway.marketingSpendLedgerEGP > 0) {
        setSimAdSpend(result.burnAndRunway.marketingSpendLedgerEGP);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load marketing & strategic analytics';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isFounder) {
      fetchAnalytics(timeframe);
    }
  }, [timeframe, isFounder, fetchAnalytics]);

  // Currency & formatting helpers
  const formatEGP = (num: number) => {
    const val = Number(num) || 0;
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const formatCompactEGP = (num: number) => {
    const val = Number(num) || 0;
    if (Math.abs(val) >= 1_000_000) {
      return `EGP ${(val / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(val) >= 100_000) {
      return `EGP ${(val / 1_000).toFixed(1)}k`;
    }
    return formatEGP(val);
  };

  // Simulator dynamic computations
  const simCac = useMemo(() => {
    if (simCustomers <= 0) return 0;
    return Math.round((simAdSpend / simCustomers) * 100) / 100;
  }, [simAdSpend, simCustomers]);

  const activeLtv = data?.unitEconomics.ltvEGP || 0;

  const simLtvCacRatio = useMemo(() => {
    if (simCac <= 0 || activeLtv <= 0) return null;
    return Math.round((activeLtv / simCac) * 10) / 10;
  }, [simCac, activeLtv]);

  const simPaybackMonths = useMemo(() => {
    const aov = data?.unitEconomics.aovEGP || 0;
    if (aov <= 0 || simCac <= 0) return null;
    return Math.max(0.1, Math.round((simCac / aov) * 10) / 10);
  }, [simCac, data?.unitEconomics.aovEGP]);

  // Access guard
  if (!isFounder) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center text-amber-900 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-700">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h3 className="text-base font-bold">Founder-Restricted Intelligence</h3>
        <p className="text-xs text-amber-800 mt-1">
          Strategic metrics, unit economics, conversion funnels, and runway forecasting are strictly reserved for the Founder role.
        </p>
      </div>
    );
  }

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-xl w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl border border-slate-200" />
          ))}
        </div>
        <div className="h-80 bg-slate-100 rounded-2xl border border-slate-200" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-100 rounded-2xl border border-slate-200" />
          <div className="h-72 bg-slate-100 rounded-2xl border border-slate-200" />
        </div>
      </div>
    );
  }

  // Error alert
  if (error && !data) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-[#FF5A6E] text-sm space-y-3">
        <p className="font-bold">Error loading growth intelligence:</p>
        <p>{error}</p>
        <button
          onClick={() => fetchAnalytics(timeframe)}
          className="px-4 py-2 bg-[#FF5A6E] text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const funnel = data?.funnel;
  const unitEcon = data?.unitEconomics;
  const runway = data?.burnAndRunway;
  const acq = data?.acquisitionInsights;
  const drivers = data?.productDrivers;
  const friction = data?.checkoutFriction;

  return (
    <div className="space-y-8">
      {/* 1. Header Toolbar & Timeframe Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Startup Growth &amp; Strategic Intelligence</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#E8F5F3] text-[#31A895] border border-[#d5eeea]">
              INVESTOR GRADE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time conversion leakage, unit economics, runway burn forecasting, and marketing creative drivers.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Timeframe Filter Pills */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            {(['7d', '30d', '90d', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeframe === t
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t === '7d' && '7 Days'}
                {t === '30d' && '30 Days'}
                {t === '90d' && '90 Days'}
                {t === 'all' && 'All-Time'}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(timeframe, true)}
            disabled={refreshing}
            title="Refresh intelligence metrics"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={refreshing ? 'animate-spin text-[#31A895]' : ''}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          {/* Print / Export Report Button */}
          <button
            onClick={() => window.print()}
            title="Print or save as PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span className="hidden sm:inline">Export One-Pager</span>
          </button>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="CONVERSION RATE"
          value={`${funnel?.overallConversionRate ?? 0}%`}
          subtitle={
            (funnel?.overallConversionRate ?? 0) >= 2.5
              ? 'High performer (Target: >2%)'
              : 'Signups to completed purchase'
          }
          valueColor={
            (funnel?.overallConversionRate ?? 0) >= 2.5
              ? 'text-[#12924D]'
              : (funnel?.overallConversionRate ?? 0) >= 1.0
              ? 'text-[#31A895]'
              : 'text-[#F59E0B]'
          }
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
        />

        <StatCard
          title="CUSTOMER LTV"
          value={formatCompactEGP(unitEcon?.ltvEGP ?? 0)}
          subtitle={formatEGP(unitEcon?.ltvEGP ?? 0)}
          valueColor="text-[#0E5FBF]"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />

        <StatCard
          title="AVG ORDER VALUE (AOV)"
          value={formatCompactEGP(unitEcon?.aovEGP ?? 0)}
          subtitle={`${unitEcon?.repeatPurchaseRate ?? 0}% repeat rate`}
          valueColor="text-slate-900"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          }
        />

        <StatCard
          title="NET MONTHLY BURN"
          value={formatCompactEGP(runway?.netBurnEGP ?? 0)}
          subtitle={`Rev: ${formatCompactEGP(runway?.monthlyRevenueEGP ?? 0)} / Mo`}
          valueColor={
            (runway?.netBurnEGP ?? 0) === 0 ? 'text-[#12924D]' : 'text-[#FF5A6E]'
          }
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          }
        />

        <StatCard
          title="ESTIMATED RUNWAY"
          value={
            runway?.estimatedRunwayMonths === 999
              ? 'Profitable'
              : runway?.estimatedRunwayMonths
              ? `${runway.estimatedRunwayMonths} Mo`
              : 'N/A'
          }
          subtitle={
            runway?.estimatedRunwayMonths === 999
              ? 'Cash flow positive'
              : `Reserve: ${formatCompactEGP(runway?.netOutstandingFounderCapital ?? 0)}`
          }
          valueColor={
            runway?.estimatedRunwayMonths === 999 || (runway?.estimatedRunwayMonths ?? 0) >= 12
              ? 'text-[#12924D]'
              : (runway?.estimatedRunwayMonths ?? 0) >= 6
              ? 'text-[#F59E0B]'
              : 'text-[#FF5A6E]'
          }
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          }
        />
      </div>

      {/* 3. Conversion Funnel (Visual Pipeline & Stage Drop-offs) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">4-Stage Product Conversion Funnel</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {timeframe.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks the journey from signup to first AI design creation, paywall intent, and finalized payment.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400">Total Audience in Period:</span>
            <span className="text-sm font-bold text-slate-800 ml-1.5">{funnel?.totalUsers.toLocaleString()} Users</span>
          </div>
        </div>

        {/* Funnel Pipeline Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Stage 1: Signups */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between relative group hover:border-[#31A895] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">1. Signups</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">100%</span>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{funnel?.totalUsers.toLocaleString()}</p>
              <p className="text-[11px] text-slate-400 mt-1">Total registered users</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500 flex justify-between">
              <span>All-time base:</span>
              <span className="font-semibold">{funnel?.totalUsersAllTime?.toLocaleString() ?? funnel?.totalUsers}</span>
            </div>
          </div>

          {/* Stage 2: Activated Users */}
          <div className="p-4 rounded-xl bg-[#F0FAF8] border border-[#d5eeea] flex flex-col justify-between relative group hover:border-[#31A895] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#288b7b] uppercase tracking-wider">2. Activated</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#E8F5F3] text-[#31A895]">
                {funnel?.activationRate}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{funnel?.activatedUsers.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-1">Generated &ge;1 AI design</p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#d5eeea] text-[11px] text-slate-500 flex justify-between">
              <span className="text-amber-700 font-medium">Onboarding drop:</span>
              <span className="font-semibold text-amber-700">-{funnel?.stageDropoffs.signupToActivationDrop}</span>
            </div>
          </div>

          {/* Stage 3: Checkout Initiators */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col justify-between relative group hover:border-[#0E5FBF] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#0E5FBF] uppercase tracking-wider">3. Cart Intent</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-[#0E5FBF]">
                {funnel?.intentRate}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900">{funnel?.checkoutInitiators.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500 mt-1">Opened checkout or modal</p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-100 text-[11px] text-slate-500 flex justify-between">
              <span className="text-slate-600">Paywall drop:</span>
              <span className="font-semibold text-slate-700">-{funnel?.stageDropoffs.activationToCheckoutDrop}</span>
            </div>
          </div>

          {/* Stage 4: Paying Customers */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between relative group hover:border-[#12924D] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-[#12924D] uppercase tracking-wider">4. Paid Buyers</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-[#12924D]">
                {funnel?.checkoutSuccessRate}%
              </span>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-950">{funnel?.payingUsers.toLocaleString()}</p>
              <p className="text-[11px] text-emerald-800 mt-1">Successful purchases</p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200 text-[11px] text-slate-500 flex justify-between">
              <span className="text-red-600 font-medium">Checkout friction:</span>
              <span className="font-semibold text-red-600">-{funnel?.stageDropoffs.checkoutToPaidDrop}</span>
            </div>
          </div>
        </div>

        {/* Funnel Progress Bars & Visual Width */}
        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Audience Activation Rate</span>
              <span className="font-bold text-slate-900">{funnel?.activationRate}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#31A895] to-[#45cfba] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, funnel?.activationRate ?? 0))}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Active-to-Checkout Intent Rate</span>
              <span className="font-bold text-slate-900">{funnel?.intentRate}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-[#0E5FBF] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, funnel?.intentRate ?? 0))}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-600">
              <span className="font-medium">Checkout Completion Rate</span>
              <span className="font-bold text-slate-900">{funnel?.checkoutSuccessRate}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-[#12924D] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, funnel?.checkoutSuccessRate ?? 0))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Strategic Recommendations Card */}
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Founder Strategy &amp; Growth Insights:</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 list-disc">
            <div>
              {(funnel?.activationRate ?? 0) < 50 ? (
                <p>
                  <strong>Onboarding Optimization:</strong> Only {funnel?.activationRate}% of signups generate a design.
                  Consider adding sample pre-loaded designs or a 1-click wizard upon first login.
                </p>
              ) : (
                <p>
                  <strong>Strong Onboarding:</strong> {funnel?.activationRate}% activation rate indicates excellent first-run UX.
                </p>
              )}
            </div>
            <div>
              {(funnel?.stageDropoffs.checkoutToPaidDrop ?? 0) > 0 ? (
                <p>
                  <strong>Cart Recovery:</strong> {funnel?.stageDropoffs.checkoutToPaidDrop} users initiated checkout but dropped off.
                  Review the payment failure reasons below to recover lost revenue.
                </p>
              ) : (
                <p>
                  <strong>Frictionless Checkout:</strong> Checkout completion rate is near 100% for initiators.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Unit Economics & Interactive CAC / LTV Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Unit Economics Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Unit Economics &amp; Customer Retention</h3>
              <p className="text-xs text-slate-500 mt-0.5">Real revenue, repeat buying frequency, and package popularity</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-700">
              {formatEGP(unitEcon?.totalRevenueEGP ?? 0)} Rev
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Single Buyers</span>
              <p className="text-xl font-bold text-slate-900 mt-1">{unitEcon?.singleBuyerCount ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Purchased exactly 1 time</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Repeat Buyers</span>
              <p className="text-xl font-bold text-[#12924D] mt-1">{unitEcon?.repeatBuyerCount ?? 0}</p>
              <p className="text-[10px] text-[#12924D] font-medium mt-0.5">
                {unitEcon?.repeatPurchaseRate ?? 0}% repeat rate
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">ARPU (Per User)</span>
              <p className="text-xl font-bold text-[#0E5FBF] mt-1">{formatEGP(unitEcon?.arpuEGP ?? 0)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Across all registered users</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Ledger Ad Spend</span>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {formatEGP(runway?.marketingSpendLedgerEGP ?? 0)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {runway?.calculatedCacEGP ? `CAC: ${formatEGP(runway.calculatedCacEGP)}` : 'No ads logged in ledger'}
              </p>
            </div>
          </div>

          {/* Package Breakdown */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Purchased Packages</h4>
            {(unitEcon?.packageBreakdown ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No package purchases in this timeframe.</p>
            ) : (
              <div className="space-y-2">
                {unitEcon?.packageBreakdown.map((pkg, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#31A895]" />
                      <span className="font-bold text-slate-800 uppercase">{pkg.packageId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{pkg.count} orders</span>
                      <span className="font-bold text-slate-900">{formatEGP(pkg.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactive CAC & Ad Spend Simulator */}
        <div className="bg-gradient-to-br from-white to-[#F0FAF8] rounded-2xl border border-[#d5eeea] p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Interactive CAC &amp; LTV Simulator</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#31A895] text-white">PROJECTION</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Model ad spend vs customer yield to evaluate the LTV : CAC Golden Ratio (&gt;3x target).
              </p>
            </div>
          </div>

          {/* Sliders & Inputs */}
          <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200/80">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Estimated Monthly Ad Spend (Meta / TikTok / Google)</span>
                <span className="text-[#31A895] font-bold">{formatEGP(simAdSpend)}</span>
              </div>
              <input
                type="range"
                min="500"
                max="50000"
                step="500"
                value={simAdSpend}
                onChange={(e) => setSimAdSpend(Number(e.target.value))}
                className="w-full accent-[#31A895] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>500 EGP</span>
                <span>25,000 EGP</span>
                <span>50,000 EGP</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span>Target New Paying Customers</span>
                <span className="text-[#0E5FBF] font-bold">{simCustomers} Customers</span>
              </div>
              <input
                type="range"
                min="1"
                max="250"
                step="1"
                value={simCustomers}
                onChange={(e) => setSimCustomers(Number(e.target.value))}
                className="w-full accent-[#0E5FBF] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>1 buyer</span>
                <span>100 buyers</span>
                <span>250 buyers</span>
              </div>
            </div>
          </div>

          {/* Golden Ratio Gauges & Metrics */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Simulated CAC</span>
              <p className="text-lg font-extrabold text-slate-800 mt-1">{formatEGP(simCac)}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Cost per customer</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">LTV : CAC Ratio</span>
              <p
                className={`text-lg font-extrabold mt-1 ${
                  simLtvCacRatio && simLtvCacRatio >= 3.0
                    ? 'text-[#12924D]'
                    : simLtvCacRatio && simLtvCacRatio >= 1.5
                    ? 'text-[#F59E0B]'
                    : 'text-[#FF5A6E]'
                }`}
              >
                {simLtvCacRatio ? `${simLtvCacRatio}x` : 'N/A'}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">Golden Rule: &gt;3.0x</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Payback Time</span>
              <p className="text-lg font-extrabold text-slate-800 mt-1">
                {simPaybackMonths ? `${simPaybackMonths} mo` : 'Instant'}
              </p>
              <p className="text-[9px] text-slate-400 mt-0.5">To break-even on ad</p>
            </div>
          </div>

          {/* Golden Ratio Health Assessment */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-3 ${
              simLtvCacRatio && simLtvCacRatio >= 3.0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : simLtvCacRatio && simLtvCacRatio >= 1.5
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="text-xl">
              {simLtvCacRatio && simLtvCacRatio >= 3.0 ? '🎯' : simLtvCacRatio && simLtvCacRatio >= 1.5 ? '⚠️' : '🚨'}
            </div>
            <div>
              <p className="font-bold">
                {simLtvCacRatio && simLtvCacRatio >= 3.0
                  ? 'Highly Profitable Unit Economics'
                  : simLtvCacRatio && simLtvCacRatio >= 1.5
                  ? 'Moderate Margin — Monitor Retention'
                  : 'Acquisition Deficit Alert'}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {simLtvCacRatio && simLtvCacRatio >= 3.0
                  ? 'Your LTV exceeds acquisition cost by more than 3x. Capital can be safely deployed to scale Meta & Google ads.'
                  : simLtvCacRatio && simLtvCacRatio >= 1.5
                  ? 'Sustainable for initial traction, but improve repeat purchases or AOV to reach the 3x venture capital standard.'
                  : 'Customer acquisition cost exceeds customer lifetime value. Lower ad bids or introduce higher-tier credit bundles.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Acquisition Channels & Behavior Timelines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google vs Email Conversion Split */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Auth Method &amp; Channel Conversion</h3>
              <p className="text-xs text-slate-500 mt-0.5">Google One-Tap vs Traditional Email/Password conversion</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-700">
              {(acq?.authSplit ?? []).reduce((acc, a) => acc + a.users, 0)} Users
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {(acq?.authSplit ?? []).map((method, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {method.provider.includes('Google') ? (
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <svg width="14" height="14" viewBox="0 0 24 24">
                          <path
                            fill="#EA4335"
                            d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5.1 3.7-8.8z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.2c0 2.8.7 5.5 1.9 7.9l3.7-2.9z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold text-slate-800">{method.provider}</span>
                      <p className="text-[10px] text-slate-400">
                        {method.users} users signed up &bull; {method.payingCount} converted
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-[#31A895]">{method.conversionRate}%</span>
                    <p className="text-[10px] text-slate-400">Conversion</p>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#31A895] rounded-full"
                    style={{ width: `${Math.min(100, Math.max(3, method.conversionRate))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time-to-First-Purchase Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Time-to-Convert Window</h3>
              <p className="text-xs text-slate-500 mt-0.5">Speed from user signup until first credit purchase</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-[#12924D] font-semibold">
              Retargeting Timing
            </span>
          </div>

          <div className="space-y-3 pt-2">
            {(acq?.timeToFirstPurchaseDistribution ?? []).map((bucket, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">{bucket.label}</span>
                  <span className="text-slate-900 font-bold">
                    {bucket.count} buyers ({bucket.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-[#0E5FBF] rounded-full"
                    style={{ width: `${Math.min(100, Math.max(3, bucket.percentage))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 mt-4">
            💡 <strong>Ad Strategy Tip:</strong> Run Meta Pixel retargeting ads within 24-48 hours after user signup.
            Users who don&apos;t purchase within 7 days require email nurture discount codes.
          </div>
        </div>
      </div>

      {/* 6. Ad Creative & Product Drivers */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Ad Creative Drivers &amp; Popular Styles</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                MARKETING ASSETS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              The highest-volume styles and room types generated by users. Use these visual themes for social media ads.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>Avg designs before purchase:</span>
            <span className="font-bold text-[#31A895]">{drivers?.avgGenerationsBeforePurchase ?? 0} designs</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Top Styles */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎨 Top Design Styles</span>
            </h4>
            {(drivers?.topStyles ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No design style data in period.</p>
            ) : (
              <div className="space-y-2">
                {drivers?.topStyles.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                    <span className="font-semibold text-slate-800 capitalize">{item.style.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.count.toLocaleString()} gens
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top Rooms */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span>🛋️ Top Room Types</span>
            </h4>
            {(drivers?.topRooms ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No room type data in period.</p>
            ) : (
              <div className="space-y-2">
                {drivers?.topRooms.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                    <span className="font-semibold text-slate-800 capitalize">{item.room.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.count.toLocaleString()} gens
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 7. Checkout Friction & Gateway Loss Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Checkout Friction &amp; Gateway Health</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  (friction?.abandonmentRate ?? 0) > 40
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {friction?.abandonmentRate ?? 0}% ABANDONMENT RATE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Identifies failed attempts, timeouts, and card decline reasons to prevent revenue loss.
            </p>
          </div>
          {onNavigateToPurchases && (
            <button
              onClick={onNavigateToPurchases}
              className="text-xs font-bold text-[#31A895] hover:underline flex items-center gap-1"
            >
              <span>View Full Purchases Log</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] font-bold text-[#12924D] uppercase">Completed Orders</span>
            <p className="text-2xl font-extrabold text-emerald-950 mt-1">{friction?.completedCount ?? 0}</p>
            <p className="text-[10px] text-emerald-800 mt-0.5">Successfully captured</p>
          </div>

          <div className="p-3.5 rounded-xl bg-red-50/60 border border-red-200">
            <span className="text-[11px] font-bold text-[#FF5A6E] uppercase">Failed Payments</span>
            <p className="text-2xl font-extrabold text-red-950 mt-1">{friction?.failedCount ?? 0}</p>
            <p className="text-[10px] text-red-800 mt-0.5">Gateway or card decline</p>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
            <span className="text-[11px] font-bold text-amber-700 uppercase">Pending / Abandoned</span>
            <p className="text-2xl font-extrabold text-amber-950 mt-1">{friction?.pendingCount ?? 0}</p>
            <p className="text-[10px] text-amber-800 mt-0.5">User closed payment form</p>
          </div>
        </div>

        {/* Failure Reasons & Provider Reliability */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Top Failure Reasons */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Failure Reasons</h4>
            {(friction?.failureReasons ?? []).length === 0 ? (
              <p className="text-xs text-emerald-600 font-medium p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                ✅ No failed payment transactions recorded in this timeframe.
              </p>
            ) : (
              <div className="space-y-2">
                {friction?.failureReasons.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/40 border border-red-100 text-xs">
                    <span className="font-medium text-slate-800 truncate mr-2" title={item.reason}>
                      {item.reason}
                    </span>
                    <span className="font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-red-200 flex-shrink-0">
                      {item.count} failures
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider Performance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Provider Reliability</h4>
            {(friction?.providers ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No payment provider attempts recorded.</p>
            ) : (
              <div className="space-y-2">
                {friction?.providers.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 uppercase">{p.provider}</span>
                      <span className="text-[10px] text-slate-400">({p.totalAttempts} total)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{p.completedCount} paid</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          p.successRate >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.successRate >= 40
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {p.successRate}% Success
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
