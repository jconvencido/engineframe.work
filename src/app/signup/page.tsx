// app/signup/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page, modal will handle signup
    router.push('/?modal=signup');
  }, [router]);

  return null;
}
