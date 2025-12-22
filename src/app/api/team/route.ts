// API route for team management
// GET /api/team?organizationId=xxx - Get team members and invitations
// PATCH /api/team/[memberId] - Update member role
// DELETE /api/team/[memberId] - Remove member

import { NextRequest } from 'next/server';
import {
  withOrgPermission,
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  getOrgIdFromUrl,
  parseBody,
} from '@/lib/api-middleware';
import type { TeamListResponse, UpdateMemberRoleRequest } from '@/types';

export async function GET(request: NextRequest) {
  const organizationId = getOrgIdFromUrl(request);
  
  if (!organizationId) {
    return errorResponse('Organization ID is required');
  }
  
  return withOrgPermission(
    request,
    organizationId,
    ['owner', 'admin', 'member', 'viewer'],
    async (req, userId, userRole) => {
      const supabase = await createSupabaseServerClient();
      
      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          role,
          joined_at,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', organizationId)
        .order('joined_at', { ascending: true });
      
      if (membersError) {
        console.error('Error fetching members:', membersError);
        return errorResponse('Failed to fetch team members', 500);
      }
      
      // Fetch pending invitations (only for admin/owner)
      let invitationsData: any[] = [];
      if (userRole === 'owner' || userRole === 'admin') {
        const { data, error: invError } = await supabase
          .from('organization_invitations')
          .select('id, email, role, invited_by, expires_at, created_at')
          .eq('organization_id', organizationId)
          .is('accepted_at', null)
          .order('created_at', { ascending: false });
        
        if (!invError) {
          invitationsData = data || [];
        }
      }
      
      // Transform members data
      const members = membersData.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        profile: {
          full_name: m.profiles?.full_name || null,
          email: m.profiles?.email || null,
          avatar_url: m.profiles?.avatar_url || null,
        },
      }));
      
      return successResponse<TeamListResponse>({
        members,
        invitations: invitationsData,
      });
    }
  );
}
