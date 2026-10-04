import {
  ApiUsersResponse,
  ApiPackagesResponse,
  ApiSupportResponse,
  ApiSupportDetailResponse,
  ApiPackage,
  ApiUser,
  ApiSupportMessage,
  ApiSupportDetail,
  ApiTelemetryResponse,
  ApiTelemetryOverview,
  SourcingQualityResponse,
  SourcingQualityMetrics,
  SourcingLogsResponse,
  FeatureFlagsResponse,
  FeatureFlags,
  AppVersionResponse,
  AppVersionData,
  LegalDocResponse,
  ApiLedgerOverviewResponse,
  FinancialOverviewData,
  ApiLedgerEntriesResponse,
  FinancialLedgerEntry,
  ApiGovernanceResponse,
  GovernanceOverviewData,
  RecordExpensePayload,
  RecordRepaymentPayload,
  RecordReversalPayload,
  ToggleMilitaryHiatusPayload,
  LedgerEntryType,
  LedgerCategory,
  LedgerCurrency,
  ApiPurchasesAnalyticsResponse,
  PurchasesAnalyticsData,
  ApiMarketingStrategyResponse,
  MarketingStrategyAnalyticsData,
  CatalogProductsResponse,
  GetCatalogProductsParams,
  LinkAuditResponse,
  LinkAuditStatus,
  TriggerLinkAuditParams,
} from '@/types';

const PRIMARY_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const FALLBACK_BASE_URL = PRIMARY_BASE_URL.includes('localhost')
  ? 'https://sammly-backend-p3z7.onrender.com'
  : 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

// Token helper functions
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sammly-token');
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sammly-token', token);
  }
};

export const clearToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sammly-token');
    localStorage.removeItem('sammly-auth');
  }
};

