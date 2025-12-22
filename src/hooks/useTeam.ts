// Custom hook for team management

import { useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import type { TeamMember, TeamInvitation, InviteMemberRequest, UpdateMemberRoleRequest, ApiResponse, TeamListResponse } from '@/types';

export function useTeam(organizationId: string | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch team data
  const fetchTeam = useCallback(async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/team?organizationId=${organizationId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      const result: ApiResponse<TeamListResponse> = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch team');
      }
      
      setMembers(result.data!.members);
      setInvitations(result.data!.invitations);
    } catch (err: any) {
      console.error('Error fetching team:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);
  
  // Update member role
  const updateMemberRole = async (memberId: string, role: UpdateMemberRoleRequest) => {
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(role),
      });
      
      const result: ApiResponse = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update member role');
      }
      
      await fetchTeam();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating member role:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  // Remove member
  const removeMember = async (memberId: string) => {
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      const result: ApiResponse = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to remove member');
      }
      
      await fetchTeam();
      return { success: true };
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    setError(null);
    
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      const result: ApiResponse = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to cancel invitation');
      }
      
      await fetchTeam();
      return { success: true };
    } catch (err: any) {
      console.error('Error canceling invitation:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };
  
  return {
    members,
    invitations,
    isLoading,
    error,
    fetchTeam,
    updateMemberRole,
    removeMember,
    cancelInvitation,
  };
}
