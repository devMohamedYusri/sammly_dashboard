'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ApiUser } from '@/types';
import { manageUserBalance } from '@/lib/api';

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
  const [userSearch, setUserSearch] = useState<string>('');

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#31A895] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Balance &amp; Subscription Manager</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-400 text-slate-900 uppercase">
                  FOUNDER
                </span>
              </div>
              <p className="text-xs text-slate-300">Grant permanent credits or assign subscription tiers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* User Identification Summary */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          {targetUser ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-900">{targetUser.email}</p>
                <p className="text-[11px] text-slate-500">
                  Role: <span className="font-semibold uppercase text-slate-700">{targetUser.role || 'user'}</span> &bull;
                  Username: <span className="font-semibold text-slate-700">{targetUser.username || '—'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Current Balance</span>
                <p className="text-sm font-extrabold text-[#31A895]">{currentCredits.toFixed(1)} pts</p>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase mb-1 block">Select Target User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#31A895] bg-white font-medium"
              >
                {allUsers.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.email} ({Number(u.credits || 0).toFixed(0)} pts &bull; {u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex border-b border-slate-200 px-6 shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('credits')}
            className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'credits'
                ? 'border-[#31A895] text-[#31A895]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>💰 Add Normal Credits</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
              Never Expire
            </span>
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'subscription'
                ? 'border-[#31A895] text-[#31A895]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>👑 Subscription Track</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold">
              1 Mo – 1 Year
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Success / Error Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#FF5A6E] text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-[#E7FCF3] border border-[#A3F3CF] text-[#12924D] text-xs font-medium flex items-center gap-2">
              <span>✅</span>
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
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { amount: 30, label: 'Starter Pack', badge: '30 pts' },
                    { amount: 80, label: 'Popular Pack', badge: '80 pts' },
                    { amount: 210, label: 'Value Pack', badge: '210 pts' },
                  ].map((preset) => (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => handleSelectPreset(preset.amount)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        creditAmount === preset.amount
                          ? 'border-[#31A895] bg-[#F0FAF8] text-[#31A895] shadow-sm ring-1 ring-[#31A895]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-lg font-extrabold block">+{preset.badge}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{preset.label}</span>
                    </button>
                  ))}
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    credits
                  </span>
                </div>
              </div>

              {/* Balance Calculation Preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
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
                  <span className="text-base font-extrabold text-[#31A895]">
                    {newCalculatedCredits.toFixed(1)} pts
                  </span>
                </div>
              </div>

              {/* Permanent Rollover Notice */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                <span className="text-base">🛡️</span>
                <p>
                  <strong>Permanent Rollover Guarantee:</strong> Normal credits added here do not expire and will
                  remain in the user&apos;s account until they spend them generating designs.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: SUBSCRIPTION TRACK */}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              {/* Current Status Pill */}
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Current Subscription Status
                  </span>
                  <p className="font-bold text-purple-950 mt-0.5">
                    {isCurrentlySubscribed ? (
                      <>👑 {subDetails?.planTitle || 'Active Plan'}</>
                    ) : subDetails?.status === 'lapsed' ? (
                      <>⏳ Lapsed (In 30-Day Warranty)</>
                    ) : (
                      <>Free Tier (No Active Subscription)</>
                    )}
                  </p>
                </div>
                {subDetails?.expiresAt && (
                  <div className="text-right text-[11px] text-purple-800">
                    <span>Expires: </span>
                    <span className="font-bold">{subDetails.expiresAt.split('T')[0]}</span>
                  </div>
                )}
              </div>

              {/* Plan Tier Selection: Strictly the 2 official app subscription plans */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Choose Subscription Plan (Pro or Premium):
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {OFFICIAL_SUBSCRIPTION_PLANS.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#31A895] bg-[#F0FAF8] text-[#31A895] ring-2 ring-[#31A895]/20 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-extrabold text-slate-900">{p.title}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            {p.badge}
                          </span>
                        </div>
                        <div className="text-sm font-extrabold text-[#31A895]">
                          {p.monthlyCredits} <span className="text-[11px] font-medium text-slate-500">credits/mo</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {p.pricePerMonth} EGP / month
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Options (4 Tiers) with dynamic credits per plan */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Select Subscription Duration:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DURATION_INTERVALS.map((dur) => {
                    const isSelected = selectedInterval === dur.id;
                    const calculatedQuota = getStandardQuota(selectedPlanId, dur.id);
                    const baseMonthly = selectedPlanId === 'premium' ? 210 : 80;
                    return (
                      <button
                        key={dur.id}
                        type="button"
                        onClick={() => setSelectedInterval(dur.id)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-2 ring-purple-600/20 shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-xs block font-bold">{dur.label}</span>
                        <span className="text-[11px] block font-extrabold text-purple-700 mt-0.5">
                          {dur.months === 1 ? `+${calculatedQuota} pts` : `${baseMonthly} pts/mo`}
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          {dur.months === 1 ? dur.days : `${calculatedQuota} pts total`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Monthly Staged Allotment Breakdown */}
              {(() => {
                const baseMonthly = selectedPlanId === 'premium' ? 210 : 80;
                const totalMonths = selectedInterval === '1_year' ? 12 : selectedInterval === '6_months' ? 6 : selectedInterval === '3_months' ? 3 : 1;
                return (
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                    <div className="flex justify-between items-center text-purple-900 font-bold">
                      <span>Monthly Staged Dispatch Schedule:</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900 font-extrabold">
                        {totalMonths === 1 ? 'Single Month' : `${totalMonths} Monthly Cycles`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-xs">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Granted Today (Month 1)</span>
                        <span className="text-base font-extrabold text-[#31A895]">+{baseMonthly} credits</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Added to balance immediately</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-xs">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Subsequent Dispatches</span>
                        <span className="text-base font-extrabold text-purple-700">
                          {totalMonths > 1 ? `+${baseMonthly} pts / mo` : 'None (1 mo term)'}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {totalMonths > 1 ? `Every 30 days for ${totalMonths - 1} months` : 'Cycle ends in 30 days'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-purple-200/60 flex justify-between items-center text-purple-950 font-bold">
                      <span>Total Plan Commitment:</span>
                      <span className="text-purple-800 text-xs font-extrabold">
                        {creditsQuota} credits ({totalMonths} × {baseMonthly} pts)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Plan Credit Quota */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Total Credits Commitment ({selectedPlanId === 'premium' ? 'Premium' : 'Pro'} &bull; {selectedInterval.replace('_', ' ')}):
                  </label>
                  <span className="text-xs text-[#31A895] font-extrabold">{creditsQuota} credits</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={creditsQuota}
                    onChange={(e) => setCreditsQuota(Number(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    credits
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Standard tier quota: {getStandardQuota(selectedPlanId, selectedInterval)} credits ({selectedPlanId === 'premium' ? '210' : '80'}/mo × {selectedInterval === '1_year' ? '12' : selectedInterval === '6_months' ? '6' : selectedInterval === '3_months' ? '3' : '1'} mos). Only Month 1 credits are granted today; subsequent months dispatch automatically every 30 days.
                </p>
              </div>

              {/* Continuous Rollover + 30-Day Warranty Explanation Box */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <span>🛡️</span>
                  <span>Continuous Rollover + 30-Day Warranty:</span>
                </div>
                <p className="text-[11px] text-blue-900 leading-relaxed">
                  &bull; <strong>Continuous Rollover:</strong> If the user subscribes month-after-month, all unused
                  credits automatically roll over and stack into their balance.
                  <br />
                  &bull; <strong>30-Day Warranty Grace Period:</strong> If the user does not renew in a future month,
                  their accumulated credits do not vanish immediately. They retain a 30-day warranty window to use
                  their credits or re-subscribe without penalty.
                </p>
              </div>

              {/* Active Subscription Action Buttons */}
              {isCurrentlySubscribed && (
                <div className="flex justify-end pt-1">
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

        {/* Sticky Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
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
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#31A895] hover:bg-[#289076] transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
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
                Assign {selectedPlanId === 'premium' ? 'Premium' : 'Pro'} (+{selectedPlanId === 'premium' ? 210 : 80} pts today
                {selectedInterval !== '1_month'
                  ? ` • Month 1 of ${selectedInterval === '1_year' ? 12 : selectedInterval === '6_months' ? 6 : 3}`
                  : ''}
                )
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
