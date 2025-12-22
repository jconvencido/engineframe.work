// API route for accepting invitations
// POST /api/invitations/accept

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  parseBody,
} from '@/lib/api-middleware';
import type { AcceptInvitationRequest } from '@/types';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    const body = await parseBody<AcceptInvitationRequest>(request);
    
    if (!body || !body.token) {
      return errorResponse('Invitation token is required');
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Get user email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return errorResponse('User email not found', 400);
    }
    
    // Find the invitation
    const { data: invitation, error: invError } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('token', body.token)
      .eq('email', user.email)
      .is('accepted_at', null)
      .single();
    
    if (invError || !invitation) {
      return errorResponse('Invalid or expired invitation', 404);
    }
    
    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      return errorResponse('Invitation has expired', 400);
    }
    
    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', invitation.organization_id)
      .eq('user_id', userId)
      .single();
    
    if (existingMember) {
      return errorResponse('Already a member of this organization', 400);
    }
    
    // Add user to organization
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: userId,
        role: invitation.role,
      });
    
    if (memberError) {
      console.error('Error adding member:', memberError);
      return errorResponse('Failed to join organization', 500);
    }
    
    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id);
    
    if (updateError) {
      console.error('Error updating invitation:', updateError);
    }
    
    // Fetch organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', invitation.organization_id)
      .single();
    
    return successResponse(
      {
        organization,
        role: invitation.role,
      },
      'Successfully joined organization'
    );
  });
}
