// Custom hook for organizations management

import { useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { useOrganizationStore } from '@/stores';
import type { CreateOrganizationRequest, ApiResponse, OrganizationListResponse, CreateOrganizationResponse } from '@/types';

export function useOrganizations() {
  const {
    currentOrg,
    userOrgs,
    isLoading,
    setCurrentOrg,
    setUserOrgs,
    setLoading,
    switchOrganization,
    addOrganization,
    updateOrganization: updateOrgInStore,
    removeOrganization: removeOrgFromStore,
    canManageTeam,
    canCreateAnalysis,
    canInviteMembers,
    isAdmin,
    isOwner,
  } = useOrganizationStore();
  
  // Fetch user's organizations
  const fetchOrganizations = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        setUserOrgs([]);
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/organizations', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // If unauthorized, just set empty orgs (user might not have any)
        if (response.status === 401) {
          console.log('Not authorized to fetch organizations (user may not have any)');
          setUserOrgs([]);
          setCurrentOrg(null);
          setLoading(false);
          return;
        }
        
        console.error('Failed to fetch organizations:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error || result,
        });
        throw new Error(result.error || `Server error: ${response.status}`);
      }
      
      const result: ApiResponse<OrganizationListResponse> = await response.json();
      
      if (!result.success || !result.data) {
        console.error('Invalid response from organizations API:', result);
        throw new Error(result.error || 'Failed to fetch organizations');
      }
      
      const orgsWithRole = result.data!.organizations.map(org => ({
        id: org.id,
        name: org.name,
        description: org.description,
        settings: null,
        created_at: org.created_at,
        updated_at: org.created_at,
        role: org.role,
      }));
      
      // Update store - this will clear any stale organizations from localStorage
      setUserOrgs(orgsWithRole);
      
      // If no organizations, explicitly clear currentOrg
      if (orgsWithRole.length === 0) {
        setCurrentOrg(null);
      }
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      // On error, clear organizations to avoid showing stale data
      setUserOrgs([]);
      setCurrentOrg(null);
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new organization
  const createOrganization = async (data: CreateOrganizationRequest) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });
      
      const result: ApiResponse<CreateOrganizationResponse> = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create organization');
      }
      
      const newOrg = {
        ...result.data!.organization,
        role: result.data!.membership.role,
      };
      
      addOrganization(newOrg);
      return { success: true, data: newOrg };
    } catch (err: any) {
      console.error('Error creating organization:', err);
      return { success: false, error: err.message };
    }
  };

  // Update an organization
  const updateOrganization = async (orgId: string, data: { name: string }) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data),
      });
      
      const result: ApiResponse<any> = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update organization');
      }
      
      // Update local state with all returned data from server
      updateOrgInStore(orgId, { 
        name: result.data.name,
        updated_at: result.data.updated_at 
      });
      
      return { success: true, data: result.data };
    } catch (err: any) {
      console.error('Error updating organization:', err);
      return { success: false, error: err.message };
    }
  };

  // Delete an organization
  const deleteOrganization = async (orgId: string) => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/organizations/${orgId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      const result: ApiResponse<any> = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete organization');
      }
      
      // If deleted current org, switch to first available
      if (currentOrg?.id === orgId && userOrgs.length > 1) {
        const nextOrg = userOrgs.find(org => org.id !== orgId);
        if (nextOrg) {
          switchOrganization(nextOrg.id);
        }
      }
      
      await fetchOrganizations(); // Refresh list
      return { success: true };
    } catch (err: any) {
      console.error('Error deleting organization:', err);
      return { success: false, error: err.message };
    }
  };
  
  // Subscribe to organization changes
  useEffect(() => {
    fetchOrganizations();
    
    // Set up real-time subscription for organization changes
    const subscription = supabaseBrowser
      .channel('organizations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
        },
        () => {
          fetchOrganizations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
        },
        () => {
          fetchOrganizations();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    currentOrg,
    userOrgs,
    isLoading,
    fetchOrganizations,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    switchOrganization,
    canManageTeam,
    canCreateAnalysis,
    canInviteMembers,
    isAdmin,
    isOwner,
    userRole: currentOrg?.role,
  };
}
