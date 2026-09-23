'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Badge from '@/components/common/Badge';
import {
  getSourcingCatalogProducts,
  triggerLinkAudit,
  getLinkAuditStatus,
  stopLinkAudit,
} from '@/lib/api';
import { CatalogProduct, CatalogProductsResponse, LinkAuditStatus, AuditLogEntry } from '@/types';


const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'chair', label: 'Chairs & Armchairs' },
  { value: 'sofa', label: 'Sofas & Couches' },
  { value: 'table', label: 'Tables & Desks' },
  { value: 'bed', label: 'Beds & Headboards' },
  { value: 'storage', label: 'Storage & Cabinets' },
  { value: 'lighting', label: 'Lighting & Lamps' },
  { value: 'decor', label: 'Decor & Accessories' },
  { value: 'rug', label: 'Rugs & Carpets' },
  { value: 'curtains', label: 'Curtains & Fabrics' },
];

const STORES = [
  { value: 'all', label: 'All Retailers' },
  { value: 'Homzmart', label: 'Homzmart' },
  { value: 'Chic Homz', label: 'Chic Homz' },
  { value: 'Manzzeli', label: 'Manzzeli' },
  { value: 'Hub Furniture', label: 'Hub Furniture' },
  { value: 'IKEA', label: 'IKEA' },
];

const MISSING_FILTERS = [
  { value: 'all', label: 'All Products (No Filter)' },
  { value: 'any', label: '⚠️ Any Missing Attribute' },
  { value: 'image', label: '🖼️ Missing Image' },
  { value: 'link', label: '🔗 Missing Store Link' },
  { value: 'title', label: '🏷️ Missing Title' },
  { value: 'price', label: '💰 Missing Price' },
  { value: 'category', label: '📦 Missing Category' },
  { value: 'store', label: '🏪 Missing Store Name' },
  { value: 'none', label: '✅ Complete (Zero Missing Attributes)' },
];

interface CatalogProductsTabProps {
  onTotalChange?: (total: number) => void;
  initialTotal?: number;
}

