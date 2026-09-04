export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'support' | 'manager';
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'in-progress';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  updatedAt: Date;
  assignee?: User;
  reporter: User;
  category: string;
  messages?: Message[];
}

export interface Message {
  id: string;
  issueId: string;
  author: User;
  content: string;
  timestamp: Date;
  attachments?: string[];
}

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  currency: string;
}

export interface DashboardUser {
  id: string;
  email: string;
  username: string;
  status: 'Active' | 'Inactive';
  joinDate: string;
}

export interface DashboardStats {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
}

export interface AdminUser extends User {
  permissions: string[];
  lastLogin?: Date;
}

// API types
export interface ApiUser {
  _id: string;
  email: string;
  username: string;
  status: 'pending' | 'active' | 'deactivated';
  joinAt: string;
}

export interface ApiUsersResponse {
  status: string;
  data: {
    stats: {
      totalUsers: number;
      activeUsers: number;
      deactivatedUsers: number;
    };
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
    users: ApiUser[];
  };
}

export interface ApiPackage {
  packageId: string;
  tokens: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPackagesResponse {
  status: string;
  data: {
    packages: ApiPackage[];
  };
}

export interface ApiSupportMessage {
  _id: string;
  email: string;
  subject: string;
  status: 'open' | 'closed';
  createdAt: string;
}

export interface ApiSupportResponse {
  status: string;
  data: {
    stats: {
      totalMessages: number;
      totalOpen: number;
      totalClosed: number;
    };
    pagination: {
      page: number;
      limit: number;
      hasMore: boolean;
    };
    supports: ApiSupportMessage[];
  };
}

export interface ApiSupportDetail {
  email: string;
  subject: string;
  message: string;
  adminNotes: string;
  status: 'open' | 'closed';
  joinAt: string;
  createdAt: {
    dateOnly: string;
    dateTime: string;
  };
}

export interface ApiSupportDetailResponse {
  status: string;
  data: ApiSupportDetail;
}

// Telemetry & System Metrics
export interface RoutePerformance {
  route: string;
  totalCalls: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
}

export interface HourlyLatencyTrend {
  hour: string;
  requests: number;
  avgLatencyMs: number;
}

export interface ApiTelemetryOverview {
  timeframe: string;
  totalRequests: number;
  errorRatePercent: number;
  statusDistribution: Array<{ _id: string; count: number }>;
  routePerformance: RoutePerformance[];
  hourlyTrend: HourlyLatencyTrend[];
}

export interface ApiTelemetryResponse {
  status: string;
  data: ApiTelemetryOverview;
}

// Sourcing Quality & AI Analytics
export interface QualityBreakdown {
  counts: {
    good: number;
    moderate: number;
    poor: number;
    none: number;
    rejected: number;
  };
  percentages: {
    good: number;
    moderate: number;
    poor: number;
    none: number;
    rejected: number;
  };
}

export interface TopCategoryDemand {
  category: string;
  searchCount: number;
  avgSimilarityScore: number;
}

export interface RetailerDistribution {
  store: string;
  matchedCount: number;
}

export interface DailySourcingTrend {
  _id: string;
  total: number;
  goodMatches: number;
  moderateMatches: number;
  poorMatches: number;
  noMatches: number;
  rejected: number;
}

export interface SourcingQualityMetrics {
  totalSearches: number;
  rejectionRatePercent: number;
  qualityBreakdown: QualityBreakdown;
  latencyBreakdown: {
    avgGeminiVisionMs: number;
    avgRenderDinoSearchMs: number;
    avgTotalRoundtripMs: number;
  };
  topCategories: TopCategoryDemand[];
  retailerDistribution: RetailerDistribution[];
  dailyTrend: DailySourcingTrend[];
}

export interface SourcingQualityResponse {
  status: string;
  data: SourcingQualityMetrics;
}

// Search Logs
export interface SearchResultItem {
  id?: string;
  score?: number;
  title?: string;
  price_egp?: number;
  category?: string;
  store_name?: string;
  product_url?: string;
  image_url?: string;
}

export interface SourcingSearchLog {
  _id: string;
  userId?: {
    _id: string;
    email: string;
    role: string;
    status: string;
  };
  imageUrl: string;
  isValidInterior: boolean;
  rejectionReason?: string | null;
  detectedCategories: string[];
  primaryCategory?: string | null;
  visualDescription?: string;
  quality: 'good' | 'moderate' | 'poor' | 'none' | 'rejected';
  topScore: number;
  matchCount: number;
  results: SearchResultItem[];
  latency: {
    geminiMs: number;
    dinoMs: number;
    totalMs: number;
  };
  createdAt: string;
}

export interface SourcingLogsResponse {
  status: string;
  data: {
    logs: SourcingSearchLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Feature Flags
export interface FeatureFlags {
  customBuild: {
    enabled: boolean;
    teaser?: boolean;
    title?: string;
    message?: string;
  };
  visualSourcing: {
    enabled: boolean;
    standaloneSearch?: boolean;
  };
  fluxGeneration: {
    enabled: boolean;
    engine?: string;
  };
  googlePlayBilling: {
    enabled: boolean;
  };
}

export interface FeatureFlagsResponse {
  status: string;
  data: {
    flags: FeatureFlags;
  };
}

// App Version
export interface AppVersionData {
  latestVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  forceUpdate: boolean;
  releaseNotes: string;
  releaseNotesAr: string;
}

export interface AppVersionResponse {
  status: string;
  data: AppVersionData;
}

// Legal Documents
export interface LegalDocResponse {
  status: string;
  data: {
    title: string;
    content: string;
  };
}


