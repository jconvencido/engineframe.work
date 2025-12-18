// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

// Browser client for client components (lazy initialization)
export function getSupabaseBrowser() {
  if (typeof window === 'undefined') {
    // Return a mock client during SSR to prevent build errors
    return null as any;
  }

  if (client) {
    return client;
  }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}

// Export for backwards compatibility
export const supabaseBrowser = getSupabaseBrowser();

