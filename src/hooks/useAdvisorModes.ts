// Custom hook for advisor modes

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import type { AdvisorMode, ApiResponse, AdvisorModeListResponse } from '@/types';

export function useAdvisorModes(organizationId?: string | null) {
  const [modes, setModes] = useState<AdvisorMode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch advisor modes
  const fetchModes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      const url = organizationId
        ? `/api/advisor-modes?organizationId=${organizationId}`
        : '/api/advisor-modes';
      
      const headers: HeadersInit = {};
      if (session) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(url, {
        headers,
      });
      
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch advisor modes:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error || result,
        });
        // For unauthorized errors on organization modes, just return empty array
        if (response.status === 401 && organizationId) {
          setModes([]);
          return;
        }
        throw new Error(result.error || `Server error: ${response.status}`);
      }
      
      const result: ApiResponse<AdvisorModeListResponse> = await response.json();
      
      if (!result.success || !result.data) {
        console.error('Invalid response from advisor modes API:', result);
        throw new Error(result.error || 'Failed to fetch advisor modes');
      }
      
      setModes(result.data!.modes);
    } catch (err: any) {
      console.error('Error fetching advisor modes:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load modes on mount and when organization changes
  useEffect(() => {
    fetchModes();
    
    // Subscribe to changes in advisor_modes table
    const subscription = supabaseBrowser
      .channel('advisor_modes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'advisor_modes',
        },
        () => {
          fetchModes();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, [organizationId]);
  
  return {
    modes,
    isLoading,
    error,
    refetch: fetchModes,
  };
}
