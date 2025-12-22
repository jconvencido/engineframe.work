// API route for organizations management
// GET /api/organizations - Get all user's organizations
// POST /api/organizations - Create a new organization

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  parseBody,
} from '@/lib/api-middleware';
import type { CreateOrganizationRequest, CreateOrganizationResponse, OrganizationListResponse } from '@/types';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    const supabase = await createSupabaseServerClient();
    
    // First, get the user's organization memberships directly
    // This query should work with RLS since we're filtering by the authenticated user's ID
    const { data: userMemberships, error: memberError } = await supabase
      .from('organization_members')
      .select('organization_id, role, joined_at')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true });
    
    if (memberError) {
      console.error('Error fetching user memberships:', {
        error: memberError,
        userId,
        message: memberError.message,
        details: memberError.details,
        hint: memberError.hint,
      });
      return errorResponse('Failed to fetch organization memberships', 500);
    }
    
    // If no memberships, return empty array
    if (!userMemberships || userMemberships.length === 0) {
      return successResponse<OrganizationListResponse>({ organizations: [] });
    }
    
    // Get organization details for each membership
    const orgIds = userMemberships.map(m => m.organization_id);
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at')
      .in('id', orgIds);
    
    if (orgsError) {
      console.error('Error fetching organization details:', {
        error: orgsError,
        orgIds,
        message: orgsError.message,
        details: orgsError.details,
        hint: orgsError.hint,
      });
      return errorResponse('Failed to fetch organization details', 500);
    }
    
    // Combine memberships with organization details
    const organizations = userMemberships.map(membership => {
      const org = orgs?.find(o => o.id === membership.organization_id);
      return {
        id: membership.organization_id,
        name: org?.name || 'Unknown',
        description: null, // description column doesn't exist in schema
        role: membership.role,
        created_at: org?.created_at || new Date().toISOString(),
      };
    }).filter(org => org.name !== 'Unknown'); // Filter out organizations we couldn't find
    
    return successResponse<OrganizationListResponse>({ organizations });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    const body = await parseBody<CreateOrganizationRequest>(request);
    
    if (!body || !body.name?.trim()) {
      return errorResponse('Organization name is required');
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Generate slug from name (simple slugification)
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Use RPC function to create organization and membership
    const { data, error } = await supabase
      .rpc('create_organization', {
        org_name: body.name,
        org_slug: slug,
      });
    
    if (error) {
      console.error('Error creating organization:', error);
      return errorResponse(error.message || 'Failed to create organization', 500);
    }
    
    // The RPC function returns the organization as JSON
    const organization = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Fetch the membership
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('user_id', userId)
      .single();
    
    if (memberError) {
      console.error('Error fetching membership:', memberError);
    }
    
    return successResponse<CreateOrganizationResponse>(
      {
        organization,
        membership: membership!,
      },
      'Organization created successfully'
    );
  });
}
