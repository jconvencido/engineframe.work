// Custom hook for invitation management

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import type { ApiResponse } from '@/types';

export function useInvitation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch invitation details by token
  const fetchInvitation = async (token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/invitations/by-token/${token}`);
      const result: ApiResponse = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch invitation');
      }
      
      return { success: true, data: result.data };
    } catch (err: any) {
      console.error('Error fetching invitation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Accept invitation
  const acceptInvitation = async (token: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });
      
      const result: ApiResponse = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to accept invitation');
      }
      
      return { success: true, data: result.data };
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    error,
    fetchInvitation,
    acceptInvitation,
  };
}
