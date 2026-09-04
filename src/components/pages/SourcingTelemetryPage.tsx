'use client';

import React, { useState, useEffect } from 'react';
import StatCard from '@/components/common/StatCard';
import Badge from '@/components/common/Badge';
import {
  getApiTelemetryOverview,
  getSourcingQualityMetrics,
  getDetailedSourcingLogs,
} from '@/lib/api';
import {
  ApiTelemetryOverview,
  SourcingQualityMetrics,
  SourcingSearchLog,
  SearchResultItem,
} from '@/types';

type ActiveTab = 'telemetry' | 'analytics' | 'logs';

export default function SourcingTelemetryPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');

  // Tab 1: API Telemetry State
  const [telemetry, setTelemetry] = useState<ApiTelemetryOverview | null>(null);
  const [timeframeHours, setTimeframeHours] = useState(24);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

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
    }
  }, [timeframeHours]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [logsPage, selectedQuality, selectedValid, selectedCategory]);

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
        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
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
        </div>
      </div>

      {/* TAB 1: API Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Timeframe Window</span>
            <div className="flex items-center gap-2">
              {[6, 12, 24, 48, 168].map((hours) => (
                <button
                  key={hours}
                  onClick={() => setTimeframeHours(hours)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timeframeHours === hours
                      ? 'bg-[#31A895] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {hours >= 24 ? `${hours / 24}d` : `${hours}h`}
                </button>
              ))}
            </div>
          </div>

          {telemetryError && (
            <div className="p-4 text-sm text-[#FF5A6E] bg-red-50 border border-red-100 rounded-xl">
              {telemetryError}
            </div>
          )}

          {loadingTelemetry && !telemetry ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Loading API telemetry data...
            </div>
          ) : telemetry ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="TOTAL API CALLS"
                  value={telemetry.totalRequests}
                  iconSrc="/icon-telemetry.svg"
                />
                <StatCard
                  title="ERROR RATE"
                  value={`${telemetry.errorRatePercent}%`}
                  iconSrc="/icon-close.svg"
                  valueColor={
                    telemetry.errorRatePercent > 5 ? 'text-[#FF5A6E]' : 'text-[#1ECB7F]'
                  }
                />
                <StatCard
                  title="TIMEFRAME"
                  value={telemetry.timeframe}
                  iconSrc="/icon-check.svg"
                />
              </div>

              {/* Status Code Distribution */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  HTTP Status Distribution
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {['2xx', '4xx', '5xx'].map((prefix) => {
                    const found = telemetry.statusDistribution.find((s) => s._id === prefix);
                    const count = found ? found.count : 0;
                    const percent =
                      telemetry.totalRequests > 0
                        ? ((count / telemetry.totalRequests) * 100).toFixed(1)
                        : '0';

                    let colorClass = 'text-[#1ECB7F] bg-green-50 border-green-200';
                    if (prefix === '4xx') colorClass = 'text-yellow-700 bg-yellow-50 border-yellow-200';
                    if (prefix === '5xx') colorClass = 'text-[#FF5A6E] bg-red-50 border-red-200';

                    return (
                      <div
                        key={prefix}
                        className={`p-4 rounded-xl border ${colorClass} flex flex-col justify-between`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm">{prefix} Responses</span>
                          <span className="text-xs font-semibold">{percent}%</span>
                        </div>
                        <p className="text-2xl font-extrabold mt-2">{count}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Route Performance Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Endpoint Latency & Volume
                  </h3>
                  <span className="text-xs text-slate-400">
                    {telemetry.routePerformance.length} routes recorded
                  </span>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-6 py-3">Route Endpoint</th>
                      <th className="px-6 py-3">Total Calls</th>
                      <th className="px-6 py-3">Avg Latency</th>
                      <th className="px-6 py-3">Max Latency</th>
                      <th className="px-6 py-3">Latency Health</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {telemetry.routePerformance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                          No route metrics available for this timeframe
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
                                : 'High Latency'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
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
            <table className="w-full text-left">
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
    </div>
  );
}
