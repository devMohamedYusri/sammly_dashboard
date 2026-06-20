'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Badge from '@/components/common/Badge';
import { getSupportMessage, updateAdminNotes, closeSupportMessage } from '@/lib/api';
import { ApiSupportDetail } from '@/types';

export default function IssueDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const issueId = params?.id as string;

  const [issue, setIssue] = useState<ApiSupportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [closingIssue, setClosingIssue] = useState(false);

  const fetchDetail = async () => {
    if (!issueId) return;
    setLoading(true);
    try {
      const data = await getSupportMessage(issueId);
      setIssue(data);
      setAdminNotes(data.adminNotes || '');
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load support message details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [issueId]);

  const handleSaveNotes = async () => {
    if (!issueId) return;
    setSavingNotes(true);
    try {
      await updateAdminNotes(issueId, adminNotes);
      // alert or visual feedback is implicit in button status
    } catch (err: any) {
      alert(err?.message || 'Failed to save admin notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCloseIssue = async () => {
    if (!issueId) return;
    setClosingIssue(true);
    try {
      await closeSupportMessage(issueId);
      if (issue) {
        setIssue({ ...issue, status: 'closed' });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to close support message');
    } finally {
      setClosingIssue(false);
    }
  };

  if (loading && !issue) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Loading details...</p>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="text-center py-12">
        <p className="text-[#FF5A6E] mb-4">{error || 'Issue not found'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-[#31A895] text-white rounded-lg hover:bg-[#289076] transition-colors"
        >
          Back to Issues
        </button>
      </div>
    );
  }

  const userInitials = issue.email
    ? issue.email.split('@')[0].toUpperCase().slice(0, 2)
    : 'US';

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Issue Details</h1>
        <p className="text-slate-500 mt-1">Full information about this support request</p>
      </div>

      {/* Status Badge */}
      <div>
        <Badge variant={issue.status === 'open' ? 'danger' : 'success'} size="lg">
          {issue.status === 'open' ? (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF5A6E]"></span>
              Open
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#1ECB7F]"></span>
              Closed
            </span>
          )}
        </Badge>
      </div>

      {/* User Info and Issue Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info Card */}
        <div className="bg-[#f0faf8] border border-[#d5eeea] rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">User info</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-[#31A895] flex items-center justify-center text-white font-bold text-sm">
              {userInitials}
            </div>
            <div>
              <p className="font-medium text-slate-900">{issue.email}</p>
              <p className="text-sm text-slate-500">Registered user</p>
            </div>
          </div>
          <div className="space-y-2 pt-4 border-t border-[#d5eeea]">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Email</span>
              <span className="text-sm text-slate-700">{issue.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Joined</span>
              <span className="text-sm text-slate-700">{issue.joinAt || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Issue Info Card */}
        <div className="bg-[#f0faf8] border border-[#d5eeea] rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Issue info</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Subject</span>
              <span className="text-sm text-slate-700 font-medium">{issue.subject}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Date submitted</span>
              <span className="text-sm text-slate-700">{issue.createdAt?.dateOnly || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Assigned to</span>
              <span className="text-sm text-slate-700">Support Team</span>
            </div>
          </div>
        </div>
      </div>

      {/* User Message Card */}
      {issue.message && (
        <div className="bg-[#f0faf8] border border-[#d5eeea] rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-3">User message</h3>
          <p className="text-slate-700 leading-relaxed">{issue.message}</p>
          <p className="text-sm text-slate-400 mt-4 text-right">
            Sent on {issue.createdAt?.dateTime || 'N/A'}
          </p>
        </div>
      )}

      {/* Admin Notes Card */}
      <div className="bg-[#f0faf8] border border-[#d5eeea] rounded-xl p-6 space-y-3">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Admin notes</h3>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Enter notes about this support request..."
          className="w-full min-h-[100px] p-3 border border-[#d5eeea] rounded-lg text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#31A895] focus:border-transparent transition-all"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="px-4 py-2 bg-[#31A895] text-white text-sm font-medium rounded-lg hover:bg-[#289076] transition-colors disabled:opacity-50"
          >
            {savingNotes ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>

      {/* Close Issue Button */}
      {issue.status !== 'closed' && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleCloseIssue}
            disabled={closingIssue}
            className="px-8 py-3 bg-[#31A895] text-white font-medium rounded-lg hover:bg-[#289076] transition-colors disabled:opacity-50"
          >
            {closingIssue ? 'Closing...' : 'Close Issue'}
          </button>
        </div>
      )}
    </div>
  );
}
