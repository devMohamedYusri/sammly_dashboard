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

