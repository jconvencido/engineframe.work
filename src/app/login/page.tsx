// app/login/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page, modal will handle login
    router.push('/?modal=login');
  }, [router]);

  return null;
}
