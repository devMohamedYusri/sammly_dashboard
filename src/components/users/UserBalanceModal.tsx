'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ApiUser } from '@/types';
import { manageUserBalance } from '@/lib/api';

// Vector Icons
function CoinsIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}

function CrownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CalendarIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// Official Sammly App Subscription Plans (Only Pro and Premium are subscribable)
export const OFFICIAL_SUBSCRIPTION_PLANS = [
  {
    id: 'pro' as const,
    title: 'Pro Plan',
    titleAr: 'باقة المحترف',
    monthlyCredits: 80,
    pricePerMonth: 599,
    badge: '10% OFF',
    desc: '80 credits / month',
    highlight: 'Standard Tier',
  },
  {
    id: 'premium' as const,
    title: 'Premium Plan',
    titleAr: 'باقة بريميوم',
    monthlyCredits: 210,
    pricePerMonth: 1499,
    badge: '14% OFF',
    desc: '210 credits / month',
    highlight: 'Power Users',
  },
] as const;

export const DURATION_INTERVALS = [
  { id: '1_month' as const, label: '1 Month', months: 1, days: '30 Days' },
  { id: '3_months' as const, label: '3 Months', months: 3, days: '90 Days' },
  { id: '6_months' as const, label: '6 Months', months: 6, days: '180 Days' },
  { id: '1_year' as const, label: 'Full Year', months: 12, days: '365 Days' },
] as const;

interface UserBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: ApiUser | null;
  allUsers?: ApiUser[];
  onSuccess: () => void;
}

