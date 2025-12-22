// Custom hook for authentication
// Manages auth state and provides auth methods

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useAuthStore } from '@/stores';
import type { AuthUser } from '@/types';

export function useAuth() {
  const { user, isLoading, isEmailVerified, setUser, setLoading, signOut: storeSignOut } = useAuthStore();
  
  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;
    
    // Get initial session
    supabaseBrowser.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (mounted) {
        setUser(
          session?.user
            ? {
                id: session.user.id,
                email: session.user.email!,
                email_confirmed_at: session.user.email_confirmed_at || null,
              }
            : null
        );
      }
    });
    
    // Listen for auth changes
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event: any, session: any) => {
      if (mounted) {
        setUser(
          session?.user
            ? {
                id: session.user.id,
                email: session.user.email!,
                email_confirmed_at: session.user.email_confirmed_at || null,
              }
            : null
        );
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser]);
  
  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
  };
  
  // Sign up with email/password
  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabaseBrowser.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
  };
  
  // Sign in with OAuth (Google)
  const signInWithGoogle = async () => {
    const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  };
  
  // Sign out
  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    storeSignOut();
  };
  
  // Reset password
  const resetPassword = async (email: string) => {
    const { data, error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
  };
  
  // Update password
  const updatePassword = async (newPassword: string) => {
    const { data, error } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };
  
  return {
    user,
    isLoading,
    isEmailVerified,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
  };
}
