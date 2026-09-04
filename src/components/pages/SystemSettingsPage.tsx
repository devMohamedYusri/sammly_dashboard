'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import {
  getFeatureFlags,
  getAppVersion,
  getLegalDocument,
} from '@/lib/api';
import {
  FeatureFlags,
  AppVersionData,
} from '@/types';

export default function SystemSettingsPage() {
  const [version, setVersion] = useState<AppVersionData | null>(null);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Legal modal state
  const [legalDoc, setLegalDoc] = useState<{ title: string; content: string } | null>(null);
  const [loadingLegal, setLoadingLegal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [versionData, flagsData] = await Promise.all([
        getAppVersion(),
        getFeatureFlags(),
      ]);
      setVersion(versionData);
      setFlags(flagsData);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load system settings and configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLegal = async (type: 'privacy-policy' | 'terms-of-service') => {
    setLoadingLegal(true);
    try {
      const doc = await getLegalDocument(type);
      setLegalDoc(doc);
    } catch (err: any) {
      alert(err?.message || 'Failed to load document');
    } finally {
      setLoadingLegal(false);
    }
  };

  if (loading && !version && !flags) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        Loading system settings and configuration...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">App Version & Feature Flags</h1>
        <p className="text-slate-500 mt-1">
          Review mobile client runtime flags, app version constraints, and legal compliance contracts
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-[#FF5A6E] bg-red-50 border border-red-100 rounded-xl">
          {error}
        </div>
      )}

      {/* Section 1: Mobile App Version Control */}
      {version && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Mobile Client Versioning</h2>
            <span className="text-xs text-slate-400">Source: /api/app-version</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="LATEST VERSION"
              value={`v${version.latestVersion}`}
              iconSrc="/icon-sparkles.svg"
            />
            <StatCard
              title="MINIMUM REQUIRED"
              value={`v${version.minRequiredVersion}`}
              iconSrc="/icon-check.svg"
            />
            <StatCard
              title="FORCE UPDATE STATUS"
              value={version.forceUpdate ? 'Enforced' : 'Optional'}
              iconSrc={version.forceUpdate ? '/icon-close.svg' : '/icon-check.svg'}
              valueColor={version.forceUpdate ? 'text-[#FF5A6E]' : 'text-[#1ECB7F]'}
            />
          </div>

          {/* Release Notes & Download Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Release Notes */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Release Notes (v{version.latestVersion})</h3>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">English</p>
                <p className="text-sm text-slate-700">{version.releaseNotes || 'None'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Arabic</p>
                <p className="text-sm text-slate-700" dir="rtl">{version.releaseNotesAr || 'لا يوجد'}</p>
              </div>
            </div>

            {/* Download & APK URL */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">APK Distribution Target</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Target download destination served to clients needing mandatory or optional updates.
                </p>
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 font-mono text-xs text-slate-600 break-all">
                  {version.downloadUrl}
                </div>
              </div>
              <a
                href={version.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#31A895] text-white text-xs font-semibold rounded-lg hover:bg-[#289076] transition-colors"
              >
                Open Download Link ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Runtime Feature Flags */}
      {flags && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Runtime Feature Toggles</h2>
            <span className="text-xs text-slate-400">Source: /api/feature-flags</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Flag: Visual Sourcing */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Visual Sourcing Engine</h3>
                <Badge variant={flags.visualSourcing?.enabled ? 'success' : 'danger'}>
                  {flags.visualSourcing?.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                AI visual search powered by Gemini Vision classification and Render DINOv2 vector matching.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#1ECB7F]"></span>
                Standalone Search: {flags.visualSourcing?.standaloneSearch ? 'Enabled' : 'Disabled'}
              </div>
            </div>

            {/* Flag: Flux Generation */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Interior Generation Engine</h3>
                <Badge variant={flags.fluxGeneration?.enabled ? 'success' : 'danger'}>
                  {flags.fluxGeneration?.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Architectural and room restyling generation model powered by Flux 2 Pro.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#31A895]"></span>
                Engine: <span className="font-mono">{flags.fluxGeneration?.engine || 'flux-2-pro'}</span>
              </div>
            </div>

            {/* Flag: Custom Furniture Fabrication */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Custom Artisan Fabrication</h3>
                <Badge variant={flags.customBuild?.enabled ? 'success' : 'warning'}>
                  {flags.customBuild?.enabled ? 'Active' : 'Teaser State'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {flags.customBuild?.message || 'Connect with local Egyptian artisan workshops to craft this custom piece.'}
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                Display Title: {flags.customBuild?.title || 'Custom Furniture Fabrication'}
              </div>
            </div>

            {/* Flag: Google Play Billing */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 text-sm">Google Play In-App Billing</h3>
                <Badge variant={flags.googlePlayBilling?.enabled ? 'success' : 'danger'}>
                  {flags.googlePlayBilling?.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Enables mobile app users to purchase token packages via Google Play Store billing gateway.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-[#1ECB7F]"></span>
                Checkout Gateway: Native Google Play
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Legal Compliance Documents */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Legal Compliance Documents</h2>
          <span className="text-xs text-slate-400">Source: /api/legal</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Privacy Policy</h3>
              <p className="text-xs text-slate-500 mt-0.5">Mandatory for App Store & Play Store</p>
            </div>
            <button
              onClick={() => openLegal('privacy-policy')}
              disabled={loadingLegal}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Preview Document
            </button>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Terms of Service</h3>
              <p className="text-xs text-slate-500 mt-0.5">User agreement and acceptable use policy</p>
            </div>
            <button
              onClick={() => openLegal('terms-of-service')}
              disabled={loadingLegal}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Preview Document
            </button>
          </div>
        </div>
      </div>

      {/* Legal Preview Modal */}
      {legalDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">{legalDoc.title}</h3>
              <button
                onClick={() => setLegalDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto font-mono leading-relaxed">
              {legalDoc.content}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setLegalDoc(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
