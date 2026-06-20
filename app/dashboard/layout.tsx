'use client';

import { ReactNode } from 'react';
import DashboardLayout from '@/components/layout/Layout';

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