async function performFetch(baseUrl: string, path: string, options: RequestInit): Promise<Response> {
  const url = `${baseUrl}${path}`;
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData) && options.method && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await performFetch(PRIMARY_BASE_URL, path, options);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[apiFetch] Primary backend (${PRIMARY_BASE_URL}) unreachable (${errorMsg}), trying fallback (${FALLBACK_BASE_URL})...`);
    try {
      response = await performFetch(FALLBACK_BASE_URL, path, options);
    } catch (fallbackErr: unknown) {
      const fMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      throw new ApiError(
        `Unable to reach backend API server. Tried both ${PRIMARY_BASE_URL} and ${FALLBACK_BASE_URL}. (${fMsg})`,
        503
      );
    }
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401 && !path.includes('/api/admin/login')) {
      clearToken();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorMsg = data?.message || response.statusText || 'An error occurred';
    throw new ApiError(errorMsg, response.status);
  }

  return data as T;
}

// Domain endpoints

// 1) Auth
export async function loginAdmin(email: string, password: string): Promise<{ token: string; message: string }> {
  const res = await apiFetch<{ status: string; data: { token: string; message: string } }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return res.data;
}

// 2) Users
export interface GetUsersParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'active' | 'deactivated';
  search?: string;
}

export async function getUsers(params: GetUsersParams = {}): Promise<ApiUsersResponse['data']> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiFetch<ApiUsersResponse>(`/api/admin/users${queryString}`);
  return res.data;
}

export async function activateUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ status: string; message: string }>(`/api/admin/users/${userId}/activate`, {
    method: 'PATCH',
  });
}

export async function deactivateUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ status: string; message: string }>(`/api/admin/users/${userId}/deactivate`, {
    method: 'PATCH',
  });
}

// 3) Packages
export async function getPackages(): Promise<ApiPackage[]> {
  const res = await apiFetch<ApiPackagesResponse>('/api/payment/packages');
  return res.data.packages;
}

export interface AddPackageData {
  packageId: string;
  tokens: number;
  price: number;
  title?: string;
  titleAr?: string;
  badge?: string | null;
  isSubscription?: boolean;
  interval?: 'one_time' | 'monthly';
}

export async function addPackage(data: AddPackageData | string, legacyTokens?: number, legacyPrice?: number): Promise<{ message: string }> {
  let body: Record<string, unknown>;
  if (typeof data === 'string') {
    body = { packageId: data, tokens: legacyTokens, credits: legacyTokens, price: legacyPrice };
  } else {
    body = {
      packageId: data.packageId,
      tokens: data.tokens,
      credits: data.tokens,
      price: data.price,
      title: data.title || data.packageId,
      titleAr: data.titleAr || data.packageId,
      badge: data.badge || null,
      isSubscription: data.isSubscription || false,
      interval: data.interval || 'one_time',
    };
  }

  const res = await apiFetch<{ status: string; data: { message: string } }>('/api/admin/packages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.data;
}

export interface UpdatePackageData {
  newPackageId?: string;
  tokens?: number;
  price?: number;
  newTitle?: string;
  newTitleAr?: string;
  newBadge?: string | null;
  newIsSubscription?: boolean;
  newInterval?: 'one_time' | 'monthly';
}

export async function updatePackage(packageId: string, data: UpdatePackageData): Promise<{ message: string }> {
  // Translate fields to request-body: newPackageId, newTokens/tokens, newPrice/price, etc.
  const payload: Record<string, unknown> = {};
  if (data.newPackageId !== undefined) payload.newPackageId = data.newPackageId;
  if (data.tokens !== undefined) {
    payload.newTokens = data.tokens;
    payload.newCredits = data.tokens;
    payload.tokens = data.tokens;
    payload.credits = data.tokens;
  }
  if (data.price !== undefined) {
    payload.newPrice = data.price;
    payload.price = data.price;
  }
  if (data.newTitle !== undefined) payload.newTitle = data.newTitle;
  if (data.newTitleAr !== undefined) payload.newTitleAr = data.newTitleAr;
  if (data.newBadge !== undefined) payload.newBadge = data.newBadge;
  if (data.newIsSubscription !== undefined) payload.newIsSubscription = data.newIsSubscription;
  if (data.newInterval !== undefined) payload.newInterval = data.newInterval;

  const res = await apiFetch<{ status: string; data: { message: string } }>(`/api/admin/packages/${packageId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deletePackage(packageId: string): Promise<{ message: string }> {
  const res = await apiFetch<{ status: string; data: { message: string } }>(`/api/admin/packages/${packageId}`, {
    method: 'DELETE',
  });
  return res.data;
}

// 4) Support
export interface GetSupportParams {
  page?: number;
  limit?: number;
  status?: 'open' | 'closed';
  search?: string;
}

export async function getSupportMessages(params: GetSupportParams = {}): Promise<ApiSupportResponse['data']> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.status) query.append('status', params.status);
  if (params.search) query.append('search', params.search);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiFetch<ApiSupportResponse>(`/api/admin/support${queryString}`);
  return res.data;
}

export async function getSupportMessage(supportId: string): Promise<ApiSupportDetail> {
  const res = await apiFetch<ApiSupportDetailResponse>(`/api/admin/support/${supportId}`);
  return res.data;
}

export async function updateAdminNotes(supportId: string, adminNotes: string): Promise<{ message: string }> {
  const res = await apiFetch<{ status: string; data: { message: string } }>(`/api/admin/support/${supportId}/admin-notes`, {
    method: 'PATCH',
    body: JSON.stringify({ adminNotes }),
  });
  return res.data;
}

export async function closeSupportMessage(supportId: string): Promise<{ message: string }> {
  const res = await apiFetch<{ status: string; data: { message: string } }>(`/api/admin/support/${supportId}/close`, {
    method: 'PATCH',
  });
  return res.data;
}

// 5) Sourcing & System Telemetry
export async function getApiTelemetryOverview(hours: number = 24): Promise<ApiTelemetryOverview> {
  const res = await apiFetch<ApiTelemetryResponse>(`/api/admin/sourcing/telemetry/overview?hours=${hours}`);
  return res.data;
}

export async function getSourcingQualityMetrics(): Promise<SourcingQualityMetrics> {
  const res = await apiFetch<SourcingQualityResponse>('/api/admin/sourcing/telemetry/matching');
  return res.data;
}

export interface GetSourcingLogsParams {
  page?: number;
  limit?: number;
  quality?: 'good' | 'moderate' | 'poor' | 'none' | 'rejected';
  category?: string;
  isValid?: boolean;
}

