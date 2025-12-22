// API route for managing invitations
// DELETE /api/invitations/[invitationId] - Cancel invitation
// POST /api/invitations/accept - Accept invitation

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  parseBody,
} from '@/lib/api-middleware';
import type { AcceptInvitationRequest } from '@/types';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  return withAuth(request, async (req, userId) => {
    const { invitationId } = await params;
    const supabase = await createSupabaseServerClient();
    
    // Get the invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('organization_invitations')
      .select('organization_id, invited_by')
      .eq('id', invitationId)
      .single();
    
    if (fetchError || !invitation) {
      return errorResponse('Invitation not found', 404);
    }
    
    // Check if user has permission (owner/admin or the person who sent the invite)
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', userId)
      .single();
    
    if (memberError || !membership) {
      return errorResponse('Not authorized', 403);
    }
    
    const canCancel =
      membership.role === 'owner' ||
      membership.role === 'admin' ||
      invitation.invited_by === userId;
    
    if (!canCancel) {
      return errorResponse('Insufficient permissions', 403);
    }
    
    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitationId);
    
    if (deleteError) {
      console.error('Error canceling invitation:', deleteError);
      return errorResponse('Failed to cancel invitation', 500);
    }
    
    return successResponse(null, 'Invitation canceled successfully');
  });
}
