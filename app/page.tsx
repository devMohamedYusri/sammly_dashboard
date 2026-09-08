'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isLoggedIn, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#31A895] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
