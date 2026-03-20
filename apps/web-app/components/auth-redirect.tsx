'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

/**
 * Silent client component: redirects authenticated users to /groups.
 * Renders nothing — landing page content is always visible to crawlers.
 */
export default function AuthRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/groups');
    }
  }, [user, loading, router]);

  return null;
}
