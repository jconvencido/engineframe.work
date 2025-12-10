// components/AuthGuard.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.replace('/login');
      } else {
        setChecked(true);
      }
    };
    check();
  }, [router]);

  if (!checked) return null;
  return <>{children}</>;
}
