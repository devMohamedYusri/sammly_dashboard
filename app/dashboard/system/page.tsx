import { redirect } from 'next/navigation';

export default function SystemPage() {
  redirect('/dashboard/financials?tab=version-legal');
}
