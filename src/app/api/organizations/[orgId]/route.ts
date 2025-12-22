// API route for individual organization management
// PATCH /api/organizations/[orgId] - Update organization (owners/admins)
// DELETE /api/organizations/[orgId] - Delete organization (owners only)

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  parseBody,
} from '@/lib/api-middleware';

type RouteContext = {
  params: Promise<{ orgId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req, userId) => {
    const { orgId } = await context.params;
    const body = await parseBody<{ name: string }>(request);
    
    if (!body || !body.name?.trim()) {
      return errorResponse('Organization name is required');
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Update organization (RLS will ensure user is owner or admin)
    const { data, error } = await supabase
      .from('organizations')
      .update({ 
        name: body.name.trim(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', orgId)
      .select('id, name, slug, created_at, updated_at')
      .single();
    
    if (error) {
      // Check if it's a permission error
      if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
        return errorResponse('Organization not found or you do not have permission to update it', 403);
      }
      console.error('Error updating organization:', error);
      return errorResponse(error.message || 'Failed to update organization', 500);
    }
    
    return successResponse(data, 'Organization updated successfully');
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withAuth(request, async (req, userId) => {
    const { orgId } = await context.params;
    
    const supabase = await createSupabaseServerClient();
    
    // Delete organization (RLS will ensure user is owner)
    // CASCADE will automatically delete:
    // - organization_members
    // - organization_invitations
    // - analyses
    // - advisor_modes
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);
    
    if (error) {
      // Check if it's a permission error
      if (error.code === 'PGRST116' || error.message.includes('0 rows')) {
        return errorResponse('Organization not found or you do not have permission to delete it', 403);
      }
      console.error('Error deleting organization:', error);
      return errorResponse(error.message || 'Failed to delete organization', 500);
    }
    
    return successResponse({ id: orgId }, 'Organization deleted successfully');
  });
}
