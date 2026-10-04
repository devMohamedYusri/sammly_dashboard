'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import {
  getApiTelemetryOverview,
  getDetailedApiTelemetryLogs,
  getSourcingQualityMetrics,
  getDetailedSourcingLogs,
  getSourcingCatalogProducts,
} from '@/lib/api';
import {
  ApiTelemetryOverview,
  ApiTelemetryLogItem,
  DetailedApiTelemetryData,
  SourcingQualityMetrics,
  SourcingSearchLog,
  SearchResultItem,
} from '@/types';
import CatalogProductsTab from '@/components/sourcing/CatalogProductsTab';

type ActiveTab = 'telemetry' | 'analytics' | 'logs' | 'catalog';

export default function SourcingTelemetryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');
  const [catalogCount, setCatalogCount] = useState<number | null>(null);

  // Tab 1: API Telemetry State
  const [telemetry, setTelemetry] = useState<ApiTelemetryOverview | null>(null);
  const [timeframeHours, setTimeframeHours] = useState(24);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Tab 1: Detailed API Telemetry Logs State
  const [apiLogs, setApiLogs] = useState<ApiTelemetryLogItem[]>([]);
  const [apiLogsLoading, setApiLogsLoading] = useState(false);
  const [apiLogsError, setApiLogsError] = useState<string | null>(null);
  const [apiLogsPage, setApiLogsPage] = useState(1);
  const [apiLogsTotalPages, setApiLogsTotalPages] = useState(1);
  const [apiLogsTotal, setApiLogsTotal] = useState(0);
  const [apiSummary, setApiSummary] = useState<DetailedApiTelemetryData['summary'] | null>(null);
  const [apiSelectedFeature, setApiSelectedFeature] = useState<'all' | 'generation' | 'sourcing' | 'payment' | 'auth' | 'admin'>('all');
  const [apiSearchQuery, setApiSearchQuery] = useState('');
  const [apiStatusCodeFilter, setApiStatusCodeFilter] = useState('all');
  const [apiRouteFilter, setApiRouteFilter] = useState('');
  const [apiUserFilter, setApiUserFilter] = useState<{ id: string; email: string } | null>(null);
  const [inspectApiLog, setInspectApiLog] = useState<ApiTelemetryLogItem | null>(null);

  // Tab 2: Sourcing Analytics State
  const [metrics, setMetrics] = useState<SourcingQualityMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Tab 3: Search Logs State
  const [logs, setLogs] = useState<SourcingSearchLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [selectedValid, setSelectedValid] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Selected Log Modal for Drilldown
  const [inspectLog, setInspectLog] = useState<SourcingSearchLog | null>(null);

  // Load Telemetry
  const fetchTelemetry = async (hours: number) => {
    setLoadingTelemetry(true);
    try {
      const data = await getApiTelemetryOverview(hours);
      setTelemetry(data);
      setTelemetryError(null);
    } catch (err: any) {
      setTelemetryError(err?.message || 'Failed to fetch API telemetry data');
    } finally {
      setLoadingTelemetry(false);
    }
  };

  // Load Detailed API Telemetry Logs
  const fetchDetailedApiLogs = async () => {
    setApiLogsLoading(true);
    setApiLogsError(null);
    try {
      const data = await getDetailedApiTelemetryLogs({
        hours: timeframeHours,
        feature: apiSelectedFeature,
        search: apiSearchQuery.trim() || undefined,
        statusCode: apiStatusCodeFilter !== 'all' ? apiStatusCodeFilter : undefined,
        route: apiRouteFilter.trim() || undefined,
        userId: apiUserFilter?.id || undefined,
        page: apiLogsPage,
        limit: 20,
      });
      setApiLogs(data.logs || []);
      setApiLogsTotalPages(data.pagination?.totalPages || 1);
      setApiLogsTotal(data.pagination?.total || 0);
      setApiSummary(data.summary || null);
    } catch (err: any) {
      setApiLogsError(err?.message || 'Failed to fetch detailed API telemetry logs');
    } finally {
      setApiLogsLoading(false);
    }
  };

  // Load Sourcing Metrics
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const data = await getSourcingQualityMetrics();
      setMetrics(data);
      setMetricsError(null);
    } catch (err: any) {
      setMetricsError(err?.message || 'Failed to fetch sourcing quality metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Load Search Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const params: any = {
        page: logsPage,
        limit: 15,
      };
      if (selectedQuality !== 'all') params.quality = selectedQuality;
      if (selectedValid === 'valid') params.isValid = true;
      else if (selectedValid === 'invalid') params.isValid = false;
      if (selectedCategory.trim()) params.category = selectedCategory.trim();

      const data = await getDetailedSourcingLogs(params);
      setLogs(data.logs);
      setLogsTotalPages(data.pagination.totalPages || 1);
      setLogsTotal(data.pagination.total || 0);
      setLogsError(null);
    } catch (err: any) {
      setLogsError(err?.message || 'Failed to fetch sourcing search logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  // Load Dynamic Catalog Count
  const fetchCatalogCount = async () => {
    try {
      const data = await getSourcingCatalogProducts({ limit: 1 });
      if (data?.pagination?.total !== undefined) {
        setCatalogCount(data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to fetch dynamic catalog count:', err);
    }
  };

  useEffect(() => {
    fetchCatalogCount();
  }, []);

  const formatCatalogBadge = (count: number | null): string => {
    if (count === null) return '...';
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toLocaleString();
  };

  // Trigger loading based on active tab
  useEffect(() => {
    if (activeTab === 'telemetry') {
      fetchTelemetry(timeframeHours);
    } else if (activeTab === 'analytics') {
      if (!metrics) fetchMetrics();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'telemetry') {
      fetchTelemetry(timeframeHours);
      fetchDetailedApiLogs();
    }
  }, [
    activeTab,
    timeframeHours,
    apiSelectedFeature,
    apiStatusCodeFilter,
    apiRouteFilter,
    apiUserFilter,
    apiLogsPage,
  ]);

  useEffect(() => {
    if (activeTab === 'telemetry') {
      const timer = setTimeout(() => {
        setApiLogsPage(1);
        fetchDetailedApiLogs();
      }, apiSearchQuery ? 350 : 0);
      return () => clearTimeout(timer);
    }
  }, [apiSearchQuery]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [logsPage, selectedQuality, selectedValid, selectedCategory]);

  const getFeatureBadge = (route: string) => {
    const r = (route || '').toLowerCase();
    if (r.includes('generate') || r.includes('restyle') || r.includes('full-home') || r.includes('mask')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>
          AI Generation
        </span>
      );
    }
    if (r.includes('sourcing')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          AI Sourcing
        </span>
      );
    }
    if (r.includes('payment') || r.includes('credits') || r.includes('balance') || r.includes('financials')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          Billing & Credits
        </span>
      );
    }
    if (r.includes('auth') || r.includes('profile') || r.includes('users')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Auth & Users
        </span>
      );
    }
    if (r.includes('admin') || r.includes('support')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          Admin & Ops
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
        API Call
      </span>
    );
  };

  const getMethodBadge = (method: string) => {
    const m = (method || 'GET').toUpperCase();
    if (m === 'POST') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">POST</span>;
    }
    if (m === 'GET') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">GET</span>;
    }
    if (m === 'PATCH' || m === 'PUT') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">{m}</span>;
    }
    if (m === 'DELETE') {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">DEL</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{m}</span>;
  };

  const getStatusCodeBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">● {code} OK</span>;
    }
    if (code >= 400 && code < 500) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">▲ {code} Client</span>;
    }
    if (code >= 500) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">✕ {code} Error</span>;
    }
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{code}</span>;
  };

  const formatLatency = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms}ms`;
  };

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diffMs / (60 * 1000));
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'good':
        return <Badge variant="success">Good Match</Badge>;
      case 'moderate':
        return <Badge variant="info">Moderate</Badge>;
      case 'poor':
        return <Badge variant="warning">Poor Match</Badge>;
      case 'none':
        return <Badge variant="default">No Match</Badge>;
      case 'rejected':
        return <Badge variant="danger">AI Rejected</Badge>;
      default:
        return <Badge variant="default">{quality}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI & Sourcing Telemetry</h1>
          <p className="text-slate-500 mt-1">
            Monitor system request volumes, AI vision accuracy, matching quality, and search logs
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap sm:inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-full">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'telemetry'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            API Telemetry
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sourcing Analytics
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Search Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title={catalogCount !== null ? `${catalogCount.toLocaleString()} products currently in vector catalog` : undefined}
          >
            <span>Product Catalog</span>
            <span className="px-1.5 py-0.2 bg-[#E8F5F3] text-[#1F6857] rounded-full text-[10px] font-bold">
              {formatCatalogBadge(catalogCount)}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: API Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* 1. Timeframe Window Pill Bar (90d down to 1d) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Duration Window</span>
                <p className="text-xs text-slate-400 mt-0.5">Filter telemetry from 90 days historical data up to live activity</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[
                  { label: '1 Day', hours: 24, short: '24h' },
                  { label: '3 Days', hours: 72, short: '3d' },
                  { label: '1 Week', hours: 168, short: '7d' },
                  { label: '2 Weeks', hours: 336, short: '14d' },
                  { label: '30 Days', hours: 720, short: '30d' },
                  { label: '90 Days', hours: 2160, short: '90d' },
                ].map((item) => (
                  <button
                    key={item.hours}
                    onClick={() => {
                      setTimeframeHours(item.hours);
                      setApiLogsPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      timeframeHours === item.hours
                        ? 'bg-[#31A895] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Feature / Target Quick Filter Strip */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Target API & Feature</span>
                <p className="text-xs text-slate-400 mt-0.5">Isolate generative AI designs, visual sourcing, billing, or user auth</p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All APIs' },
                  { id: 'generation', label: 'AI Generation', highlight: true },
                  { id: 'sourcing', label: 'AI Sourcing' },
                  { id: 'payment', label: 'Payments & Credits' },
                  { id: 'auth', label: 'Users & Auth' },
                  { id: 'admin', label: 'Admin & Ops' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setApiSelectedFeature(f.id as any);
                      setApiLogsPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                      apiSelectedFeature === f.id
                        ? f.id === 'generation'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-[#31A895] text-white border-[#31A895] shadow-sm'
                        : f.id === 'generation'
                        ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{f.label}</span>
                    {f.id === 'generation' && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        apiSelectedFeature === 'generation' ? 'bg-purple-700 text-white' : 'bg-purple-200 text-purple-800'
                      }`}>
                        Target
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active User Filter Chip if user is selected */}
          {apiUserFilter && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs">
              <div className="flex items-center gap-2 text-purple-900">
                <span className="font-bold">Filtering logs for user:</span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-purple-200">{apiUserFilter.email}</span>
              </div>
              <button
                onClick={() => {
                  setApiUserFilter(null);
                  setApiLogsPage(1);
                }}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 underline"
              >
                Clear user filter ✕
              </button>
            </div>
          )}

          {/* Summary KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title={apiSelectedFeature === 'generation' ? "TOTAL GENERATION CALLS" : "TOTAL REQUESTS"}
              value={apiLogsTotal.toLocaleString()}
              subtitle={`Recorded in last ${timeframeHours >= 24 ? `${timeframeHours / 24} days` : `${timeframeHours} hrs`}`}
              iconSrc="/icon-telemetry.svg"
              valueColor={apiSelectedFeature === 'generation' ? "text-purple-600" : "text-slate-900"}
            />
            <StatCard
              title="AVERAGE LATENCY"
              value={formatLatency(apiSummary?.avgLatencyMs || 0)}
              subtitle={
                (apiSummary?.avgLatencyMs || 0) < 500
                  ? "Fast execution (<500ms)"
                  : (apiSummary?.avgLatencyMs || 0) > 3000
                  ? "Heavy model inference"
                  : "Normal response pipeline"
              }
              iconSrc="/icon-check.svg"
              valueColor={(apiSummary?.avgLatencyMs || 0) > 3000 ? "text-amber-600" : "text-[#1ECB7F]"}
            />
            <StatCard
              title="SUCCESS RATE"
              value={`${apiSummary && apiLogsTotal > 0 ? (((apiSummary.successCount || 0) / apiLogsTotal) * 100).toFixed(1) : 100}%`}
              subtitle={`${apiSummary?.successCount || 0} successful / ${apiSummary?.clientErrorCount || 0} client errors`}
              iconSrc="/icon-check.svg"
              valueColor="text-[#1ECB7F]"
            />
            <StatCard
              title="ACTIVE CONSUMERS"
              value={apiSummary?.topUsers?.length ? `${apiSummary.topUsers.length} users` : "0 users"}
              subtitle={apiSelectedFeature === 'generation' ? "Generated AI interiors" : "Unique authenticated accounts"}
              iconSrc="/icon-users.svg"
              valueColor="text-[#0E5FBF]"
            />
          </div>

          {/* Leaderboard: Who used this feature? (Especially AI Generation) */}
          {apiSummary?.topUsers && apiSummary.topUsers.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
                    {apiSelectedFeature === 'generation' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {apiSelectedFeature === 'generation'
                        ? 'Top Users Who Used AI Generation'
                        : `Top Account Consumers (${apiSelectedFeature === 'all' ? 'All Endpoints' : apiSelectedFeature})`}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Identifies which accounts made the highest number of calls and their speed
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-400">
                  {apiSummary.topUsers.length} accounts ranked
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {apiSummary.topUsers.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      apiUserFilter?.id === item.user?._id
                        ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {item.user?.email ? item.user.email.charAt(0) : 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate" title={item.user?.email || 'Guest'}>
                            {item.user?.email || 'Anonymous / Guest'}
                          </p>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            item.user?.role === 'founder'
                              ? 'bg-amber-100 text-amber-800'
                              : item.user?.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.user?.role || 'user'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-extrabold text-slate-900 block">
                          {item.count} <span className="text-[10px] font-normal text-slate-500">calls</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          ~{formatLatency(item.avgLatencyMs)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-500">
                        {apiSelectedFeature === 'generation' ? 'Generation calls' : 'API usage'}
                      </span>
                      {item.user?._id && (
                        <button
                          onClick={() => {
                            if (apiUserFilter?.id === item.user._id) {
                              setApiUserFilter(null);
                            } else {
                              setApiUserFilter({ id: item.user._id, email: item.user.email });
                            }
                            setApiLogsPage(1);
                          }}
                          className="text-[11px] font-semibold text-[#31A895] hover:underline"
                        >
                          {apiUserFilter?.id === item.user._id ? 'Clear' : 'Filter User ➔'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search, Status & Route Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by user email or endpoint route..."
                  value={apiSearchQuery}
                  onChange={(e) => setApiSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={apiStatusCodeFilter}
                  onChange={(e) => {
                    setApiStatusCodeFilter(e.target.value);
                    setApiLogsPage(1);
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895]"
                >
                  <option value="all">All HTTP Statuses</option>
                  <option value="2xx">2xx (Success)</option>
                  <option value="4xx">4xx (Client Errors)</option>
                  <option value="5xx">5xx (Server Errors)</option>
                </select>

                <button
                  onClick={() => {
                    setApiSelectedFeature('all');
                    setApiSearchQuery('');
                    setApiStatusCodeFilter('all');
                    setApiRouteFilter('');
                    setApiUserFilter(null);
                    setApiLogsPage(1);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Reset Filters
                </button>

                <button
                  onClick={() => fetchDetailedApiLogs()}
                  className="px-3 py-2 text-xs font-semibold text-[#31A895] border border-[#31A895] hover:bg-[#E8F5F3] rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Request Audit Log Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Detailed API Request Audit Logs
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time log stream with user identities, endpoints, latency execution, and status
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {apiLogsTotal.toLocaleString()} calls recorded
              </span>
            </div>

            {apiLogsError && (
              <div className="p-4 text-xs text-[#FF5A6E] bg-red-50 border-b border-red-100">
                {apiLogsError}
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3">TIMESTAMP</th>
                    <th className="px-5 py-3">USER ACCOUNT</th>
                    <th className="px-5 py-3">FEATURE</th>
                    <th className="px-5 py-3">METHOD & ROUTE</th>
                    <th className="px-5 py-3">STATUS</th>
                    <th className="px-5 py-3">LATENCY</th>
                    <th className="px-5 py-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {apiLogsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                        Loading detailed API telemetry logs...
                      </td>
                    </tr>
                  ) : apiLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                        No API logs match the selected timeframe and filters.
                      </td>
                    </tr>
                  ) : (
                    apiLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-medium text-slate-800 block text-xs">
                            {formatLogDate(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {formatTimeAgo(log.timestamp)}
                          </span>
                        </td>

                        {/* 2. User */}
                        <td className="px-5 py-3.5">
                          {log.userId ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                                {log.userId.email ? log.userId.email.charAt(0) : 'U'}
                              </div>
                              <div className="min-w-0 max-w-[180px]">
                                <span className="font-semibold text-slate-900 truncate block text-xs" title={log.userId.email}>
                                  {log.userId.email}
                                </span>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  log.userId.role === 'founder'
                                    ? 'bg-amber-100 text-amber-800'
                                    : log.userId.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {log.userId.role || 'user'}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Guest / Anonymous
                            </span>
                          )}
                        </td>

                        {/* 3. Feature */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getFeatureBadge(log.route)}
                        </td>

                        {/* 4. Method & Route */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {getMethodBadge(log.method)}
                            <span className="font-mono text-xs text-slate-800 truncate max-w-[220px]" title={log.route}>
                              {log.route}
                            </span>
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getStatusCodeBadge(log.statusCode)}
                        </td>

                        {/* 6. Latency */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`font-mono font-bold text-xs ${
                            log.latencyMs > 3000 ? 'text-amber-600' : 'text-slate-800'
                          }`}>
                            {formatLatency(log.latencyMs)}
                          </span>
                        </td>

                        {/* 7. Action */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setInspectApiLog(log)}
                            className="px-2.5 py-1 text-xs font-semibold text-[#31A895] hover:bg-[#E8F5F3] rounded-md transition-colors"
                          >
                            Inspect ➔
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {apiLogsTotalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Showing page <span className="font-bold text-slate-800">{apiLogsPage}</span> of{' '}
                  <span className="font-bold text-slate-800">{apiLogsTotalPages}</span> ({apiLogsTotal} total records)
                </span>
                <div className="flex items-center gap-1.5 self-center sm:self-auto">
                  <button
                    onClick={() => setApiLogsPage((prev) => Math.max(prev - 1, 1))}
                    disabled={apiLogsPage <= 1 || apiLogsLoading}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 font-bold text-slate-800">
                    {apiLogsPage} / {apiLogsTotalPages}
                  </span>
                  <button
                    onClick={() => setApiLogsPage((prev) => Math.min(prev + 1, apiLogsTotalPages))}
                    disabled={apiLogsPage >= apiLogsTotalPages || apiLogsLoading}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Aggregated Endpoint Performance Summary */}
          {telemetry && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Endpoint Latency & Volume Overview
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Aggregated average and maximum execution times across top endpoints
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {telemetry.routePerformance.length} routes recorded
                </span>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3">ROUTE ENDPOINT</th>
                      <th className="px-6 py-3">TOTAL CALLS</th>
                      <th className="px-6 py-3">AVG LATENCY</th>
                      <th className="px-6 py-3">MAX LATENCY</th>
                      <th className="px-6 py-3">SPEED HEALTH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {telemetry.routePerformance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          No route metrics recorded for this duration
                        </td>
                      </tr>
                    ) : (
                      telemetry.routePerformance.map((route, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-3 font-mono text-xs text-slate-700">
                            {route.route}
                          </td>
                          <td className="px-6 py-3 font-semibold text-slate-800">
                            {route.totalCalls}
                          </td>
                          <td className="px-6 py-3 text-slate-600">
                            {route.avgLatencyMs} ms
                          </td>
                          <td className="px-6 py-3 text-slate-600">
                            {route.maxLatencyMs} ms
                          </td>
                          <td className="px-6 py-3">
                            <Badge
                              variant={
                                route.avgLatencyMs < 300
                                  ? 'success'
                                  : route.avgLatencyMs < 1000
                                  ? 'warning'
                                  : 'danger'
                              }
                            >
                              {route.avgLatencyMs < 300
                                ? 'Fast (<300ms)'
                                : route.avgLatencyMs < 1000
                                ? 'Moderate'
                                : 'Heavy Execution'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Sourcing Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {metricsError && (
            <div className="p-4 text-sm text-[#FF5A6E] bg-red-50 border border-red-100 rounded-xl">
              {metricsError}
            </div>
          )}

          {loadingMetrics && !metrics ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading sourcing analytics metrics...
            </div>
          ) : metrics ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="30-DAY VISUAL SEARCHES"
                  value={metrics.totalSearches}
                  iconSrc="/icon-radar.svg"
                />
                <StatCard
                  title="AI GUARD REJECTION RATE"
                  value={`${metrics.rejectionRatePercent}%`}
                  iconSrc="/icon-close.svg"
                  valueColor="text-[#FF5A6E]"
                />
                <StatCard
                  title="AVG ROUNDTRIP LATENCY"
                  value={`${metrics.latencyBreakdown.avgTotalRoundtripMs} ms`}
                  iconSrc="/icon-clock.svg"
                  valueColor="text-[#31A895]"
                />
              </div>

              {/* Latency Pipeline Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-2">
                  AI Pipeline Latency Breakdown
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Multi-stage analysis between Gemini Vision classification and Render DINOv2 vector search
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Gemini Vision Guard & Detect
                    </span>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {metrics.latencyBreakdown.avgGeminiVisionMs} ms
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 uppercase">
                      Render DINOv2 Vector Search
                    </span>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      {metrics.latencyBreakdown.avgRenderDinoSearchMs} ms
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-xs font-semibold text-emerald-800 uppercase">
                      Total Execution Pipeline
                    </span>
                    <p className="text-xl font-bold text-emerald-700 mt-1">
                      {metrics.latencyBreakdown.avgTotalRoundtripMs} ms
                    </p>
                  </div>
                </div>
              </div>

              {/* Matching Quality Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  AI Match Accuracy & Quality (30 Days)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {(['good', 'moderate', 'poor', 'none', 'rejected'] as const).map((q) => {
                    const count = metrics.qualityBreakdown.counts[q] || 0;
                    const pct = metrics.qualityBreakdown.percentages[q] || 0;
                    return (
                      <div
                        key={q}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between">
                          <span className="capitalize text-sm font-semibold text-slate-700">
                            {q}
                          </span>
                          {getQualityBadge(q)}
                        </div>
                        <div className="mt-3">
                          <span className="text-2xl font-bold text-slate-900">{count}</span>
                          <span className="text-xs text-slate-500 ml-1.5">({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full ${
                              q === 'good'
                                ? 'bg-[#1ECB7F]'
                                : q === 'moderate'
                                ? 'bg-[#31A895]'
                                : q === 'poor'
                                ? 'bg-yellow-400'
                                : q === 'rejected'
                                ? 'bg-[#FF5A6E]'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Categories Demanded & Retailer Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900 mb-4">
                    Top Searched Furniture Categories
                  </h3>
                  <div className="space-y-3">
                    {metrics.topCategories.length === 0 ? (
                      <p className="text-sm text-slate-400">No category demand data yet</p>
                    ) : (
                      metrics.topCategories.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <div>
                            <span className="font-semibold text-sm text-slate-800 capitalize">
                              {c.category}
                            </span>
                            <p className="text-xs text-slate-400">
                              Avg similarity: {(c.avgSimilarityScore * 100).toFixed(1)}%
                            </p>
                          </div>
                          <span className="text-sm font-bold text-slate-700">
                            {c.searchCount} searches
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Retailers */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900 mb-4">
                    Matched Retailers / Stores
                  </h3>
                  <div className="space-y-3">
                    {metrics.retailerDistribution.length === 0 ? (
                      <p className="text-sm text-slate-400">No retailer distribution data yet</p>
                    ) : (
                      metrics.retailerDistribution.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          <span className="font-semibold text-sm text-slate-800">
                            {r.store}
                          </span>
                          <span className="text-sm font-bold text-[#31A895]">
                            {r.matchedCount} items matched
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 3: Search Audit Logs */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Quality Filter */}
            <select
              value={selectedQuality}
              onChange={(e) => {
                setSelectedQuality(e.target.value);
                setLogsPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
            >
              <option value="all">All Qualities</option>
              <option value="good">Good Match</option>
              <option value="moderate">Moderate Match</option>
              <option value="poor">Poor Match</option>
              <option value="none">No Match</option>
              <option value="rejected">AI Rejected</option>
            </select>

            {/* Validity Filter */}
            <select
              value={selectedValid}
              onChange={(e) => {
                setSelectedValid(e.target.value);
                setLogsPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
            >
              <option value="all">All Interiors</option>
              <option value="valid">Valid Interior</option>
              <option value="invalid">Invalid Interior</option>
            </select>

            {/* Category Search */}
            <input
              type="text"
              placeholder="Filter by category..."
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setLogsPage(1);
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895] min-w-[200px]"
            />

            <span className="text-xs text-slate-500 ml-auto">
              Total {logsTotal} audit records
            </span>
          </div>

          {logsError && (
            <div className="p-4 text-sm text-[#FF5A6E] bg-red-50 border border-red-100 rounded-xl">
              {logsError}
            </div>
          )}

          {/* Logs Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left min-w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-6 py-3">Image</th>
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Detected Category</th>
                  <th className="px-6 py-3">Quality</th>
                  <th className="px-6 py-3">Top Score</th>
                  <th className="px-6 py-3">Latency</th>
                  <th className="px-6 py-3">Matches</th>
                  <th className="px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.length === 0 && !loadingLogs ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No search audit logs found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 flex-shrink-0">
                          <img
                            src={log.imageUrl}
                            alt="Search query"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-700">
                        {log.userId?.email || 'Anonymous'}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        <span className="font-medium text-slate-800 capitalize">
                          {log.primaryCategory || 'General Interior'}
                        </span>
                        {log.detectedCategories?.length > 0 && (
                          <span className="block text-[10px] text-slate-400">
                            {log.detectedCategories.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">{getQualityBadge(log.quality)}</td>
                      <td className="px-6 py-3 text-xs font-semibold text-slate-800">
                        {log.topScore ? `${(log.topScore * 100).toFixed(1)}%` : '0%'}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-500 font-mono">
                        {log.latency?.totalMs ? `${log.latency.totalMs}ms` : 'N/A'}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        <span className="font-semibold text-slate-800">
                          {log.results?.length || 0}
                        </span>{' '}
                        items
                      </td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="px-3 py-1 bg-[#31A895] text-white text-xs font-medium rounded-md hover:bg-[#289076] transition-colors"
                        >
                          Drilldown
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {logsTotalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-slate-500">
                Page {logsPage} of {logsTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={logsPage <= 1}
                  onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={logsPage >= logsTotalPages}
                  onClick={() => setLogsPage((p) => p + 1)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Product Catalog & Vector Database Audit */}
      {activeTab === 'catalog' && (
        <CatalogProductsTab
          onTotalChange={setCatalogCount}
          initialTotal={catalogCount ?? undefined}
        />
      )}

      {/* Drilldown Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Search Audit Drilldown</h2>
                <p className="text-xs text-slate-400 mt-1">ID: {inspectLog._id}</p>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Query Image & AI Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                  Query Image
                </span>
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video">
                  <img
                    src={inspectLog.imageUrl}
                    alt="Query"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase block">
                  AI Guard & Categorization
                </span>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Quality</span>
                  {getQualityBadge(inspectLog.quality)}
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Interior Valid</span>
                  <span className={inspectLog.isValidInterior ? 'text-green-600' : 'text-red-500'}>
                    {inspectLog.isValidInterior ? 'Yes' : 'Rejected'}
                  </span>
                </div>
                {inspectLog.rejectionReason && (
                  <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100">
                    <strong>Rejection Reason:</strong> {inspectLog.rejectionReason}
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Primary Category</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {inspectLog.primaryCategory || 'None'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 py-1.5">
                  <span className="text-slate-500">Latency</span>
                  <span className="font-mono text-xs text-slate-700">
                    Gemini: {inspectLog.latency?.geminiMs}ms | DINO: {inspectLog.latency?.dinoMs}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Description */}
            {inspectLog.visualDescription && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <strong>Visual Description:</strong> {inspectLog.visualDescription}
              </div>
            )}

            {/* Matched Products */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">
                Matched Catalog Products ({inspectLog.results?.length || 0})
              </h3>
              {(!inspectLog.results || inspectLog.results.length === 0) ? (
                <p className="text-xs text-slate-400">No matched products found for this search.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {inspectLog.results.map((product: SearchResultItem, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 border border-slate-200 rounded-xl flex gap-3 items-center bg-slate-50/50"
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.title || 'Product'}
                          className="w-14 h-14 rounded-lg object-cover bg-white border border-slate-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-semibold text-slate-900 truncate">
                          {product.title || 'Untitled Product'}
                        </p>
                        <p className="text-slate-500">
                          {product.store_name} • {product.price_egp ? `${product.price_egp} EGP` : 'Price on req'}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-[10px] text-emerald-600 font-bold">
                            Score: {product.score ? `${(product.score * 100).toFixed(1)}%` : 'N/A'}
                          </span>
                          {product.product_url && (
                            <a
                              href={product.product_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#31A895] hover:underline text-[10px] font-medium"
                            >
                              Store Link ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectLog(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Log Diagnostic Inspection Modal */}
      {inspectApiLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#31A895]"></span>
                  <h2 className="text-lg font-bold text-slate-900">API Call Diagnostic Inspection</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">Trace ID: {inspectApiLog._id}</p>
              </div>
              <button
                onClick={() => setInspectApiLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">HTTP Method & Status</span>
                <div className="flex items-center gap-2 mt-1">
                  {getMethodBadge(inspectApiLog.method)}
                  {getStatusCodeBadge(inspectApiLog.statusCode)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Execution Latency</span>
                <span className="text-sm font-extrabold text-slate-900 font-mono mt-1 block">
                  {inspectApiLog.latencyMs.toLocaleString()} ms ({formatLatency(inspectApiLog.latencyMs)})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Classified Feature</span>
                <div className="mt-1">
                  {getFeatureBadge(inspectApiLog.route)}
                </div>
              </div>
            </div>

            {/* Endpoint Route */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Endpoint Path</span>
              <p className="font-mono text-xs text-slate-900 font-bold break-all select-all">
                {inspectApiLog.route}
              </p>
            </div>

            {/* User Account Details */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Caller Identity</span>
                {inspectApiLog.userId ? (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    inspectApiLog.userId.role === 'founder'
                      ? 'bg-amber-100 text-amber-800'
                      : inspectApiLog.userId.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {inspectApiLog.userId.role || 'user'}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Public / Unauthenticated</span>
                )}
              </div>

              {inspectApiLog.userId ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Email Address:</span>
                    <span className="font-semibold text-slate-900 select-all">{inspectApiLog.userId.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">User ID:</span>
                    <span className="font-mono text-slate-700 select-all">{inspectApiLog.userId._id}</span>
                  </div>
                  {inspectApiLog.userId.name && (
                    <div>
                      <span className="text-slate-400 block">Full Name:</span>
                      <span className="font-semibold text-slate-900">{inspectApiLog.userId.name}</span>
                    </div>
                  )}
                  {inspectApiLog.userId.status && (
                    <div>
                      <span className="text-slate-400 block">Account Status:</span>
                      <span className="font-medium text-emerald-600 capitalize">{inspectApiLog.userId.status}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  This call was executed without an active authentication session (guest endpoint or public asset request).
                </p>
              )}
            </div>

            {/* Timestamp */}
            <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-100 pt-3">
              <span>Timestamp: <strong className="text-slate-700 font-mono">{formatLogDate(inspectApiLog.timestamp)}</strong></span>
              <span className="font-mono text-slate-400">{inspectApiLog.timestamp}</span>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setInspectApiLog(null)}
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
