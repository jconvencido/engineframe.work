// API route for fetching invitation details by token
// GET /api/invitations/by-token/[token]

import { NextRequest } from 'next/server';
import {
  createSupabaseServerClient,
  errorResponse,
  successResponse,
} from '@/lib/api-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { token } = params;
  const supabase = await createSupabaseServerClient();
  
  // Fetch invitation with organization details
  const { data: invitation, error } = await supabase
    .from('organization_invitations')
    .select(`
      *,
      organizations (
        id,
        name,
        description
      )
    `)
    .eq('token', token)
    .is('accepted_at', null)
    .single();
  
  if (error || !invitation) {
    return errorResponse('Invitation not found or already accepted', 404);
  }
  
  // Check if invitation has expired
  if (new Date(invitation.expires_at) < new Date()) {
    return errorResponse('Invitation has expired', 400);
  }
  
  return successResponse({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expires_at: invitation.expires_at,
      organization: invitation.organizations,
    },
  });
}
