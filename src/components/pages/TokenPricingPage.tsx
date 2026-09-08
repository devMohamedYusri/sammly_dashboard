'use client';

import React, { useState, useEffect } from 'react';
import { getPackages, addPackage, updatePackage, deletePackage } from '@/lib/api';
import { ApiPackage } from '@/types';

export default function TokenPricingPage() {
  const [packages, setPackages] = useState<ApiPackage[]>([]);
  const [freeTokens, setFreeTokens] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New package form state
  const [newPkgId, setNewPkgId] = useState('');
  const [newPkgTitle, setNewPkgTitle] = useState('');
  const [newPkgTitleAr, setNewPkgTitleAr] = useState('');
  const [newPkgTokens, setNewPkgTokens] = useState(0);
  const [newPkgPrice, setNewPkgPrice] = useState(0);
  const [newPkgBadge, setNewPkgBadge] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await getPackages();
      const freePkg = data.find((p) => p.packageId === 'free');
      if (freePkg) {
        setFreeTokens(freePkg.tokens || freePkg.credits || 15);
      }
      const paidPkgs = data.filter((p) => p.packageId !== 'free');
      setPackages(paidPkgs);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load packages';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handlePackageChange = (
    id: string,
    field: 'tokens' | 'price' | 'title' | 'titleAr' | 'badge',
    value: string | number
  ) => {
    setPackages(
      packages.map((pkg) =>
        pkg.packageId === id ? { ...pkg, [field]: value } : pkg
      )
    );
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm(`Are you sure you want to delete the package "${id}"?`)) return;
    try {
      await deletePackage(id);
      setPackages(packages.filter((pkg) => pkg.packageId !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete package';
      alert(msg);
    }
  };

  const handleAddPackage = async () => {
    if (!newPkgId.trim()) {
      alert('Package ID is required');
      return;
    }
    setSubmitting(true);
    try {
      await addPackage({
        packageId: newPkgId.trim().toLowerCase(),
        title: newPkgTitle.trim() || newPkgId.trim(),
        titleAr: newPkgTitleAr.trim() || newPkgId.trim(),
        tokens: Number(newPkgTokens),
        price: Number(newPkgPrice),
        badge: newPkgBadge.trim() || null,
      });

      setNewPkgId('');
      setNewPkgTitle('');
      setNewPkgTitleAr('');
      setNewPkgTokens(0);
      setNewPkgPrice(0);
      setNewPkgBadge('');

      alert('Package added successfully');
      loadPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add package';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAll = async () => {
    setSubmitting(true);
    try {
      const promises: Promise<unknown>[] = [];

      // Update free package tokens with explicit localized titles
      promises.push(
        updatePackage('free', {
          tokens: Number(freeTokens),
          newTitle: 'Free Trial',
          newTitleAr: 'باقة تجريبية',
        })
      );

      // Update all paid packages ensuring title and titleAr are never empty
      packages.forEach((pkg) => {
        const titleFallback = pkg.title?.trim() || pkg.packageId;
        const titleArFallback = pkg.titleAr?.trim() || pkg.packageId;
        promises.push(
          updatePackage(pkg.packageId, {
            tokens: Number(pkg.tokens),
            price: Number(pkg.price),
            newTitle: titleFallback,
            newTitleAr: titleArFallback,
            newBadge: pkg.badge?.trim() || null,
          })
        );
      });

      await Promise.all(promises);
      alert('All package updates saved successfully');
      loadPackages();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save updates';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && packages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading token settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Token Pricing & Packages</h1>
        <p className="text-slate-500 mt-1">
          Configure client token tiers, Egyptian pricing, marketing badges, and monthly allowances
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-[#FF5A6E] bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {/* Edit Pricing Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900">Active Package Configuration</h2>

        {/* Free Tokens */}
        <div className="p-5 rounded-xl border border-slate-200 bg-[#f0faf8] space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎁</span>
            <h3 className="text-base font-semibold text-slate-900">Free Trial Credits per User</h3>
          </div>
          <p className="text-xs text-slate-500">
            One-time lifetime free credit balance granted to verified accounts upon registration
          </p>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="number"
              value={freeTokens}
              onChange={(e) => setFreeTokens(Number(e.target.value))}
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
              min="0"
            />
            <span className="text-sm text-slate-600 font-medium">credits / tokens</span>
          </div>
        </div>

        {/* Token Packages */}
        <div className="space-y-4">
          {packages.map((pkg, index) => {
            const displayName =
              pkg.title ||
              pkg.packageId.charAt(0).toUpperCase() + pkg.packageId.slice(1) + ' Package';

            return (
              <div
                key={pkg.packageId}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{displayName}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-600">
                      ID: {pkg.packageId}
                    </span>
                    {pkg.badge && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E8F5F3] text-[#1F6857] font-semibold border border-[#A3D7CF]">
                        {pkg.badge}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePackage(pkg.packageId)}
                    className="self-end sm:self-center px-3 py-1.5 bg-[#FFE8EC] text-[#CC2236] hover:bg-[#ffd1d9] rounded-lg transition-colors text-xs font-semibold"
                  >
                    Delete Package
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {/* English Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500">TITLE (EN)</label>
                    <input
                      type="text"
                      value={pkg.title || ''}
                      onChange={(e) =>
                        handlePackageChange(pkg.packageId, 'title', e.target.value)
                      }
                      placeholder="e.g. Starter Pack"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                    />
                  </div>

                  {/* Arabic Title */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500">TITLE (AR)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={pkg.titleAr || ''}
                      onChange={(e) =>
                        handlePackageChange(pkg.packageId, 'titleAr', e.target.value)
                      }
                      placeholder="e.g. باقة المبتدئين"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                    />
                  </div>

                  {/* Tokens */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500">TOKENS / CREDITS</label>
                    <input
                      type="number"
                      value={pkg.tokens}
                      onChange={(e) =>
                        handlePackageChange(pkg.packageId, 'tokens', Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                      min="0"
                    />
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500">PRICE (EGP)</label>
                    <input
                      type="number"
                      value={pkg.price}
                      onChange={(e) =>
                        handlePackageChange(pkg.packageId, 'price', Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                      min="0"
                    />
                  </div>

                  {/* Badge */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500">BADGE (OPTIONAL)</label>
                    <input
                      type="text"
                      value={pkg.badge || ''}
                      onChange={(e) =>
                        handlePackageChange(pkg.packageId, 'badge', e.target.value)
                      }
                      placeholder="e.g. Most Popular"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Package Section */}
        <div className="p-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Add New Token Package</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">PACKAGE ID</label>
              <input
                type="text"
                placeholder="e.g. master"
                value={newPkgId}
                onChange={(e) => setNewPkgId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">TITLE (EN)</label>
              <input
                type="text"
                placeholder="e.g. Master Studio"
                value={newPkgTitle}
                onChange={(e) => setNewPkgTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">TITLE (AR)</label>
              <input
                type="text"
                dir="rtl"
                placeholder="e.g. باقة المحترفين"
                value={newPkgTitleAr}
                onChange={(e) => setNewPkgTitleAr(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">TOKENS</label>
              <input
                type="number"
                value={newPkgTokens}
                onChange={(e) => setNewPkgTokens(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">PRICE (EGP)</label>
              <input
                type="number"
                value={newPkgPrice}
                onChange={(e) => setNewPkgPrice(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">BADGE</label>
              <input
                type="text"
                placeholder="e.g. Best Value"
                value={newPkgBadge}
                onChange={(e) => setNewPkgBadge(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleAddPackage}
              disabled={submitting || !newPkgId.trim()}
              className="px-6 py-2.5 bg-[#31A895] text-white rounded-lg hover:bg-[#289076] transition-colors text-sm font-semibold disabled:opacity-50"
            >
              {submitting ? 'Adding...' : '+ Add Package'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          onClick={loadPackages}
          disabled={submitting}
          className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={handleSaveAll}
          disabled={submitting}
          className="px-6 py-2.5 bg-[#31A895] text-white rounded-lg hover:bg-[#289076] transition-colors text-sm font-medium disabled:opacity-50 shadow-sm"
        >
          {submitting ? 'Saving...' : 'Save All Updates'}
        </button>
      </div>
    </div>
  );
}