export default function UserBalanceModal({
  isOpen,
  onClose,
  targetUser,
  allUsers = [],
  onSuccess,
}: UserBalanceModalProps) {
  // Tabs: 'credits' | 'subscription'
  const [activeTab, setActiveTab] = useState<'credits' | 'subscription'>('credits');

  // Selected User (if not passed in via targetUser)
  const [selectedUserId, setSelectedUserId] = useState<string>(targetUser?._id || '');

  // Credits Tab State (Presets 30, 80, 210, Custom - Never Expire)
  const [creditAmount, setCreditAmount] = useState<number>(80);
  const [customCreditInput, setCustomCreditInput] = useState<string>('80');

  // Subscription Tab State (Strictly Pro or Premium)
  const [selectedPlanId, setSelectedPlanId] = useState<'pro' | 'premium'>('pro');
  const [selectedInterval, setSelectedInterval] = useState<'1_month' | '3_months' | '6_months' | '1_year'>('1_month');
  const [creditsQuota, setCreditsQuota] = useState<number>(80);

  // Status & Alerts
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync selected user when targetUser prop changes
  useEffect(() => {
    if (targetUser) {
      setSelectedUserId(targetUser._id);
    } else if (allUsers.length > 0 && !selectedUserId) {
      setSelectedUserId(allUsers[0]._id);
    }
  }, [targetUser, allUsers, selectedUserId]);

  // Determine current active user object
  const activeUser = useMemo(() => {
    if (targetUser && targetUser._id === selectedUserId) return targetUser;
    return allUsers.find((u) => u._id === selectedUserId) || targetUser;
  }, [targetUser, allUsers, selectedUserId]);

  // Helper to calculate standard credits quota based on plan and duration
  const getStandardQuota = (planId: 'pro' | 'premium', interval: '1_month' | '3_months' | '6_months' | '1_year') => {
    const baseMonthly = planId === 'premium' ? 210 : 80;
    const months = interval === '1_year' ? 12 : interval === '6_months' ? 6 : interval === '3_months' ? 3 : 1;
    return baseMonthly * months;
  };

  // Adjust suggested subscription quota automatically when plan or duration changes
  useEffect(() => {
    setCreditsQuota(getStandardQuota(selectedPlanId, selectedInterval));
  }, [selectedPlanId, selectedInterval]);

  if (!isOpen) return null;

  // Preset credit selections
  const handleSelectPreset = (amount: number) => {
    setCreditAmount(amount);
    setCustomCreditInput(String(amount));
  };

  const handleCustomCreditChange = (val: string) => {
    setCustomCreditInput(val);
    const parsed = Number(val);
    if (!isNaN(parsed) && parsed > 0) {
      setCreditAmount(parsed);
    }
  };

  // Submit Handler
  const handleSubmit = async (action: 'add_credits' | 'assign_subscription' | 'cancel_subscription') => {
    if (!activeUser) {
      setError('Please select a target user');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (action === 'add_credits') {
        if (!creditAmount || creditAmount <= 0) {
          throw new Error('Please enter a valid credit amount');
        }
        const res = await manageUserBalance({
          targetUserId: activeUser._id,
          actionType: 'add_credits',
          creditAmount,
        });
        setSuccessMsg(res.message);
      } else if (action === 'assign_subscription') {
        const planObj = OFFICIAL_SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlanId);
        const intervalObj = DURATION_INTERVALS.find((d) => d.id === selectedInterval);
        const title = `${planObj?.title || 'Pro Plan'} (${intervalObj?.label || '1 Month'})`;

        const res = await manageUserBalance({
          targetUserId: activeUser._id,
          actionType: 'assign_subscription',
          planId: selectedPlanId,
          planTitle: title,
          interval: selectedInterval,
          creditsQuota,
          rolloverEnabled: true,
        });
        setSuccessMsg(res.message);
      } else if (action === 'cancel_subscription') {
        const res = await manageUserBalance({
          targetUserId: activeUser._id,
          actionType: 'cancel_subscription',
        });
        setSuccessMsg(res.message);
      }

      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Computations for preview
  const currentCredits = Number(activeUser?.credits !== undefined ? activeUser.credits : (activeUser?.tokens || 0));
  const newCalculatedCredits = currentCredits + (creditAmount || 0);

  const subDetails = activeUser?.subscriptionDetails;
  const isCurrentlySubscribed = subDetails?.status === 'active';

  const baseMonthly = selectedPlanId === 'premium' ? 210 : 80;
  const totalMonths = selectedInterval === '1_year' ? 12 : selectedInterval === '6_months' ? 6 : selectedInterval === '3_months' ? 3 : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-xl overflow-hidden my-auto border border-slate-200">
        {/* 1. Header (Clean, Light, Unified Brand Style) */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E8F5F3] text-[#31A895] flex items-center justify-center border border-[#d5eeea] shrink-0">
              <CoinsIcon className="w-5 h-5 text-[#31A895]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  User Balance &amp; Subscription
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-white uppercase tracking-wider">
                  FOUNDER
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Top up permanent credits or provision scheduled subscription tiers
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors text-sm font-bold"
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* 2. Target User Summary Card */}
        <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 shrink-0">
          {targetUser ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#E8F5F3] text-[#31A895] font-extrabold text-xs flex items-center justify-center shrink-0 border border-[#d5eeea]">
                  {(targetUser.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{targetUser.email}</p>
                  <p className="text-[10px] text-slate-500">
                    Role: <span className="font-semibold uppercase text-slate-700">{targetUser.role || 'user'}</span>
                    {targetUser.username && (
                      <> &bull; Username: <span className="font-semibold text-slate-700">@{targetUser.username}</span></>
                    )}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Current Balance
                </span>
                <span className="text-xs font-extrabold text-[#31A895] bg-[#E8F5F3] px-2 py-0.5 rounded-md inline-block">
                  {currentCredits.toFixed(1)} pts
                </span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 block">
                Select Target User:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#31A895] bg-white font-medium text-slate-800"
              >
                {allUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.email} ({Number(u.credits || 0).toFixed(0)} pts &bull; {u.role || 'user'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 3. Segmented Tab Navigation */}
        <div className="p-3 pb-0 shrink-0 bg-white">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveTab('credits')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'credits'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CoinsIcon className={`w-3.5 h-3.5 ${activeTab === 'credits' ? 'text-[#31A895]' : 'text-slate-400'}`} />
              <span>Normal Credits</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-normal hidden sm:inline">
                Permanent
              </span>
            </button>

            <button
              onClick={() => setActiveTab('subscription')}
              className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'subscription'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CrownIcon className={`w-3.5 h-3.5 ${activeTab === 'subscription' ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>Subscription Track</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700 font-normal hidden sm:inline">
                Staged
              </span>
            </button>
          </div>
        </div>

        {/* 4. Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[#FF5A6E] text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-[#E7FCF3] border border-[#A3F3CF] text-[#12924D] text-xs font-semibold flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-[#12924D]" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: ONE-TIME NORMAL CREDITS */}
          {activeTab === 'credits' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Select Quick Top-Up Preset:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { amount: 30, label: 'Starter', badge: '+30' },
                    { amount: 80, label: 'Popular', badge: '+80' },
                    { amount: 210, label: 'Value', badge: '+210' },
                  ].map((preset) => {
                    const isSelected = creditAmount === preset.amount;
                    return (
                      <button
                        key={preset.amount}
                        type="button"
                        onClick={() => handleSelectPreset(preset.amount)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-[#31A895] bg-[#F0FAF8] text-[#31A895] ring-2 ring-[#31A895]/20 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base font-extrabold block">{preset.badge} pts</span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                  Or Enter Custom Credits:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50000"
                    value={customCreditInput}
                    onChange={(e) => handleCustomCreditChange(e.target.value)}
                    placeholder="Enter custom amount..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895] bg-white"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    credits
                  </span>
                </div>
              </div>

              {/* Balance Calculation Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Current Balance:</span>
                  <span className="font-semibold text-slate-700">{currentCredits.toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Credits to Add:</span>
                  <span className="font-bold text-[#31A895]">+{creditAmount || 0} pts</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>New Total Balance:</span>
                  <span className="text-sm font-extrabold text-[#31A895]">
                    {newCalculatedCredits.toFixed(1)} pts
                  </span>
                </div>
              </div>

              {/* Permanent Rollover Guarantee Note */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2.5">
                <ShieldCheckIcon className="w-4 h-4 text-[#31A895] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Permanent Balance Guarantee:</strong> Normal credits added here do not expire and will
                  remain in the user&apos;s account indefinitely until spent generating designs.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION TRACK */}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {/* Current Status Pill */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CrownIcon className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Subscription Status
                    </span>
                    <p className="font-bold text-slate-900">
                      {isCurrentlySubscribed ? (
                        <span className="text-purple-700">{subDetails?.planTitle || 'Active Plan'}</span>
                      ) : subDetails?.status === 'lapsed' ? (
                        <span className="text-amber-700">Lapsed (In 30-Day Warranty)</span>
                      ) : (
                        <span className="text-slate-500 font-medium">Free Tier (No Active Subscription)</span>
                      )}
                    </p>
                  </div>
                </div>

                {subDetails?.expiresAt && (
                  <div className="text-right text-[11px] text-slate-500">
                    <span className="block text-[10px] text-slate-400">Expires</span>
                    <span className="font-bold text-slate-800">{subDetails.expiresAt.split('T')[0]}</span>
                  </div>
                )}
              </div>

              {/* Plan Tier Selection: Pro or Premium */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Choose Plan Tier:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {OFFICIAL_SUBSCRIPTION_PLANS.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#31A895] bg-[#F0FAF8] text-slate-900 ring-2 ring-[#31A895]/20 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900">{p.title}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            {p.badge}
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-[#31A895]">
                          {p.monthlyCredits} <span className="text-[10px] font-medium text-slate-500">credits/mo</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {p.pricePerMonth} EGP / month
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Options (4 Tiers) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Subscription Duration:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_INTERVALS.map((dur) => {
                    const isSelected = selectedInterval === dur.id;
                    const calculatedQuota = getStandardQuota(selectedPlanId, dur.id);
                    return (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setSelectedInterval(dur.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold ring-2 ring-purple-600/20 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs block font-bold">{dur.label}</span>
                        <span className="text-[10px] block font-extrabold text-purple-700 mt-0.5">
                          {dur.months === 1 ? `+${calculatedQuota}` : `${baseMonthly}/mo`}
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          {dur.months === 1 ? dur.days : `${calculatedQuota} pts`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Staged Monthly Delivery Schedule Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-600" />
                    <span>Monthly Staged Dispatch Schedule:</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-extrabold">
                    {totalMonths === 1 ? 'Single Month' : `${totalMonths} Monthly Cycles`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Granted Today (Month 1)</span>
                    <span className="text-sm font-extrabold text-[#31A895]">+{baseMonthly} credits</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Credited immediately</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Subsequent Dispatches</span>
                    <span className="text-sm font-extrabold text-purple-700">
                      {totalMonths > 1 ? `+${baseMonthly} pts / mo` : 'None (1 mo term)'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {totalMonths > 1 ? `Every 30 days for ${totalMonths - 1} months` : 'Cycle ends in 30 days'}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-200/70 flex justify-between items-center text-slate-900 font-semibold text-xs">
                  <span>Total Plan Commitment:</span>
                  <span className="text-purple-800 text-xs font-extrabold">
                    {creditsQuota} credits ({totalMonths} × {baseMonthly} pts)
                  </span>
                </div>
              </div>

              {/* Continuous Rollover + Warranty Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-[#31A895]" />
                  <span>Continuous Rollover &amp; 30-Day Warranty:</span>
                </div>
                <p className="leading-relaxed">
                  &bull; <strong>Continuous Rollover:</strong> Unspent credits automatically roll over into the next cycle.
                  <br />
                  &bull; <strong>30-Day Warranty:</strong> If the subscription is paused, credits remain protected for 30 days.
                </p>
              </div>

              {/* Cancel Button */}
              {isCurrentlySubscribed && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleSubmit('cancel_subscription')}
                    disabled={submitting}
                    className="text-xs text-red-600 hover:text-red-800 font-medium hover:underline"
                  >
                    Cancel Subscription (Enters 30-day grace period)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Sticky Action Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(activeTab === 'credits' ? 'add_credits' : 'assign_subscription')}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#31A895] hover:bg-[#289076] transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Processing...</span>
              </>
            ) : activeTab === 'credits' ? (
              <span>Add +{creditAmount} Credits</span>
            ) : isCurrentlySubscribed ? (
              <span>Extend / Resubscribe Plan</span>
            ) : (
              <span>
                Assign {selectedPlanId === 'premium' ? 'Premium' : 'Pro'} (+{baseMonthly} pts today
                {totalMonths > 1 ? ` • Mo 1 of ${totalMonths}` : ''})
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