export default function CatalogProductsTab({ onTotalChange, initialTotal }: CatalogProductsTabProps = {}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(24);
  const [total, setTotal] = useState<number>(initialTotal || 0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [jumpPage, setJumpPage] = useState<string>('');

  // Filter States
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('all');
  const [storeName, setStoreName] = useState<string>('all');
  const [missingFilter, setMissingFilter] = useState<string>('all');
  const [inStockFilter, setInStockFilter] = useState<string>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // UI States
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Link Verification & Purge States
  const [showAuditConfirmModal, setShowAuditConfirmModal] = useState<boolean>(false);
  const [auditScope, setAuditScope] = useState<'page' | 'batch' | 'all'>('page');
  const [auditMode, setAuditMode] = useState<'stale' | 'deep'>('stale');
  const [speedMode, setSpeedMode] = useState<'normal' | 'fast' | 'turbo'>('fast');
  const [auditBatchLimit, setAuditBatchLimit] = useState<number>(50);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [auditStatus, setAuditStatus] = useState<LinkAuditStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditSummaryModal, setShowAuditSummaryModal] = useState<boolean>(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditStartTime, setAuditStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [finalDurationText, setFinalDurationText] = useState<string>('');

  const logsEndRef = React.useRef<HTMLDivElement>(null);

  const formatTime = (totalSec: number): string => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${secs}s`;
  };

  const getPreciseDuration = (startMs: number, endMs: number): string => {
    const ms = Math.max(0, endMs - startMs);
    const sec = (ms / 1000).toFixed(1);
    if (ms >= 60000) {
      const mins = Math.floor(ms / 60000);
      const remainingSec = Math.floor((ms % 60000) / 1000);
      return `${mins}m ${remainingSec}s (${sec}s)`;
    }
    return `${sec}s`;
  };

  // Live timer interval while audit is running
  useEffect(() => {
    if (!isAuditing || !auditStartTime) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - auditStartTime) / 1000));
    }, 200);

    return () => clearInterval(timer);
  }, [isAuditing, auditStartTime]);

  // Auto-scroll logs terminal
  useEffect(() => {
    if (isAuditing && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [auditLogs, isAuditing]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Parameters<typeof getSourcingCatalogProducts>[0] = {
        page,
        limit,
        category: category !== 'all' ? category : undefined,
        storeName: storeName !== 'all' ? storeName : undefined,
        missing: missingFilter !== 'all' ? missingFilter : undefined,
        search: search.trim() || undefined,
      };

      if (inStockFilter === 'true') params.inStock = true;
      else if (inStockFilter === 'false') params.inStock = false;

      if (minPrice && !isNaN(Number(minPrice))) params.minPrice = Number(minPrice);
      if (maxPrice && !isNaN(Number(maxPrice))) params.maxPrice = Number(maxPrice);

      const data = await getSourcingCatalogProducts(params);

      const newTotal = data.pagination?.total ?? 0;
      setProducts(data.products || []);
      setTotal(newTotal);
      setTotalPages(data.pagination?.totalPages || (newTotal > 0 ? Math.ceil(newTotal / limit) : 1));
      if (onTotalChange && newTotal > 0) {
        onTotalChange(newTotal);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch catalog products';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, category, storeName, missingFilter, inStockFilter, minPrice, maxPrice, search, onTotalChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // Check if background audit is running on mount
  useEffect(() => {
    let isMounted = true;
    getLinkAuditStatus().then((status) => {
      if (isMounted && status?.isRunning) {
        setIsAuditing(true);
        setActiveJobId(status.jobId || null);
        setAuditStatus(status);
        if (status.recentLogs && status.recentLogs.length > 0) {
          setAuditLogs(status.recentLogs);
        }
        if (status.startedAt) {
          setAuditStartTime(new Date(status.startedAt).getTime());
        }
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Polling loop when background audit is running
  useEffect(() => {
    if (!isAuditing) return;

    const interval = setInterval(async () => {
      try {
        const status = await getLinkAuditStatus();

        // Guard against premature completion: ignore if status is idle or irrelevant
        if (status.scope === 'idle' && !status.jobId && isAuditing) {
          return;
        }

        setAuditStatus(status);

        if (status.recentLogs && status.recentLogs.length > 0) {
          setAuditLogs(status.recentLogs);
        }

        // Only complete if this status belongs to active job OR finishedAt/step is marked
        const isJobComplete =
          !status.isRunning &&
          (
            status.step === 'completed' ||
            status.step === 'cancelled' ||
            status.step === 'error' ||
            status.finishedAt !== null ||
            (activeJobId && status.jobId === activeJobId) ||
            (status.totalChecked > 0 && status.progressPercent === 100)
          );

        if (isJobComplete) {
          setIsAuditing(false);
          const endMs = Date.now();
          const durationStr = status.durationText || (auditStartTime ? getPreciseDuration(auditStartTime, endMs) : '');
          setFinalDurationText(durationStr);
          setShowAuditSummaryModal(true);
          fetchProducts();
        }
      } catch (err) {
        console.error('Failed to poll audit status:', err);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [isAuditing, fetchProducts, auditStartTime, activeJobId]);

  const handleStartAudit = async () => {
    setShowAuditConfirmModal(false);
    setIsAuditing(true);
    setAuditError(null);
    const startMs = Date.now();
    setAuditStartTime(startMs);
    setElapsedSeconds(0);
    setFinalDurationText('');
    setAuditLogs([
      {
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: `🚀 Initiating link audit job (Scope: ${auditScope})...`,
        type: 'info',
      },
    ]);

    try {
      const items = auditScope === 'page'
        ? products.map((p) => ({
            id: p.id,
            product_url: p.product_url || '',
          }))
        : undefined;

      const res = await triggerLinkAudit({
        scope: auditScope,
        limit: auditScope === 'batch' ? auditBatchLimit : (auditScope === 'all' ? 100000 : undefined),
        speedMode,
        auditMode,
        items,
      });

      if (res?.jobId) {
        setActiveJobId(res.jobId);
      }
      if (res?.recentLogs && res.recentLogs.length > 0) {
        setAuditLogs(res.recentLogs);
      }

      setAuditStatus(res);

      // If backend finished immediately or fallback returned completed
      if (!res.isRunning) {
        setIsAuditing(false);
        const endMs = Date.now();
        const durationStr = res.durationText || getPreciseDuration(startMs, endMs);
        setFinalDurationText(durationStr);
        setShowAuditSummaryModal(true);
        fetchProducts();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Audit failed to start';
      setAuditError(msg);
      setIsAuditing(false);
    }
  };

  const handleStopAudit = async () => {
    try {
      const res = await stopLinkAudit();
      setAuditStatus(res);
      setIsAuditing(false);
    } catch (err) {
      console.error('Failed to stop audit:', err);
    }
  };


  // Reset to page 1 whenever filters change
  const handleFilterChange = (setter: (val: any) => void, value: any) => {
    setter(value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('all');
    setStoreName('all');
    setMissingFilter('all');
    setInStockFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setPage(1);
  };

  const copyToClipboard = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleImageError = (productId: string) => {
    setBrokenImages((prev) => ({ ...prev, [productId]: true }));
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = Number(jumpPage);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
      setJumpPage('');
    }
  };

  const formatPrice = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(Number(val)) || Number(val) <= 0) {
      return null;
    }
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(Number(val));
  };

  // Compute live statistics of current view
  const currentMissingStats = useMemo(() => {
    let missingImg = 0;
    let missingLnk = 0;
    let missingTtl = 0;
    let missingPrc = 0;
    let missingCat = 0;
    let missingStr = 0;
    let complete = 0;

    products.forEach((p) => {
      const isImgMissing = !p.image_url || brokenImages[p.id];
      if (isImgMissing) missingImg++;
      if (!p.product_url) missingLnk++;
      if (!p.title) missingTtl++;
      if (!p.price_egp || p.price_egp <= 0) missingPrc++;
      if (!p.category) missingCat++;
      if (!p.store_name) missingStr++;
      if (!isImgMissing && p.product_url && p.title && p.price_egp && p.price_egp > 0 && p.category && p.store_name) {
        complete++;
      }
    });

    return { missingImg, missingLnk, missingTtl, missingPrc, missingCat, missingStr, complete };
  }, [products, brokenImages]);

  return (
    <div className="space-y-6">
      {/* Link Verification & Auto-Purge Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-base font-bold flex items-center gap-2">
              <span className="text-lg">🧹</span>
              <span>Dead Link Auditor & Vector Purge</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Auto-Purge: Every Friday @ 12:00 PM (Cairo Time)
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Live audits test external retailer links (detecting 404s, redirects to homepage/error pages, and soft-404 unavailable pages) and <strong className="text-white">permanently delete dead items directly from the Qdrant vector database</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0">
          {isAuditing ? (
            <div className="flex items-center gap-2 bg-indigo-600/40 border border-indigo-500/60 rounded-xl px-4 py-2">
              <span className="animate-spin text-sm">↻</span>
              <span className="text-xs font-semibold text-indigo-200">
                Auditing ({auditStatus?.totalChecked || 0} checked)...
              </span>
              <button
                type="button"
                onClick={handleStopAudit}
                className="ml-2 px-2 py-0.5 bg-red-500 hover:bg-red-600 text-[11px] text-white rounded font-medium transition-colors"
              >
                Stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuditConfirmModal(true)}
              className="w-full md:w-auto px-4 py-2.5 bg-gradient-to-r from-[#31A895] to-[#258273] hover:from-[#2a9584] hover:to-[#1e6c60] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <span>🔍</span>
              <span>Verify & Purge Dead Links</span>
            </button>
          )}
        </div>
      </div>

      {auditError && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{auditError}</span>
          </span>
          <button
            type="button"
            onClick={() => setAuditError(null)}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Vector Audit Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Vector Items
          </span>
          <span className="text-xl font-bold text-slate-900 block mt-0.5">
            {loading && total === 0 ? '...' : total.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Qdrant furniture_catalog_small</span>
        </div>

        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
            Complete Items
          </span>
          <span className="text-xl font-bold text-emerald-700 block mt-0.5">
            {products.length > 0 ? `${currentMissingStats.complete}/${products.length}` : '—'}
          </span>
          <span className="text-[10px] text-emerald-600">All attributes present</span>
        </div>

        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">
            Missing Image
          </span>
          <span className="text-xl font-bold text-amber-700 block mt-0.5">
            {currentMissingStats.missingImg}
          </span>
          <span className="text-[10px] text-amber-600">In current page</span>
        </div>

        <div className="bg-red-50/60 border border-red-200/80 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-red-800 uppercase tracking-wider block">
            Missing Link
          </span>
          <span className="text-xl font-bold text-[#FF5A6E] block mt-0.5">
            {currentMissingStats.missingLnk}
          </span>
          <span className="text-[10px] text-red-500">No store URL</span>
        </div>

        <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">
            Missing Price
          </span>
          <span className="text-xl font-bold text-purple-700 block mt-0.5">
            {currentMissingStats.missingPrc}
          </span>
          <span className="text-[10px] text-purple-600">Zero or null EGP</span>
        </div>

        <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
            Vector Specs
          </span>
          <span className="text-xl font-bold text-[#0E5FBF] block mt-0.5">
            384-D
          </span>
          <span className="text-[10px] text-blue-600">DINOv2 • Cosine</span>
        </div>
      </div>

      {/* Main Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Search & Missing Attributes Selector */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search product title, retailer, category, or vector UUID..."
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent transition-all"
            />
            {search && (
              <button
                onClick={() => handleFilterChange(setSearch, '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Missing Attributes Filter (Highlighted) */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Audit Filter:
            </label>
            <select
              value={missingFilter}
              onChange={(e) => handleFilterChange(setMissingFilter, e.target.value)}
              className={`px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#31A895] transition-colors ${
                missingFilter !== 'all'
                  ? 'border-amber-400 bg-amber-50/50 text-amber-900 font-semibold'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {MISSING_FILTERS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Category, Store, In-Stock, Price Range */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 border-t border-slate-100">
          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => handleFilterChange(setCategory, e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Retailer Store */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Store / Retailer
            </label>
            <select
              value={storeName}
              onChange={(e) => handleFilterChange(setStoreName, e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
            >
              {STORES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Availability */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Stock Status
            </label>
            <select
              value={inStockFilter}
              onChange={(e) => handleFilterChange(setInStockFilter, e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
            >
              <option value="all">All Availability</option>
              <option value="true">In Stock Only</option>
              <option value="false">Out of Stock Only</option>
            </select>
          </div>

          {/* Min Price */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Min Price (EGP)
            </label>
            <input
              type="number"
              placeholder="0"
              value={minPrice}
              onChange={(e) => handleFilterChange(setMinPrice, e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
            />
          </div>

          {/* Max Price */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Max Price (EGP)
            </label>
            <input
              type="number"
              placeholder="50,000+"
              value={maxPrice}
              onChange={(e) => handleFilterChange(setMaxPrice, e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#31A895]"
            />
          </div>

          {/* Reset Action */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>↺</span>
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchProducts} className="underline font-semibold ml-3">
            Retry
          </button>
        </div>
      )}

      {/* Top Results Header & Page Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">
            Showing {products.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)}
          </span>
          <span>of {total.toLocaleString()} products</span>
          {missingFilter !== 'all' && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold text-[11px]">
              Filtered by: {MISSING_FILTERS.find((f) => f.value === missingFilter)?.label}
            </span>
          )}
        </div>

        {/* Page Size & Refresh */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span>Per Page:</span>
            {[12, 24, 48, 96].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setLimit(s);
                  setPage(1);
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  limit === s
                    ? 'bg-[#31A895] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={fetchProducts}
            disabled={loading}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* E-Commerce Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm animate-pulse space-y-3"
            >
              <div className="w-full h-48 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl">
            📦
          </div>
          <h3 className="text-base font-bold text-slate-800">No Catalog Products Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No items matched your current filter or search criteria in the vector database.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-[#31A895] text-white text-xs font-semibold rounded-lg hover:bg-[#288a7a] transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((product) => {
            const isBroken = brokenImages[product.id];
            const hasValidImage = Boolean(product.image_url && !isBroken);
            const formattedPrice = formatPrice(product.price_egp);
            const formattedOriginalPrice = formatPrice(product.original_price_egp);
            const hasDiscount =
              product.original_price_egp &&
              product.price_egp &&
              product.original_price_egp > product.price_egp;

            // Missing checklist
            const missingFlags: string[] = [];
            if (!hasValidImage) missingFlags.push('Missing Image');
            if (!product.product_url) missingFlags.push('Missing Link');
            if (!product.title) missingFlags.push('Missing Title');
            if (!formattedPrice) missingFlags.push('Missing Price');
            if (!product.category) missingFlags.push('Missing Category');
            if (!product.store_name) missingFlags.push('Missing Store');

            return (
              <div
                key={product.id}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  missingFlags.length > 0 ? 'border-amber-200/90' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Top: Media & Floating Badges */}
                <div className="relative w-full bg-slate-50 aspect-square overflow-hidden border-b border-slate-100 flex items-center justify-center">
                  {hasValidImage ? (
                    <img
                      src={product.image_url!}
                      alt={product.title || 'Product Image'}
                      onError={() => handleImageError(product.id)}
                      className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    /* Missing Image Phrase Card */
                    <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center bg-amber-50/30 border-2 border-dashed border-amber-300/80 m-2 rounded-xl">
                      <span className="text-3xl mb-1 text-amber-500">🖼️</span>
                      <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                        Missing Image
                      </span>
                      <span className="text-[10px] text-amber-600 mt-0.5">
                        Image URL not present or unreachable
                      </span>
                    </div>
                  )}

                  {/* Top Left Floating Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start max-w-[70%]">
                    {/* Category */}
                    {product.category ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs border border-slate-200 capitalize truncate">
                        {product.category}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                        ⚠️ Missing Category
                      </span>
                    )}

                    {/* Retailer Store */}
                    {product.store_name ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0E5FBF] text-white shadow-xs truncate">
                        {product.store_name}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                        ⚠️ Missing Store Name
                      </span>
                    )}
                  </div>

                  {/* Top Right: Stock Status */}
                  <div className="absolute top-2.5 right-2.5">
                    {product.in_stock === true ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        In Stock
                      </span>
                    ) : product.in_stock === false ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 border border-slate-300 shadow-xs">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-xs">
                        Stock Unknown
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: Content & Attributes */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Title */}
                    {product.title ? (
                      <h4
                        className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug"
                        title={product.title}
                      >
                        {product.title}
                      </h4>
                    ) : (
                      <div className="p-1.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Missing Title</span>
                      </div>
                    )}

                    {/* Price Block */}
                    <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
                      {formattedPrice ? (
                        <>
                          <span className="text-base font-extrabold text-[#31A895]">
                            {formattedPrice}
                          </span>
                          {hasDiscount && formattedOriginalPrice && (
                            <span className="text-xs text-slate-400 line-through">
                              {formattedOriginalPrice}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                          ⚠️ Missing Price
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attributes Checklist & Metadata */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    {/* Vector UUID */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="text-slate-400">Point ID:</span>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="truncate max-w-[120px]" title={product.id}>
                          {product.id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(product.id, `id-${product.id}`)}
                          className="hover:text-slate-900 text-[10px] p-0.5 text-slate-400"
                          title="Copy Vector UUID"
                        >
                          {copiedId === `id-${product.id}` ? '✓' : '📋'}
                        </button>
                      </div>
                    </div>

                    {/* Sync Date */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="text-slate-400">Vector Sync:</span>
                      <span className="font-mono text-[10px]">
                        {product.updated_at ? product.updated_at.split('T')[0] : 'Indexed'}
                      </span>
                    </div>

                    {/* Missing Attributes Alert Bar */}
                    {missingFlags.length > 0 ? (
                      <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-lg space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900 uppercase tracking-wider">
                          <span>⚠️ Attributes Audit ({missingFlags.length} Missing):</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {missingFlags.map((flag, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-white text-amber-800 border border-amber-300 rounded text-[9px] font-semibold"
                            >
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold flex items-center gap-1">
                        <span>✓</span>
                        <span>All attributes verified complete</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Action Links */}
                <div className="p-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                  {/* Store Link */}
                  {product.product_url ? (
                    <a
                      href={product.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-3 bg-[#31A895] hover:bg-[#288a7a] text-white text-xs font-semibold rounded-lg text-center shadow-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Visit Store</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ) : (
                    <div className="flex-1 py-1.5 px-2 bg-rose-50 border border-rose-200 text-[#CC2236] text-[11px] font-bold rounded-lg text-center">
                      ⚠️ Missing Store Link
                    </div>
                  )}

                  {/* Raw JSON Inspector */}
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-xs font-medium transition-colors"
                    title="View Raw Vector Attributes"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Page <strong className="text-slate-900">{page}</strong> of{' '}
              <strong className="text-slate-900">{totalPages.toLocaleString()}</strong>
            </span>
            <span>({total.toLocaleString()} total items)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Previous */}
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors"
            >
              ← Previous
            </button>

            {/* Quick jump input */}
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Go to:</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                placeholder={String(page)}
                className="w-14 px-2 py-1 border border-slate-200 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-[#31A895]"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-xs"
              >
                Go
              </button>
            </form>

            {/* Next */}
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3.5 py-1.5 bg-[#31A895] hover:bg-[#288a7a] text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors shadow-xs"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Raw Attribute Inspector Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            <div className="flex items-center justify-between p-5 pb-3 border-b border-slate-100 shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">Vector Point Attribute Inspector</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedProduct.id}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              {/* Attributes Checklist Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Attribute Audit Breakdown
                </span>
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Attribute Name</th>
                      <th className="p-2.5">Stored Value</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-2.5 font-medium text-slate-700">title</td>
                      <td className="p-2.5 text-slate-900 max-w-[250px] truncate">{selectedProduct.title || 'null'}</td>
                      <td className="p-2.5 text-right">
                        {selectedProduct.title ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Missing</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-700">image_url</td>
                      <td className="p-2.5 text-slate-900 max-w-[250px] truncate">{selectedProduct.image_url || 'null'}</td>
                      <td className="p-2.5 text-right">
                        {selectedProduct.image_url ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Missing</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-700">product_url</td>
                      <td className="p-2.5 text-slate-900 max-w-[250px] truncate">{selectedProduct.product_url || 'null'}</td>
                      <td className="p-2.5 text-right">
                        {selectedProduct.product_url ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Missing</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-700">price_egp</td>
                      <td className="p-2.5 text-slate-900">{selectedProduct.price_egp ? `${selectedProduct.price_egp} EGP` : 'null'}</td>
                      <td className="p-2.5 text-right">
                        {selectedProduct.price_egp ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Missing</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-700">category</td>
                      <td className="p-2.5 text-slate-900">{selectedProduct.category || 'null'}</td>
                      <td className="p-2.5 text-right">
                        {selectedProduct.category ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Missing</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-700">store_name</td>
                      <td className="p-2.5 text-slate-900">{selectedProduct.store_name || 'null'}</td>
                      <td className="p-2.5 text-right">
                        {selectedProduct.store_name ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Missing</Badge>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-slate-700">in_stock</td>
                      <td className="p-2.5 text-slate-900">{String(selectedProduct.in_stock)}</td>
                      <td className="p-2.5 text-right">
                        {selectedProduct.in_stock !== null ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Unknown</Badge>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Raw JSON View */}
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Raw Point JSON Payload
                </span>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(selectedProduct, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/90 rounded-b-2xl shrink-0">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Audit Confirmation & Scope Modal */}
      {showAuditConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-5 pb-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 text-xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Verify Links & Purge Dead Items</h3>
                  <p className="text-xs text-slate-500">Vector Database Cleanup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              {/* Permanent Purge Warning */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span>🚨</span>
                  <span>Permanent Vector Deletion Warning</span>
                </p>
                <p className="text-red-700 leading-relaxed">
                  Any product link returning <strong>404 Not Found</strong>, <strong>5xx Server Error</strong>, redirecting to a store homepage/404 page, or containing soft-404 unavailable notices will be <strong>permanently deleted directly from Qdrant vector database</strong> (<code className="font-mono text-[11px] bg-red-100 px-1 py-0.5 rounded">furniture_catalog_small</code>).
                </p>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Audit Scope:
                </label>

                <div className="space-y-2 text-xs">
                  {/* Option 1: Current Page */}
                  <label
                    onClick={() => setAuditScope('page')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      auditScope === 'page'
                        ? 'border-[#31A895] bg-[#31A895]/5 text-slate-900 ring-1 ring-[#31A895]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="auditScope"
                      checked={auditScope === 'page'}
                      onChange={() => setAuditScope('page')}
                      className="mt-0.5 text-[#31A895] focus:ring-[#31A895]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 block">
                        ⚡ Current Page ({products.length} Products) — Instant
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Verifies all items currently shown on page {page}. Finishes in ~3–5 seconds and updates the page immediately.
                      </span>
                    </div>
                  </label>

                  {/* Option 2: Custom Batch */}
                  <label
                    onClick={() => setAuditScope('batch')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      auditScope === 'batch'
                        ? 'border-[#31A895] bg-[#31A895]/5 text-slate-900 ring-1 ring-[#31A895]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="auditScope"
                      checked={auditScope === 'batch'}
                      onChange={() => setAuditScope('batch')}
                      className="mt-0.5 text-[#31A895] focus:ring-[#31A895]"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 block">
                        📦 Custom Batch Sample ({auditBatchLimit} Products)
                      </span>
                      <span className="text-[11px] text-slate-500 block mb-2">
                        Scrolls and audits the first {auditBatchLimit} products from the Qdrant vector database.
                      </span>
                      {auditScope === 'batch' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-600 font-medium">Batch Size:</span>
                          {[25, 50, 100].map((num) => (
                            <button
                              type="button"
                              key={num}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAuditBatchLimit(num);
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                auditBatchLimit === num
                                  ? 'bg-[#31A895] text-white'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </label>

                  {/* Option 3: Full Catalog */}
                  <label
                    onClick={() => setAuditScope('all')}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      auditScope === 'all'
                        ? 'border-[#31A895] bg-[#31A895]/5 text-slate-900 ring-1 ring-[#31A895]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="auditScope"
                      checked={auditScope === 'all'}
                      onChange={() => setAuditScope('all')}
                      className="mt-0.5 text-[#31A895] focus:ring-[#31A895]"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 block">
                        🌐 Full Catalog Audit ({total > 0 ? `${total.toLocaleString()} Products` : 'All Products'})
                      </span>
                      <span className="text-[11px] text-slate-500 block mb-2">
                        High-throughput rolling worker pool with retailer domain sharding and persistent connection pooling.
                      </span>

                      {auditScope === 'all' && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 space-y-3">
                          {/* Audit Mode Toggle */}
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 block mb-1">Audit Mode:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setAuditMode('stale'); }}
                                className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                                  auditMode === 'stale'
                                    ? 'border-[#31A895] bg-white ring-2 ring-[#31A895]/50 text-slate-900 shadow-xs'
                                    : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-white'
                                }`}
                              >
                                <span className="font-bold block text-[11px] text-[#31A895]">⚡ Smart Delta (~2–3 mins)</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  Verifies only unchecked products or links verified &gt;7 days ago. Recommended for routine cleanup.
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setAuditMode('deep'); }}
                                className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                                  auditMode === 'deep'
                                    ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/50 text-slate-900 shadow-xs'
                                    : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-white'
                                }`}
                              >
                                <span className="font-bold block text-[11px] text-indigo-600">🔥 Deep Full Scan (~18 mins)</span>
                                <span className="text-[10px] text-slate-500 block mt-0.5">
                                  Tests all {total > 0 ? `${(total / 1000).toFixed(1)}k` : 'catalog'} product links in the database from scratch.
                                </span>
                              </button>
                            </div>
                          </div>

                          {/* Speed Presets */}
                          <div>
                            <span className="text-[11px] font-bold text-slate-700 block mb-1">Checking Speed Preset:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[
                                { id: 'normal', label: '🐢 Normal (18 req/s)' },
                                { id: 'fast', label: '⚡ Fast (35 req/s • Render Free)' },
                                { id: 'turbo', label: '🚀 Turbo (50 req/s)' },
                              ].map((s) => (
                                <button
                                  type="button"
                                  key={s.id}
                                  onClick={(e) => { e.stopPropagation(); setSpeedMode(s.id as any); }}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                    speedMode === s.id
                                      ? 'bg-[#31A895] text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {s.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Recurring info note */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-center gap-2">
                <span className="text-base">⏰</span>
                <span>
                  <strong>Note:</strong> Automated full catalog purge also runs on schedule <strong>every Friday at 12:00 PM (Cairo Time)</strong>.
                </span>
              </div>
            </div>

            {/* Modal Sticky Actions Footer */}
            <div className="flex items-center justify-between sm:justify-end gap-2.5 p-4 border-t border-slate-100 bg-slate-50/90 rounded-b-2xl shrink-0 backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setShowAuditConfirmModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartAudit}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>🚀</span>
                <span>
                  {auditScope === 'all'
                    ? 'Run Full Catalog Audit'
                    : auditScope === 'batch'
                    ? `Run Batch Audit (${auditBatchLimit})`
                    : `Run Page Audit (${products.length})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Audit In-Progress Modal */}
      {isAuditing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg animate-spin shrink-0">
                  ↻
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Auditing Links in Progress...</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Scope: {auditStatus?.scope || auditScope} • {auditStatus?.auditMode === 'stale' ? '⚡ Smart Delta' : (auditStatus?.auditMode === 'deep' ? '🔥 Deep Scan' : 'Testing URLs')}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Live Checking
              </span>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#31A895] h-full transition-all duration-300"
                    style={{ width: `${Math.max(6, auditStatus?.progressPercent || 10)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span className="truncate max-w-[320px]">{auditStatus?.summaryMessage || 'Testing retailer product links...'}</span>
                  <span className="font-bold text-slate-700">{auditStatus?.progressPercent || 0}%</span>
                </div>
              </div>

              {/* Live Time Counter Card */}
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200/80 rounded-xl">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-2">
                  <span className="animate-spin text-sm">⏱️</span>
                  <span>Time Elapsed</span>
                </span>
                <div className="flex items-baseline gap-2 font-mono">
                  <span className="text-base font-extrabold text-indigo-700">
                    {formatTime(elapsedSeconds)}
                  </span>
                  <span className="text-[11px] text-indigo-600 font-bold bg-white px-2 py-0.5 rounded border border-indigo-200 shadow-2xs">
                    ⚡ {auditStatus?.throughputPerSec || (auditStatus?.totalChecked && elapsedSeconds > 0 ? (auditStatus.totalChecked / Math.max(1, elapsedSeconds)).toFixed(1) : '0.0')}/s
                  </span>
                </div>
              </div>

              {/* Live Counter Badges */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="block text-[10px] text-slate-400">Checked</span>
                  <span className="font-bold text-slate-800 text-sm">{auditStatus?.totalChecked || 0}</span>
                </div>
                <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                  <span className="block text-[10px] text-red-500 font-medium">Dead</span>
                  <span className="font-bold text-red-600 text-sm">{auditStatus?.invalidCount || 0}</span>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                  <span className="block text-[10px] text-purple-500 font-medium">Purged</span>
                  <span className="font-bold text-purple-600 text-sm">{auditStatus?.removedCount || 0}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="block text-[10px] text-emerald-500 font-medium">Working</span>
                  <span className="font-bold text-emerald-600 text-sm">{auditStatus?.validRemaining || 0}</span>
                </div>
              </div>

              {/* Real-time Operation Logs Console */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-Time Operation Feed</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {auditLogs.length} events
                  </span>
                </div>
                <div className="bg-slate-950 text-slate-200 rounded-xl p-3 h-44 overflow-y-auto font-mono text-[11px] border border-slate-800 space-y-1 shadow-inner select-text">
                  {auditLogs.length === 0 ? (
                    <div className="text-slate-500 italic text-center py-8">
                      Connecting to link audit stream...
                    </div>
                  ) : (
                    auditLogs.map((log, idx) => {
                      let typeClass = 'text-slate-300';
                      let icon = '•';
                      if (log.type === 'success') {
                        typeClass = 'text-emerald-400';
                        icon = '✓';
                      } else if (log.type === 'error') {
                        typeClass = 'text-rose-400 font-medium';
                        icon = '✗';
                      } else if (log.type === 'warning') {
                        typeClass = 'text-amber-300';
                        icon = '⚠️';
                      } else if (log.type === 'info') {
                        typeClass = 'text-sky-300';
                        icon = 'ℹ';
                      }
                      return (
                        <div key={idx} className="flex items-start gap-1.5 leading-snug">
                          <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                          <span className={`shrink-0 select-none ${typeClass}`}>{icon}</span>
                          <span className={`break-all ${typeClass}`}>{log.message}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/90 rounded-b-2xl shrink-0 backdrop-blur-xs">
              <span className="text-xs text-slate-500 font-mono">
                {auditStatus?.step === 'purging_points' ? '🗑️ Purging dead points...' : '⚡ Auditing links in background'}
              </span>
              <button
                type="button"
                onClick={handleStopAudit}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-xl transition-colors border border-red-200 cursor-pointer"
              >
                Stop Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Audit Completion Summary Modal */}
      {showAuditSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 pb-3 border-b border-slate-100 shrink-0 text-center space-y-1 bg-white">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl shadow-xs">
                ✅
              </div>
              <h3 className="text-lg font-bold text-slate-900">Link Audit & Purge Finished</h3>
              <p className="text-xs text-slate-500">
                Vector database catalog has been inspected and cleaned.
              </p>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
              {/* Total Time Taken Banner */}
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Total Time to Finish</span>
                    <span className="text-[10px] text-slate-500">Duration of link verification & purge</span>
                  </div>
                </div>
                <span className="text-base font-black font-mono text-indigo-700 bg-white px-3 py-1 rounded-xl border border-indigo-100 shadow-xs">
                  {finalDurationText || auditStatus?.durationText || '0.0s'}
                </span>
              </div>

              {/* 4 Required Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Checked</span>
                  <span className="text-xl font-extrabold text-slate-900 block mt-0.5">
                    {auditStatus?.totalChecked || 0}
                  </span>
                  <span className="text-[9px] text-slate-400">Total verified</span>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-semibold text-red-700 uppercase block">Invalid / Dead</span>
                  <span className="text-xl font-extrabold text-red-600 block mt-0.5">
                    {auditStatus?.invalidCount || 0}
                  </span>
                  <span className="text-[9px] text-red-500">404 / 5xx / Redirect</span>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-semibold text-purple-700 uppercase block">Removed</span>
                  <span className="text-xl font-extrabold text-purple-600 block mt-0.5">
                    {auditStatus?.removedCount || 0}
                  </span>
                  <span className="text-[9px] text-purple-500">Purged from Qdrant</span>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Working</span>
                  <span className="text-xl font-extrabold text-emerald-600 block mt-0.5">
                    {auditStatus?.validRemaining || 0}
                  </span>
                  <span className="text-[9px] text-emerald-600">Active in catalog</span>
                </div>
              </div>

              {/* Formatted Return Message */}
              <div className="bg-slate-900 text-slate-200 rounded-xl p-3 text-xs font-mono leading-relaxed border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-0.5">📋 Completion Report:</span>
                {auditStatus?.summaryMessage || `Audit Completed in ${finalDurationText || '0.0s'}: Checked ${auditStatus?.totalChecked || 0} links. Found & purged ${auditStatus?.removedCount || 0} dead items from Vector DB. ${auditStatus?.validRemaining || 0} remaining working.`}
              </div>

              {/* Expandable Step-by-Step Audit Logs */}
              {auditLogs.length > 0 && (
                <details className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <summary className="flex items-center justify-between p-3 cursor-pointer text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors select-none">
                    <span className="flex items-center gap-2">
                      <span>📜</span>
                      <span>View Step-by-Step Operation Logs ({auditLogs.length} events)</span>
                    </span>
                    <span className="text-slate-400 text-xs font-mono group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="p-3 bg-slate-950 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1 border-t border-slate-800 text-slate-300 select-text">
                    {auditLogs.map((log, idx) => {
                      let typeClass = 'text-slate-300';
                      let icon = '•';
                      if (log.type === 'success') {
                        typeClass = 'text-emerald-400';
                        icon = '✓';
                      } else if (log.type === 'error') {
                        typeClass = 'text-rose-400 font-medium';
                        icon = '✗';
                      } else if (log.type === 'warning') {
                        typeClass = 'text-amber-300';
                        icon = '⚠️';
                      } else if (log.type === 'info') {
                        typeClass = 'text-sky-300';
                        icon = 'ℹ';
                      }
                      return (
                        <div key={idx} className="flex items-start gap-1.5 leading-snug">
                          <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                          <span className={`shrink-0 select-none ${typeClass}`}>{icon}</span>
                          <span className={`break-all ${typeClass}`}>{log.message}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/90 rounded-b-2xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAuditSummaryModal(false);
                  fetchProducts();
                }}
                className="w-full py-2.5 bg-[#31A895] hover:bg-[#288a7a] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Done & Refresh Catalog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
