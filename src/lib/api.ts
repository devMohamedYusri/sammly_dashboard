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
} from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sammly-backend-p3z7.onrender.com';

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

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData) && options.method && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !path.includes('/api/admin/login')) {
      clearToken();
      if (typeof window !== 'undefined') {
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

export async function addPackage(packageId: string, tokens: number, price: number): Promise<{ message: string }> {
  const res = await apiFetch<{ status: string; data: { message: string } }>('/api/admin/packages', {
    method: 'POST',
    body: JSON.stringify({ packageId, tokens, price }),
  });
  return res.data;
}

export interface UpdatePackageData {
  newPackageId?: string;
  tokens?: number;
  price?: number;
}

export async function updatePackage(packageId: string, data: UpdatePackageData): Promise<{ message: string }> {
  // Translate fields to request-body: newPackageId, newTokens/tokens, newPrice/price
  const payload: Record<string, unknown> = {};
  if (data.newPackageId !== undefined) payload.newPackageId = data.newPackageId;
  if (data.tokens !== undefined) {
    payload.newTokens = data.tokens;
    payload.tokens = data.tokens;
  }
  if (data.price !== undefined) {
    payload.newPrice = data.price;
    payload.price = data.price;
  }

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


