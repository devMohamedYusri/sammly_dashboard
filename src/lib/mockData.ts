import { User, Issue, DashboardStats, TokenPackage, Message, DashboardUser } from '@/types';

export const MOCK_ADMIN_USER: User = {
  id: '1',
  name: 'Fatma Salah',
  email: 'admin@sammly.com',
  avatar: '/images/avatar.jpg',
  role: 'admin',
};

export const MOCK_STATS: DashboardStats = {
  totalIssues: 248,
  openIssues: 62,
  closedIssues: 186,
};

export const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    role: 'support',
  },
  {
    id: '2',
    name: 'Fatima Ali',
    email: 'fatima@example.com',
    role: 'support',
  },
  {
    id: '3',
    name: 'Mohammed Saeed',
    email: 'mohammed@example.com',
    role: 'manager',
  },
];

export const MOCK_ISSUES: Issue[] = [
  {
    id: '1',
    title: 'Login Issue',
    description: 'User unable to login to their account. The system keeps showing an error message.',
    status: 'closed',
    priority: 'medium',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
    assignee: MOCK_USERS[0],
    reporter: {
      id: '100',
      name: 'Ahmed',
      email: 'ahmed@example.com',
      role: 'support',
    },
    category: 'Authentication',
  },
  {
    id: '2',
    title: 'Registration Problem',
    description: 'User having issues during the registration process.',
    status: 'closed',
    priority: 'medium',
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-21'),
    assignee: MOCK_USERS[1],
    reporter: {
      id: '101',
      name: 'Fatima',
      email: 'fatima@example.com',
      role: 'support',
    },
    category: 'Authentication',
  },
  {
    id: '3',
    title: 'Payment Problem',
    description: "I've been trying to complete my payment for the premium plan but the transaction keeps failing at the final step. I tried multiple cards and still the same error appears on screen.",
    status: 'open',
    priority: 'high',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    assignee: MOCK_USERS[0],
    reporter: {
      id: '102',
      name: 'Sara',
      email: 'sara@example.com',
      role: 'support',
    },
    category: 'Billing',
    messages: [
      {
        id: '1',
        issueId: '3',
        author: {
          id: '102',
          name: 'Sara',
          email: 'sara@example.com',
          role: 'support',
        },
        content: "I've been trying to complete my payment for the premium plan but the transaction keeps failing at the final step. I tried multiple cards and still the same error appears on screen.",
        timestamp: new Date('2024-01-10T14:32:00'),
      },
    ],
  },
  {
    id: '4',
    title: 'Technical Problem',
    description: 'User experiencing technical issues with the application.',
    status: 'closed',
    priority: 'medium',
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-06'),
    assignee: MOCK_USERS[1],
    reporter: {
      id: '103',
      name: 'Omar',
      email: 'omar@example.com',
      role: 'support',
    },
    category: 'Technical',
  },
  {
    id: '5',
    title: 'Verification Code',
    description: 'User not receiving verification code via email.',
    status: 'open',
    priority: 'medium',
    createdAt: new Date('2024-02-14'),
    updatedAt: new Date('2024-02-14'),
    assignee: MOCK_USERS[2],
    reporter: {
      id: '104',
      name: 'Layla',
      email: 'layla@example.com',
      role: 'support',
    },
    category: 'Authentication',
  },
  {
    id: '6',
    title: 'Password Reset',
    description: 'User unable to reset password using the forgot password feature.',
    status: 'open',
    priority: 'medium',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
    assignee: MOCK_USERS[0],
    reporter: {
      id: '105',
      name: 'Karim',
      email: 'karim@example.com',
      role: 'support',
    },
    category: 'Authentication',
  },
  {
    id: '7',
    title: 'Bug Report',
    description: 'General bug report from user.',
    status: 'closed',
    priority: 'low',
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-11'),
    assignee: MOCK_USERS[1],
    reporter: {
      id: '106',
      name: 'Noor',
      email: 'noor@example.com',
      role: 'support',
    },
    category: 'Bug',
  },
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    issueId: '3',
    author: {
      id: '102',
      name: 'Sara',
      email: 'sara@example.com',
      role: 'support',
    },
    content: "I've been trying to complete my payment for the premium plan but the transaction keeps failing at the final step. I tried multiple cards and still the same error appears on screen.",
    timestamp: new Date('2024-01-10T14:32:00'),
  },
];

export const MOCK_TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: '1',
    name: 'Starter Package',
    tokens: 50,
    price: 150,
    currency: 'EGP',
  },
  {
    id: '2',
    name: 'Pro Package',
    tokens: 150,
    price: 370,
    currency: 'EGP',
  },
  {
    id: '3',
    name: 'Premium Package',
    tokens: 500,
    price: 955,
    currency: 'EGP',
  },
];

export const MOCK_DASHBOARD_USERS: DashboardUser[] = [
  {
    id: '1',
    email: 'ahmed@example.com',
    username: 'ahmed_design',
    status: 'Active',
    joinDate: '2024-01-15',
  },
  {
    id: '2',
    email: 'fatima@example.com',
    username: 'fatima_home',
    status: 'Active',
    joinDate: '2024-02-20',
  },
  {
    id: '3',
    email: 'sara@example.com',
    username: 'sara_interior',
    status: 'Inactive',
    joinDate: '2024-01-10',
  },
  {
    id: '4',
    email: 'omar@example.com',
    username: 'omar_spaces',
    status: 'Active',
    joinDate: '2024-03-05',
  },
  {
    id: '5',
    email: 'layla@example.com',
    username: 'layla_deco',
    status: 'Inactive',
    joinDate: '2024-02-14',
  },
  {
    id: '6',
    email: 'karim@example.com',
    username: 'karim_rooms',
    status: 'Active',
    joinDate: '2024-03-10',
  },
  {
    id: '7',
    email: 'layla@example.com',
    username: 'layla_deco',
    status: 'Inactive',
    joinDate: '2024-02-14',
  },
  {
    id: '8',
    email: 'karim@example.com',
    username: 'karim_rooms',
    status: 'Active',
    joinDate: '2024-03-10',
  },
];

export const MOCK_FREE_TOKENS = 15;
