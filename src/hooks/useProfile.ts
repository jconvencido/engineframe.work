// Custom hook for user profile management

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import type { Profile, UpdateProfileRequest, ApiResponse, ProfileResponse } from '@/types';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch profile
  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        setProfile(null);
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/profile', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      const result: ApiResponse<ProfileResponse> = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch profile');
      }
      
      setProfile(result.data!.profile);
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update profile
  const updateProfile = async (updates: UpdateProfileRequest) => {
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(updates),
      });
      
      const result: ApiResponse<ProfileResponse> = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }
      
      setProfile(result.data!.profile);
      return { success: true, data: result.data!.profile };
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  // Load profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);
  
  return {
    profile,
    isLoading,
    error,
    fetchProfile,
    updateProfile,
  };
}
