// Zustand store for authentication state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isEmailVerified: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isEmailVerified: false,
      
      setUser: (user) =>
        set({
          user,
          isEmailVerified: user?.email_confirmed_at != null,
          isLoading: false,
        }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      signOut: () =>
        set({
          user: null,
          isEmailVerified: false,
          isLoading: false,
        }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