export async function getDetailedSourcingLogs(params: GetSourcingLogsParams = {}): Promise<SourcingLogsResponse['data']> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.quality) query.append('quality', params.quality);
  if (params.category) query.append('category', params.category);
  if (params.isValid !== undefined) query.append('isValid', String(params.isValid));

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiFetch<SourcingLogsResponse>(`/api/admin/sourcing/logs${queryString}`);
  return res.data;
}

export async function getSourcingCatalogProducts(params: GetCatalogProductsParams = {}): Promise<CatalogProductsResponse['data']> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', params.offset);
  if (params.category && params.category !== 'all') query.append('category', params.category);
  if (params.storeName && params.storeName !== 'all') query.append('storeName', params.storeName);
  if (params.minPrice !== undefined) query.append('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) query.append('maxPrice', String(params.maxPrice));
  if (params.inStock !== undefined) query.append('inStock', String(params.inStock));
  if (params.missing && params.missing !== 'all') query.append('missing', params.missing);
  if (params.search && params.search.trim()) query.append('search', params.search.trim());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const token = getToken();

  // Call Next.js local API proxy (which directly queries Qdrant Cloud)
  const res = await fetch(`/api/sourcing/products${queryString}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const json: CatalogProductsResponse = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new ApiError((json as any)?.message || 'Failed to load catalog products', res.status);
  }

  return json.data;
}

// Dead Link Auditing & Vector DB Purge
export async function triggerLinkAudit(params: TriggerLinkAuditParams): Promise<LinkAuditStatus> {
  const token = getToken();
  const res = await fetch('/api/sourcing/audit-links', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });

  const json: LinkAuditResponse = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new ApiError(json.message || 'Failed to trigger link audit', res.status);
  }
  return json.data;
}

export async function getLinkAuditStatus(): Promise<LinkAuditStatus> {
  const token = getToken();
  const res = await fetch('/api/sourcing/audit-links', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const json: LinkAuditResponse = await res.json();
  if (!res.ok || json.status === 'error') {
    throw new ApiError(json.message || 'Failed to get audit status', res.status);
  }
  return json.data;
}

export async function stopLinkAudit(): Promise<LinkAuditStatus> {
  const token = getToken();
  const res = await fetch('/api/sourcing/audit-links', {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => null);

  if (res && res.ok) {
    const json: LinkAuditResponse = await res.json();
    return json.data;
  }
  return {
    isRunning: false,
    jobId: null,
    scope: 'idle',
    totalChecked: 0,
    invalidCount: 0,
    removedCount: 0,
    validRemaining: 0,
    progressPercent: 0,
    summaryMessage: 'Stopped',
  };
}

// 6) Feature Flags & Mobile Config
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const res = await apiFetch<FeatureFlagsResponse>('/api/feature-flags');
  return res.data.flags;
}

// 7) App Version
export async function getAppVersion(): Promise<AppVersionData> {
  const res = await apiFetch<AppVersionResponse>('/api/app-version');
  return res.data;
}

// 8) Legal Documents
export async function getLegalDocument(type: 'privacy-policy' | 'terms-of-service'): Promise<{ title: string; content: string }> {
  const res = await apiFetch<LegalDocResponse>(`/api/legal/${type}`);
  return res.data;
}

// 9) Financial Ledger & Governance
export async function getLedgerOverview(): Promise<FinancialOverviewData> {
  const res = await apiFetch<ApiLedgerOverviewResponse>('/api/admin/financials/ledger');
  return res.data;
}

export interface GetLedgerEntriesParams {
  page?: number;
  limit?: number;
  entryType?: LedgerEntryType;
  category?: LedgerCategory | string;
  currency?: LedgerCurrency;
}

export async function getLedgerEntries(params: GetLedgerEntriesParams = {}): Promise<ApiLedgerEntriesResponse['data']> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.entryType) query.append('entryType', params.entryType);
  if (params.category) query.append('category', params.category);
  if (params.currency) query.append('currency', params.currency);

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiFetch<ApiLedgerEntriesResponse>(`/api/admin/financials/entries${queryString}`);
  return res.data;
}

export async function recordFounderExpense(payload: RecordExpensePayload): Promise<{ message: string; entry: FinancialLedgerEntry }> {
  const res = await apiFetch<{ status: string; data: { message: string; entry: FinancialLedgerEntry } }>('/api/admin/financials/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function recordDebtRepayment(payload: RecordRepaymentPayload): Promise<{ message: string; remainingDebtEGP: number; entry: FinancialLedgerEntry }> {
  const res = await apiFetch<{ status: string; data: { message: string; remainingDebtEGP: number; entry: FinancialLedgerEntry } }>('/api/admin/financials/repay', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function recordReversal(payload: RecordReversalPayload): Promise<{ message: string; reversalEntry: FinancialLedgerEntry }> {
  const res = await apiFetch<{ status: string; data: { message: string; reversalEntry: FinancialLedgerEntry } }>('/api/admin/financials/reversal', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getGovernanceOverview(): Promise<GovernanceOverviewData> {
  const res = await apiFetch<ApiGovernanceResponse>('/api/admin/financials/governance');
  return res.data;
}

export async function toggleMilitaryHiatus(payload: ToggleMilitaryHiatusPayload): Promise<{ message: string; governance: GovernanceOverviewData['governance'] }> {
  const res = await apiFetch<{ status: string; data: { message: string; governance: GovernanceOverviewData['governance'] } }>('/api/admin/financials/governance/military-hiatus', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  status?: string;
  packageId?: string;
  search?: string;
}

export async function getTransactionsAnalytics(params: GetTransactionsParams = {}): Promise<PurchasesAnalyticsData> {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.append('page', String(params.page));
  if (params.limit !== undefined) query.append('limit', String(params.limit));
  if (params.status && params.status !== 'ALL') query.append('status', params.status);
  if (params.packageId && params.packageId !== 'ALL') query.append('packageId', params.packageId);
  if (params.search && params.search.trim()) query.append('search', params.search.trim());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await apiFetch<ApiPurchasesAnalyticsResponse>(`/api/admin/financials/transactions${queryString}`);
  return res.data;
}

export async function syncPendingTransactions(): Promise<{
  totalChecked: number;
  completedCount: number;
  failedCount: number;
  abandonedCount: number;
  stillPendingCount: number;
}> {
  const res = await apiFetch<{ status: string; data: any }>('/api/admin/financials/transactions/sync-pending', {
    method: 'POST'
  });
  return res.data;
}

export async function syncSingleTransaction(id: string): Promise<any> {
  const res = await apiFetch<{ status: string; data: any }>(`/api/admin/financials/transactions/${id}/sync`, {
    method: 'POST'
  });
  return res.data;
}

// 8.5) Growth, Strategic & Marketing Analytics
export async function getMarketingStrategyAnalytics(
  timeframe: '7d' | '30d' | '90d' | 'all' | string = '30d'
): Promise<MarketingStrategyAnalyticsData> {
  const res = await apiFetch<ApiMarketingStrategyResponse>(
    `/api/admin/financials/growth-analytics?timeframe=${timeframe}`
  );
  return res.data;
}

// 9) Founder Test Account Credits
export interface FounderCreditsData {
  userId: string;
  email: string;
  role: string;
  credits: number;
}

export async function getFounderCredits(customBaseUrl?: string, customToken?: string): Promise<FounderCreditsData> {
  if (customBaseUrl) {
    const token = customToken || getToken();
    const res = await fetch(`${customBaseUrl}/api/admin/founder/credits`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data?.message || 'Failed to fetch founder credits', res.status);
    return data.data;
  }
  const res = await apiFetch<{ status: string; data: FounderCreditsData }>('/api/admin/founder/credits');
  return res.data;
}

export async function addFounderCredits(
  amount: number = 100,
  targetEmail?: string,
  customBaseUrl?: string,
  customToken?: string
): Promise<FounderCreditsData & { added: number; message: string }> {
  if (customBaseUrl) {
    const token = customToken || getToken();
    const res = await fetch(`${customBaseUrl}/api/admin/founder/credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount, targetEmail })
    });
    const data = await res.json();
    if (!res.ok) throw new ApiError(data?.message || 'Failed to add credits', res.status);
    return data.data;
  }
  const res = await apiFetch<{ status: string; data: FounderCreditsData & { added: number; message: string } }>('/api/admin/founder/credits', {
    method: 'POST',
    body: JSON.stringify({ amount, targetEmail }),
  });
  return res.data;
}


