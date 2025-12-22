// API route for updating team member role
// PATCH /api/team/[memberId]

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  parseBody,
} from '@/lib/api-middleware';
import type { UpdateMemberRoleRequest } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return withAuth(request, async (req, userId) => {
    const { memberId } = await params;
    const body = await parseBody<UpdateMemberRoleRequest>(request);
    
    if (!body || !body.role) {
      return errorResponse('Role is required');
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Get the member being updated
    const { data: targetMember, error: fetchError } = await supabase
      .from('organization_members')
      .select('organization_id, user_id, role')
      .eq('id', memberId)
      .single();
    
    if (fetchError || !targetMember) {
      return errorResponse('Member not found', 404);
    }
    
    // Check if requester has permission
    const { data: requesterMember, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', targetMember.organization_id)
      .eq('user_id', userId)
      .single();
    
    if (reqError || !requesterMember) {
      return errorResponse('Not authorized', 403);
    }
    
    // Only owner and admin can update roles
    if (requesterMember.role !== 'owner' && requesterMember.role !== 'admin') {
      return errorResponse('Insufficient permissions', 403);
    }
    
    // Owner cannot be demoted by anyone
    if (targetMember.role === 'owner') {
      return errorResponse('Cannot change owner role', 403);
    }
    
    // Update the role
    const { data: updatedMember, error: updateError } = await supabase
      .from('organization_members')
      .update({ role: body.role })
      .eq('id', memberId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating member role:', updateError);
      return errorResponse('Failed to update member role', 500);
    }
    
    return successResponse(updatedMember, 'Member role updated successfully');
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  return withAuth(request, async (req, userId) => {
    const { memberId } = await params;
    const supabase = await createSupabaseServerClient();
    
    // Get the member being removed
    const { data: targetMember, error: fetchError } = await supabase
      .from('organization_members')
      .select('organization_id, user_id, role')
      .eq('id', memberId)
      .single();
    
    if (fetchError || !targetMember) {
      return errorResponse('Member not found', 404);
    }
    
    // Check if requester has permission
    const { data: requesterMember, error: reqError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', targetMember.organization_id)
      .eq('user_id', userId)
      .single();
    
    if (reqError || !requesterMember) {
      return errorResponse('Not authorized', 403);
    }
    
    // Only owner and admin can remove members, or users can remove themselves
    const canRemove =
      requesterMember.role === 'owner' ||
      requesterMember.role === 'admin' ||
      targetMember.user_id === userId;
    
    if (!canRemove) {
      return errorResponse('Insufficient permissions', 403);
    }
    
    // Cannot remove owner
    if (targetMember.role === 'owner') {
      return errorResponse('Cannot remove organization owner', 403);
    }
    
    // Remove the member
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);
    
    if (deleteError) {
      console.error('Error removing member:', deleteError);
      return errorResponse('Failed to remove member', 500);
    }
    
    return successResponse(null, 'Member removed successfully');
  });
}
