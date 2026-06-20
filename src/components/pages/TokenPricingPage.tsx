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
  const [newPkgTokens, setNewPkgTokens] = useState(0);
  const [newPkgPrice, setNewPkgPrice] = useState(0);

  const [submitting, setSubmitting] = useState(false);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const data = await getPackages();
      const freePkg = data.find((p) => p.packageId === 'free');
      if (freePkg) {
        setFreeTokens(freePkg.tokens);
      }
      const paidPkgs = data.filter((p) => p.packageId !== 'free');
      setPackages(paidPkgs);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handlePackageChange = (id: string, field: 'tokens' | 'price', value: number) => {
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
    } catch (err: any) {
      alert(err?.message || 'Failed to delete package');
    }
  };

  const handleAddPackage = async () => {
    if (!newPkgId.trim()) {
      alert('Package ID is required');
      return;
    }
    setSubmitting(true);
    try {
      await addPackage(newPkgId.trim().toLowerCase(), newPkgTokens, newPkgPrice);
      setNewPkgId('');
      setNewPkgTokens(0);
      setNewPkgPrice(0);
      alert('Package added successfully');
      loadPackages();
    } catch (err: any) {
      alert(err?.message || 'Failed to add package');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAll = async () => {
    setSubmitting(true);
    try {
      const promises: Promise<any>[] = [];

      // Update free package
      promises.push(updatePackage('free', { tokens: freeTokens }));

      // Update all paid packages
      packages.forEach((pkg) => {
        promises.push(updatePackage(pkg.packageId, { tokens: pkg.tokens, price: pkg.price }));
      });

      await Promise.all(promises);
      alert('All updates saved successfully');
      loadPackages();
    } catch (err: any) {
      alert(err?.message || 'Failed to save updates');
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
        <h1 className="text-2xl font-bold text-slate-900">Token Pricing Settings</h1>
        <p className="text-slate-500 mt-1">Manage token packages and pricing</p>
      </div>

      {error && (
        <div className="p-4 text-sm text-[#FF5A6E] bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {/* Edit Pricing Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900">Edit Pricing</h2>

        {/* Free Tokens */}
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Free tokens per user</h3>
          <p className="text-sm text-slate-500">Number of free tokens users receive every month</p>
          <div className="flex items-center gap-2 mt-3">
            <input
              type="number"
              value={freeTokens}
              onChange={(e) => setFreeTokens(Number(e.target.value))}
              className="w-24 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
              min="0"
            />
            <span className="text-sm text-slate-500">tokens</span>
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Token Packages */}
        {packages.map((pkg, index) => {
          const displayName = pkg.packageId.charAt(0).toUpperCase() + pkg.packageId.slice(1) + ' Package';
          return (
            <div key={pkg.packageId} className="space-y-4">
              <h3 className="text-base font-semibold text-slate-900">{displayName}</h3>
              <div className="flex items-end gap-8 flex-wrap">
                {/* Token Quantity */}
                <div className="space-y-2">
                  <label className="block text-sm text-slate-500">Token quantity</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pkg.tokens}
                      onChange={(e) => handlePackageChange(pkg.packageId, 'tokens', Number(e.target.value))}
                      className="w-24 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
                      min="0"
                    />
                    <span className="text-sm text-slate-500">tokens</span>
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="block text-sm text-slate-500">Price</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">EGP</span>
                    <input
                      type="number"
                      value={pkg.price}
                      onChange={(e) => handlePackageChange(pkg.packageId, 'price', Number(e.target.value))}
                      className="w-24 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeletePackage(pkg.packageId)}
                  className="px-6 py-2 bg-[#FF5A6E] text-white rounded-lg hover:bg-[#e64e5f] transition-colors text-sm font-medium"
                >
                  Delete
                </button>
              </div>

              {/* Divider */}
              {index < packages.length - 1 && <hr className="border-slate-200 mt-4" />}
            </div>
          );
        })}

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Add Package Section */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Add New Package</h3>
          <div className="flex items-end gap-8 flex-wrap">
            {/* Package ID */}
            <div className="space-y-2">
              <label className="block text-sm text-slate-500">Package ID</label>
              <input
                type="text"
                placeholder="e.g. platinum"
                value={newPkgId}
                onChange={(e) => setNewPkgId(e.target.value)}
                className="w-40 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
              />
            </div>

            {/* Tokens */}
            <div className="space-y-2">
              <label className="block text-sm text-slate-500">Token quantity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newPkgTokens}
                  onChange={(e) => setNewPkgTokens(Number(e.target.value))}
                  className="w-24 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
                  min="0"
                />
                <span className="text-sm text-slate-500">tokens</span>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <label className="block text-sm text-slate-500">Price</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">EGP</span>
                <input
                  type="number"
                  value={newPkgPrice}
                  onChange={(e) => setNewPkgPrice(Number(e.target.value))}
                  className="w-24 px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddPackage}
              disabled={submitting}
              className="px-6 py-2.5 bg-[#31A895] text-white rounded-lg hover:bg-[#289076] transition-colors text-sm font-medium disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Package'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={loadPackages}
          disabled={submitting}
          className="px-6 py-2.5 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={handleSaveAll}
          disabled={submitting}
          className="px-6 py-2.5 bg-[#31A895] text-white rounded-lg hover:bg-[#289076] transition-colors text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Updates'}
        </button>
      </div>
    </div>
  );
}
