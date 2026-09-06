'use client';

import React, { useState, useEffect, useCallback } from 'react';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import Card from '@/components/common/Card';
import {
  getLedgerOverview,
  getLedgerEntries,
  recordFounderExpense,
  recordDebtRepayment,
  recordReversal,
  getGovernanceOverview,
  toggleMilitaryHiatus,
} from '@/lib/api';
import {
  FinancialOverviewData,
  FinancialLedgerEntry,
  GovernanceOverviewData,
  LedgerEntryType,
  LedgerCategory,
  LedgerCurrency,
} from '@/types';

export default function FinancialsPage() {
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'governance'>('overview');
  const [overview, setOverview] = useState<FinancialOverviewData | null>(null);
  const [entries, setEntries] = useState<FinancialLedgerEntry[]>([]);
  const [governance, setGovernance] = useState<GovernanceOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ledger Filter & Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterCurrency, setFilterCurrency] = useState<string>('ALL');

  // Modals state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [showHiatusModal, setShowHiatusModal] = useState(false);
  const [inspectEntry, setInspectEntry] = useState<FinancialLedgerEntry | null>(null);
  const [reversalTarget, setReversalTarget] = useState<FinancialLedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Expense form
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    currency: 'USD' as LedgerCurrency,
    exchangeRateToEGP: '50.0',
    category: 'AI_APIS' as LedgerCategory,
    description: '',
    sourceName: 'Founder Mohamed Yusri (CIB Card)',
    sourceAccountType: 'Personal Credit Card',
    sourceReference: '',
    recipientName: '',
    recipientAccountType: 'Vendor Account',
    recipientReference: '',
    receiptUrl: '',
    transactionReference: '',
  });

  // Repayment form
  const [repayForm, setRepayForm] = useState({
    amount: '',
    currency: 'EGP' as LedgerCurrency,
    exchangeRateToEGP: '1.0',
    description: 'Partial founder debt repayment disbursement',
    sourceName: 'Sammly Corporate Treasury',
    sourceAccountType: 'Business Bank Account',
    recipientName: 'Founder Personal Account (CIB)',
    recipientAccountType: 'Personal Account',
    receiptUrl: '',
    transactionReference: '',
  });

  // Hiatus form
  const [hiatusReason, setHiatusReason] = useState('');

  // Fetch all initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, entriesData, governanceData] = await Promise.all([
        getLedgerOverview(),
        getLedgerEntries({
          page,
          limit: 15,
          entryType: filterType !== 'ALL' ? (filterType as LedgerEntryType) : undefined,
          category: filterCategory !== 'ALL' ? filterCategory : undefined,
          currency: filterCurrency !== 'ALL' ? (filterCurrency as LedgerCurrency) : undefined,
        }),
        getGovernanceOverview(),
      ]);

      setOverview(overviewData);
      setEntries(entriesData.entries);
      setTotalPages(entriesData.pagination.totalPages || 1);
      setTotalEntries(entriesData.pagination.total || 0);
      setGovernance(governanceData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load financial records';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterCategory, filterCurrency]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle expense injection submit
  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const rate = Number(expenseForm.exchangeRateToEGP) || 1.0;
      await recordFounderExpense({
        amount: Number(expenseForm.amount),
        currency: expenseForm.currency,
        exchangeRateToEGP: rate,
        category: expenseForm.category,
        description: expenseForm.description,
        sourceParty: {
          name: expenseForm.sourceName,
          accountType: expenseForm.sourceAccountType,
          reference: expenseForm.sourceReference || null,
        },
        recipientParty: {
          name: expenseForm.recipientName,
          accountType: expenseForm.recipientAccountType,
          reference: expenseForm.recipientReference || null,
        },
        receiptUrl: expenseForm.receiptUrl || null,
        transactionReference: expenseForm.transactionReference || null,
      });

      setShowExpenseModal(false);
      setActionSuccess('Founder expense recorded successfully into the immutable ledger!');
      setTimeout(() => setActionSuccess(null), 5000);
      // Reset form
      setExpenseForm({
        amount: '',
        currency: 'USD',
        exchangeRateToEGP: '50.0',
        category: 'AI_APIS',
        description: '',
        sourceName: 'Founder Mohamed Yusri (CIB Card)',
        sourceAccountType: 'Personal Credit Card',
        sourceReference: '',
        recipientName: '',
        recipientAccountType: 'Vendor Account',
        recipientReference: '',
        receiptUrl: '',
        transactionReference: '',
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record expense';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle repayment submit
  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await recordDebtRepayment({
        amount: Number(repayForm.amount),
        currency: repayForm.currency,
        exchangeRateToEGP: Number(repayForm.exchangeRateToEGP) || 1.0,
        description: repayForm.description,
        sourceParty: {
          name: repayForm.sourceName,
          accountType: repayForm.sourceAccountType,
        },
        recipientParty: {
          name: repayForm.recipientName,
          accountType: repayForm.recipientAccountType,
        },
        receiptUrl: repayForm.receiptUrl || null,
        transactionReference: repayForm.transactionReference || null,
      });

      setShowRepayModal(false);
      setActionSuccess('Debt repayment recorded successfully in the immutable chain!');
      setTimeout(() => setActionSuccess(null), 5000);
      setRepayForm((prev) => ({ ...prev, amount: '' }));
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record repayment';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle compensating reversal submit
  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await recordReversal({
        targetEntryId: reversalTarget._id,
        reversalReason: reversalReason.trim(),
      });

      setShowReversalModal(false);
      setReversalTarget(null);
      setReversalReason('');
      setActionSuccess('Compensating reversal successfully appended to the ledger chain!');
      setTimeout(() => setActionSuccess(null), 5000);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record reversal';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle military hiatus toggle
  const handleHiatusToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!governance) return;

    const newHiatusState = !governance.governance.isMilitaryHiatusActive;
    setSubmitting(true);
    setError(null);
    try {
      await toggleMilitaryHiatus({
        isHiatus: newHiatusState,
        reason: hiatusReason.trim() || 'Military service status change',
      });

      setShowHiatusModal(false);
      setHiatusReason('');
      setActionSuccess(
        newHiatusState
          ? 'Military Service Hiatus ACTIVATED: Vesting clock paused.'
          : 'Military Service Hiatus RESUMED: Vesting clock resumed.'
      );
      setTimeout(() => setActionSuccess(null), 5000);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update military hiatus';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick preset repayment helper
  const setQuickRepayment = (fraction: number) => {
    if (!overview) return;
    const debt = overview.debtWaterfall.netOutstandingDebtEGP;
    const calculated = Math.round(debt * fraction * 100) / 100;
    setRepayForm((prev) => ({ ...prev, amount: String(calculated) }));
  };

  // Formatting helpers
  const formatEGP = (num: number) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP' }).format(num || 0);

  const formatOriginalAmount = (amount: number, currency: string) => {
    if (currency === 'USD') return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (currency === 'EUR') return `€${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    return `EGP ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getEntryBadge = (type: LedgerEntryType) => {
    switch (type) {
      case 'DEBT_INJECTION':
        return <Badge variant="info">DEBT INJECTION</Badge>;
      case 'DEBT_REPAYMENT':
        return <Badge variant="success">DEBT REPAID</Badge>;
      case 'PLATFORM_REVENUE':
        return <Badge variant="success">REVENUE</Badge>;
      case 'REVERSAL_ADJUSTMENT':
        return <Badge variant="warning">REVERSAL</Badge>;
      case 'REFUND_ISSUED':
        return <Badge variant="danger">REFUND</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'AI_APIS':
        return 'AI & LLM APIs';
      case 'HOSTING_INFRASTRUCTURE':
        return 'Hosting & Cloud';
      case 'APP_STORE_FEES':
        return 'App Store Accounts';
      case 'LEGAL_OPERATIONS':
        return 'Legal & Registration';
      case 'MARKETING_ACQUISITION':
        return 'Marketing & Ads';
      case 'FOUNDER_DEBT_REPAYMENT':
        return 'Founder Repayment';
      case 'PLATFORM_CLIENT_REVENUE':
        return 'Client Revenue';
      case 'COMPENSATING_REVERSAL':
        return 'Audit Reversal';
      default:
        return cat.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Founder Debt, Financial Ledger & Governance</h1>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#E8F5F3] text-[#1F6857] border border-[#A3D7CF]">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-sm">
            Cryptographic SHA-256 block hash chaining, 100% debt-first waterfall & military service equity clause
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#31A895] text-white text-sm font-medium hover:bg-[#289076] transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Inject Expense
          </button>
          <button
            onClick={() => setShowRepayModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Disburse Repayment
          </button>
          <button
            onClick={loadData}
            title="Refresh financial data"
            className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-[#E7FCF3] border border-[#A3F3CF] text-[#12924D] text-sm flex items-center gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-[#FF5A6E] text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Cryptographic Chain Integrity Banner */}
      {overview && (
        <div
          className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            overview.security.chainIntegrityValid
              ? 'bg-gradient-to-r from-[#f0faf8] to-[#e6f7f3] border-[#A3D7CF]'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                overview.security.chainIntegrityValid
                  ? 'bg-[#31A895] text-white shadow-sm'
                  : 'bg-[#FF5A6E] text-white animate-pulse'
              }`}
            >
              {overview.security.chainIntegrityValid ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">
                  {overview.security.chainIntegrityValid ? 'CRYPTOGRAPHIC CHAIN VERIFIED' : 'TAMPER DETECTED: CHAIN BROKEN'}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-mono font-medium ${
                    overview.security.chainIntegrityValid
                      ? 'bg-[#1ECB7F]/20 text-[#12924D]'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  SHA-256 HASH CHAIN
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {overview.security.chainIntegrityValid
                  ? `All ${overview.security.totalVerifiedBlocks} blocks verified. Every transaction links to the SHA-256 digest of its predecessor block.`
                  : overview.security.auditWarning || 'Warning: Cryptographic hash mismatch. Database records have been altered.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <span className="text-xs text-slate-500">Integrity Check:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                overview.security.chainIntegrityValid
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {overview.security.cryptographicChain}
            </span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-5 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-[#31A895] text-[#31A895]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20V10M18 20V4M6 20v-4" />
          </svg>
          Overview & Waterfall
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-5 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'ledger'
              ? 'border-[#31A895] text-[#31A895]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Immutable Ledger ({totalEntries})
        </button>
        <button
          onClick={() => setActiveTab('governance')}
          className={`pb-3 px-5 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'governance'
              ? 'border-[#31A895] text-[#31A895]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Founder Equity & Military Hiatus
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && !overview && (
        <div className="text-center py-16 text-slate-400 text-sm animate-pulse">
          Loading financial ledger, cryptographic chain, and governance metrics...
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & DEBT WATERFALL */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-8">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="OUTSTANDING FOUNDER DEBT"
              value={formatEGP(overview.debtWaterfall.netOutstandingDebtEGP)}
              valueColor="text-[#FF5A6E]"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5A6E" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
              }
            />

            <StatCard
              title="TOTAL CAPITAL INJECTED"
              value={formatEGP(overview.debtWaterfall.totalInjectedDebtEGP)}
              valueColor="text-slate-900"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#31A895" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              }
            />

            <StatCard
              title="TOTAL DEBT REPAID"
              value={formatEGP(overview.debtWaterfall.totalRepaidDebtEGP)}
              valueColor="text-[#12924D]"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#12924D" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              }
            />

            <StatCard
              title="GROSS PAYMOB REVENUE"
              value={formatEGP(overview.platformRevenue.grossPlatformRevenueEGP)}
              valueColor="text-[#0E5FBF]"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0E5FBF" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                  <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
              }
            />
          </div>

          {/* Waterfall Progress & Dividend Lock Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payoff Progress Card */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">100% Debt-First Waterfall Progress</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Early platform revenue amortizes Founder Debt before equity distributions
                  </p>
                </div>
                <span className="text-2xl font-bold text-[#31A895]">
                  {overview.debtWaterfall.payoffProgressPercent}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-[#1ECB7F] to-[#31A895] transition-all duration-500"
                    style={{ width: `${overview.debtWaterfall.payoffProgressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Repaid: {formatEGP(overview.debtWaterfall.totalRepaidDebtEGP)}</span>
                  <span>Target: {formatEGP(overview.debtWaterfall.totalInjectedDebtEGP)}</span>
                </div>
              </div>

              {/* Legal Waterfall Policy Rule Notice */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-3">
                <span className="text-base">⚖️</span>
                <div>
                  <span className="font-semibold text-slate-800">Founder Waterfall Protection Clause: </span>
                  {overview.debtWaterfall.dividendPolicyMessage}
                </div>
              </div>
            </div>

            {/* Dividend Lock Status Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Dividend Status</h3>
                  <span className="text-xs text-slate-400">Article 3.1</span>
                </div>

                <div className="mt-4 p-4 rounded-xl text-center space-y-2 border ${
                  overview.debtWaterfall.dividendStatus === 'UNLOCKED'
                    ? 'bg-[#E7FCF3] border-[#A3F3CF] text-[#12924D]'
                    : 'bg-[#FFE8EC] border-[#FFA3B3] text-[#CC2236]'
                }">
                  <div className="text-3xl">
                    {overview.debtWaterfall.dividendStatus === 'UNLOCKED' ? '🔓' : '🔒'}
                  </div>
                  <div className="font-bold text-base">
                    {overview.debtWaterfall.dividendStatus === 'UNLOCKED'
                      ? 'DIVIDENDS UNLOCKED'
                      : 'DIVIDENDS LOCKED'}
                  </div>
                  <p className="text-xs">
                    {overview.debtWaterfall.dividendStatus === 'UNLOCKED'
                      ? 'Founder debt has reached 0 EGP. Equity profit distributions are permitted.'
                      : 'Founder debt > 0. All profit distribution is legally locked until fully repaid.'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 flex justify-between">
                <span>Completed Transactions:</span>
                <span className="font-bold text-slate-700">
                  {overview.platformRevenue.completedTransactionsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Category Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Expense Category Breakdown</h3>
                <p className="text-xs text-slate-500">Distribution of all recorded founder debt injections</p>
              </div>
              <span className="text-xs text-slate-400">
                {overview.categoryBreakdown.length} Active Categories
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {overview.categoryBreakdown.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-100 bg-[#f9fafb] hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {getCategoryLabel(cat.category)}
                    </span>
                    <p className="text-lg font-bold text-slate-900 mt-1">
                      {formatEGP(cat.totalSpentEGP)}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 font-medium">
                    {cat.transactionCount} txns
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: IMMUTABLE LEDGER ENTRIES */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#f0faf8] rounded-xl border border-[#d5eeea]">
            <div className="flex flex-wrap items-center gap-3">
              {/* Type Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mr-2">TYPE:</label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:border-[#31A895]"
                >
                  <option value="ALL">All Entry Types</option>
                  <option value="DEBT_INJECTION">Debt Injection (Expense)</option>
                  <option value="DEBT_REPAYMENT">Debt Repayment</option>
                  <option value="PLATFORM_REVENUE">Platform Revenue</option>
                  <option value="REVERSAL_ADJUSTMENT">Compensating Reversal</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mr-2">CATEGORY:</label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:border-[#31A895]"
                >
                  <option value="ALL">All Categories</option>
                  <option value="AI_APIS">AI & LLM APIs</option>
                  <option value="HOSTING_INFRASTRUCTURE">Hosting & Cloud</option>
                  <option value="APP_STORE_FEES">App Store Accounts</option>
                  <option value="LEGAL_OPERATIONS">Legal & Registration</option>
                  <option value="MARKETING_ACQUISITION">Marketing & Ads</option>
                  <option value="FOUNDER_DEBT_REPAYMENT">Founder Debt Repayment</option>
                  <option value="COMPENSATING_REVERSAL">Compensating Reversal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* Currency Filter */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mr-2">CURRENCY:</label>
                <select
                  value={filterCurrency}
                  onChange={(e) => {
                    setFilterCurrency(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:border-[#31A895]"
                >
                  <option value="ALL">All Currencies</option>
                  <option value="EGP">EGP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Showing page <span className="font-bold text-slate-800">{page}</span> of{' '}
              <span className="font-bold text-slate-800">{totalPages}</span> ({totalEntries} total entries)
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-6 py-3.5">DATE</th>
                    <th className="px-6 py-3.5">TYPE</th>
                    <th className="px-6 py-3.5">CATEGORY & DESCRIPTION</th>
                    <th className="px-6 py-3.5">AMOUNT</th>
                    <th className="px-6 py-3.5">SOURCE ➔ RECIPIENT</th>
                    <th className="px-6 py-3.5">SHA-256 HASH</th>
                    <th className="px-6 py-3.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                        No financial records found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    entries.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                        {/* Date */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                          {new Date(item.executedAt || item.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* Type Badge */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getEntryBadge(item.entryType)}
                        </td>

                        {/* Category & Description */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="text-xs font-bold text-slate-900">
                            {getCategoryLabel(item.category)}
                          </div>
                          <div className="text-xs text-slate-500 truncate" title={item.description}>
                            {item.description}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-slate-900">
                            {formatEGP(item.amountInEGP)}
                          </div>
                          {item.currency !== 'EGP' && (
                            <div className="text-xs text-slate-400">
                              {formatOriginalAmount(item.amount, item.currency)} (@ {item.exchangeRateToEGP})
                            </div>
                          )}
                        </td>

                        {/* Source ➔ Recipient */}
                        <td className="px-6 py-4 text-xs text-slate-600 whitespace-nowrap">
                          <span className="font-medium text-slate-800">{item.sourceParty?.name}</span>
                          <span className="text-slate-400 mx-1.5">➔</span>
                          <span className="font-medium text-slate-800">{item.recipientParty?.name}</span>
                        </td>

                        {/* Cryptographic Hash */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => setInspectEntry(item)}
                            className="flex items-center gap-1.5 font-mono text-xs text-[#31A895] hover:underline"
                            title="Click to inspect cryptographic block hash"
                          >
                            <span>#{item.currentEntryHash?.substring(0, 10)}...</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setInspectEntry(item)}
                              className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              Audit
                            </button>
                            {item.entryType !== 'REVERSAL_ADJUSTMENT' && !item.reversalOfEntryId && (
                              <button
                                onClick={() => {
                                  setReversalTarget(item);
                                  setShowReversalModal(true);
                                }}
                                className="px-2.5 py-1 rounded border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                title="Append a formal compensating reversal"
                              >
                                Reversal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 text-xs">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FOUNDER EQUITY GOVERNANCE & MILITARY HIATUS */}
      {/* ========================================================================= */}
      {activeTab === 'governance' && governance && (
        <div className="space-y-8">
          {/* Equity Vesting Overview Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {governance.governance.founderName} - Founder Equity Schedule
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard 4-year vesting schedule (48 months) with a 1-year cliff milestone (12 months)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    governance.governance.isCliffPassed
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {governance.governance.isCliffPassed ? 'CLIFF PASSED' : 'IN CLIFF PERIOD'}
                </span>

                <span
                  className={`px-3 py-1 text-xs font-bold rounded-full ${
                    governance.governance.isMilitaryHiatusActive
                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                      : 'bg-teal-100 text-teal-800 border border-teal-300'
                  }`}
                >
                  {governance.governance.isMilitaryHiatusActive ? 'HIATUS ACTIVE (CLOCK PAUSED)' : 'CLOCK RUNNING'}
                </span>
              </div>
            </div>

            {/* Vesting Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-sm">
                <span className="font-semibold text-slate-800">
                  Vested: <span className="text-[#31A895] font-bold">{governance.governance.vestedPercentage}%</span>
                </span>
                <span className="text-xs text-slate-500">
                  Unvested: {governance.governance.unvestedPercentage}% of total {governance.governance.totalEquityPercentage}%
                </span>
              </div>

              <div className="w-full h-5 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-[#0E5FBF] to-[#31A895] transition-all duration-500"
                  style={{ width: `${governance.governance.vestedPercentage}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>Start: {new Date(governance.governance.startDate).toLocaleDateString()}</span>
                <span>Cliff: {governance.governance.cliffMonths} Months</span>
                <span>
                  Adjusted End:{' '}
                  {new Date(governance.governance.projectedCompletionDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Vesting Metric Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-5">
              <div>
                <p className="text-xs text-slate-500">Effective Months Served</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {governance.governance.effectiveMonthsServed} / {governance.governance.totalVestingMonths}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Equity Pool</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">
                  {governance.governance.totalEquityPercentage}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Accumulated Hiatus Days</p>
                <p className="text-xl font-bold text-amber-600 mt-0.5">
                  {governance.governance.accumulatedHiatusDays} days
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Projected Full Vesting</p>
                <p className="text-sm font-bold text-slate-800 mt-1">
                  {new Date(governance.governance.projectedCompletionDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Military Service Hiatus Clause Interactive Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎖️</span>
                  <h3 className="text-base font-bold text-slate-900">Military Service Hiatus Clause</h3>
                </div>
                <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Under Egyptian statutory corporate governance standards, mandatory military service freezes the
                  founder equity vesting timer without share forfeiture or equity dilution. When paused, unvested
                  shares remain protected, and the projected completion date shifts dynamically.
                </p>
              </div>

              <button
                onClick={() => setShowHiatusModal(true)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                  governance.governance.isMilitaryHiatusActive
                    ? 'bg-[#1ECB7F] text-white hover:bg-[#18B366]'
                    : 'bg-[#FF5A6E] text-white hover:bg-[#e64e5f]'
                }`}
              >
                {governance.governance.isMilitaryHiatusActive ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Resume Vesting Clock
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                    Activate Military Hiatus
                  </>
                )}
              </button>
            </div>

            {/* Audit History Timeline */}
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Governance Audit History ({governance.auditTrail?.length || 0})
              </h4>

              {(!governance.auditTrail || governance.auditTrail.length === 0) ? (
                <p className="text-xs text-slate-400 italic">No military hiatus events recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {governance.auditTrail.map((log, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            log.action === 'MILITARY_HIATUS_ACTIVATED' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        <div>
                          <span className="font-bold text-slate-800">{log.action}</span>
                          <span className="text-slate-500 ml-2">Reason: {log.reason || 'Status update'}</span>
                        </div>
                      </div>
                      <div className="text-right text-slate-400">
                        <span>{log.performedByEmail || 'Admin'}</span> •{' '}
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: INJECT FOUNDER EXPENSE */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Inject Founder Expense (Debt Addition)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append-only immutable entry. Generates a new SHA-256 block linked to the chain.
                </p>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    AMOUNT <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 500.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CURRENCY</label>
                  <select
                    value={expenseForm.currency}
                    onChange={(e) => {
                      const curr = e.target.value as LedgerCurrency;
                      setExpenseForm({
                        ...expenseForm,
                        currency: curr,
                        exchangeRateToEGP: curr === 'EGP' ? '1.0' : curr === 'USD' ? '50.0' : '54.0',
                      });
                    }}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-[#31A895]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EGP">EGP (EGP)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              {expenseForm.currency !== 'EGP' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    EXCHANGE RATE TO EGP (1 {expenseForm.currency} = ? EGP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={expenseForm.exchangeRateToEGP}
                    onChange={(e) => setExpenseForm({ ...expenseForm, exchangeRateToEGP: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                  {expenseForm.amount && (
                    <p className="text-xs text-[#31A895] font-semibold mt-1">
                      ≈ {formatEGP(Number(expenseForm.amount) * (Number(expenseForm.exchangeRateToEGP) || 1))} added to debt
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  EXPENSE CATEGORY <span className="text-red-500">*</span>
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as LedgerCategory })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 bg-white focus:outline-none focus:border-[#31A895]"
                >
                  <option value="AI_APIS">AI & LLM APIs (Vercel AI, Gemini, RunPod, DINOv2)</option>
                  <option value="HOSTING_INFRASTRUCTURE">Hosting & Infrastructure (Render, Atlas, Cloudflare, Domain)</option>
                  <option value="APP_STORE_FEES">App Store Accounts (Apple Developer $99, Google Play $25)</option>
                  <option value="LEGAL_OPERATIONS">Legal & Operations (Commercial registration, bank fees)</option>
                  <option value="MARKETING_ACQUISITION">Marketing & Acquisition (Meta Ads, Influencer collabs)</option>
                  <option value="OTHER">Other Essential Operational Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  DESCRIPTION <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Render server annual renewal & Atlas dedicated tier"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SOURCE OF FUNDS <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Founder Mohamed Yusri (CIB Card)"
                    value={expenseForm.sourceName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, sourceName: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RECIPIENT VENDOR <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vercel Inc., Apple Inc."
                    value={expenseForm.recipientName}
                    onChange={(e) => setExpenseForm({ ...expenseForm, recipientName: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RECEIPT URL</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={expenseForm.receiptUrl}
                    onChange={(e) => setExpenseForm({ ...expenseForm, receiptUrl: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">TX REFERENCE</label>
                  <input
                    type="text"
                    placeholder="Invoice # / Stripe ID"
                    value={expenseForm.transactionReference}
                    onChange={(e) => setExpenseForm({ ...expenseForm, transactionReference: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-[#31A895] text-white text-sm font-medium hover:bg-[#289076] disabled:opacity-50"
                >
                  {submitting ? 'Chaining Block...' : 'Confirm & Append to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DISBURSE DEBT REPAYMENT */}
      {/* ========================================================================= */}
      {showRepayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Disburse Founder Debt Repayment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Repayment disbursement from corporate treasury to amortize founder debt
                </p>
              </div>
              <button
                onClick={() => setShowRepayModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {overview && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-600">Current Outstanding Debt:</span>
                <span className="font-bold text-sm text-[#FF5A6E]">
                  {formatEGP(overview.debtWaterfall.netOutstandingDebtEGP)}
                </span>
              </div>
            )}

            <form onSubmit={handleRepaySubmit} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    REPAYMENT AMOUNT (EGP) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickRepayment(0.25)}
                      className="px-2 py-0.5 text-xs bg-slate-100 rounded text-slate-600 hover:bg-slate-200"
                    >
                      25%
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRepayment(0.5)}
                      className="px-2 py-0.5 text-xs bg-slate-100 rounded text-slate-600 hover:bg-slate-200"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickRepayment(1.0)}
                      className="px-2 py-0.5 text-xs bg-[#E8F5F3] text-[#1F6857] font-semibold rounded hover:bg-[#d1ebe7]"
                    >
                      Full 100%
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={overview?.debtWaterfall.netOutstandingDebtEGP}
                  required
                  placeholder="e.g. 5000.00"
                  value={repayForm.amount}
                  onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">DESCRIPTION</label>
                <input
                  type="text"
                  value={repayForm.description}
                  onChange={(e) => setRepayForm({ ...repayForm, description: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">TREASURY SOURCE</label>
                  <input
                    type="text"
                    value={repayForm.sourceName}
                    onChange={(e) => setRepayForm({ ...repayForm, sourceName: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">FOUNDER RECIPIENT</label>
                  <input
                    type="text"
                    value={repayForm.recipientName}
                    onChange={(e) => setRepayForm({ ...repayForm, recipientName: e.target.value })}
                    className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">BANK WIRE / RECEIPT URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={repayForm.receiptUrl}
                  onChange={(e) => setRepayForm({ ...repayForm, receiptUrl: e.target.value })}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRepayModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !repayForm.amount || Number(repayForm.amount) <= 0}
                  className="px-5 py-2 rounded-lg bg-[#1ECB7F] text-white text-sm font-medium hover:bg-[#18B366] disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Disburse & Amortize Debt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: COMPENSATING REVERSAL */}
      {/* ========================================================================= */}
      {showReversalModal && reversalTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Compensating Reversal</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accounting-standard correction without breaking ledger chain integrity
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReversalModal(false);
                  setReversalTarget(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {/* Target Entry Summary */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-amber-900">
                <span>Entry #{reversalTarget._id}</span>
                <span>{formatEGP(reversalTarget.amountInEGP)}</span>
              </div>
              <div className="text-amber-800">
                <span className="font-semibold">Category:</span> {getCategoryLabel(reversalTarget.category)}
              </div>
              <div className="text-amber-700 truncate">
                <span className="font-semibold">Description:</span> {reversalTarget.description}
              </div>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold">⚠️ Immutability Notice:</span> Because the ledger is strictly append-only,
              this record will NOT be deleted. Instead, a new compensating reversal block will be chained, inverting the
              flow of funds with a permanent audit trail.
            </div>

            <form onSubmit={handleReversalSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  REVERSAL JUSTIFICATION / REASON <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this entry is being reversed (e.g. duplicate entry, incorrect amount, vendor refunded)..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 p-3 focus:outline-none focus:border-[#31A895]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowReversalModal(false);
                    setReversalTarget(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reversalReason.trim()}
                  className="px-5 py-2 rounded-lg bg-[#FF5A6E] text-white text-sm font-medium hover:bg-[#e64e5f] disabled:opacity-50"
                >
                  {submitting ? 'Appending Reversal...' : 'Append Compensating Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: BLOCK INSPECTOR & AUDIT DETAILS */}
      {/* ========================================================================= */}
      {inspectEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cryptographic Block Audit</h3>
                  <p className="text-xs text-slate-500">SHA-256 Ledger Entry Proof</p>
                </div>
              </div>
              <button onClick={() => setInspectEntry(null)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">CURRENT BLOCK SHA-256 HASH:</label>
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono rounded-lg break-all select-all">
                  {inspectEntry.currentEntryHash || 'PENDING_HASH'}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">PREVIOUS BLOCK HASH (PARENT POINTER):</label>
                <div className="p-3 bg-slate-100 text-slate-800 font-mono rounded-lg break-all select-all border border-slate-200">
                  {inspectEntry.previousEntryHash || 'GENESIS_BLOCK_00000000000000000000000000000000000000000000000000000000'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-slate-400 block">RECORDED BY</span>
                  <span className="font-semibold text-slate-800">{inspectEntry.recordedBy?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">IP ADDRESS</span>
                  <span className="font-mono text-slate-800">{inspectEntry.recordedBy?.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block">EXECUTED AT</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(inspectEntry.executedAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">TRANSACTION REF</span>
                  <span className="font-mono text-slate-800">{inspectEntry.transactionReference || 'None'}</span>
                </div>
              </div>

              {inspectEntry.receiptUrl && (
                <div className="pt-2">
                  <span className="text-slate-400 block mb-1">ATTACHED RECEIPT</span>
                  <a
                    href={inspectEntry.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#31A895] underline break-all flex items-center gap-1"
                  >
                    <span>{inspectEntry.receiptUrl}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setInspectEntry(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TOGGLE MILITARY HIATUS */}
      {/* ========================================================================= */}
      {showHiatusModal && governance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {governance.governance.isMilitaryHiatusActive
                    ? 'Resume Vesting Clock from Military Service'
                    : 'Activate Military Service Hiatus'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Protects founder unvested equity and freezes the clock per Article 4.2
                </p>
              </div>
              <button onClick={() => setShowHiatusModal(false)} className="text-slate-400 hover:text-slate-600 text-lg">
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700 space-y-2">
              <p>
                <strong>Current Hiatus State:</strong>{' '}
                {governance.governance.isMilitaryHiatusActive ? 'ACTIVE (Paused)' : 'INACTIVE (Running)'}
              </p>
              <p>
                <strong>Action:</strong>{' '}
                {governance.governance.isMilitaryHiatusActive
                  ? 'Founder is returning to active duty. Hiatus days will be locked and vesting will resume.'
                  : 'Founder is entering obligatory service. Vesting timer will freeze, and completion date will shift accordingly.'}
              </p>
            </div>

            <form onSubmit={handleHiatusToggle} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  GOVERNANCE REASON / AUDIT NOTE <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conscription notice received / Completion of active service"
                  value={hiatusReason}
                  onChange={(e) => setHiatusReason(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#31A895]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowHiatusModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !hiatusReason.trim()}
                  className={`px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 ${
                    governance.governance.isMilitaryHiatusActive
                      ? 'bg-[#1ECB7F] hover:bg-[#18B366]'
                      : 'bg-[#FF5A6E] hover:bg-[#e64e5f]'
                  }`}
                >
                  {submitting
                    ? 'Updating Governance...'
                    : governance.governance.isMilitaryHiatusActive
                    ? 'Confirm Resume Clock'
                    : 'Confirm Freeze Clock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
