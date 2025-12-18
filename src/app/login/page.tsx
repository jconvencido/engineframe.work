// app/login/page.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get redirect URL if provided
    const redirectTo = searchParams.get('redirectTo');
    
    // Redirect to home page with modal and redirect param
    if (redirectTo) {
      router.push(`/?modal=login&redirectTo=${encodeURIComponent(redirectTo)}`);
    } else {
      router.push('/?modal=login');
    }
  }, [router, searchParams]);

  return null;
}
