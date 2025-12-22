// API route for advisor modes
// GET /api/advisor-modes?organizationId=xxx - Get available advisor modes

import { NextRequest } from 'next/server';
import {
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  getOrgIdFromUrl,
} from '@/lib/api-middleware';
import type { AdvisorModeListResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const organizationId = getOrgIdFromUrl(request);
    const supabase = await createSupabaseServerClient();
    
    // Try to get user, but don't require authentication for global modes
    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }
    
    // Build query for advisor modes
    let query = supabase
      .from('advisor_modes')
      .select('*')
      .order('created_at', { ascending: true });
    
    // If requesting org-specific modes, require authentication
    if (organizationId) {
      if (!userId) {
        return errorResponse('Authentication required for organization modes', 401);
      }
      query = query.or(`is_global.eq.true,organization_id.eq.${organizationId}`);
    } else {
      // Public access: only return global modes
      query = query.eq('is_global', true);
    }
    
    const { data: modes, error } = await query;
    
    if (error) {
      console.error('Error fetching advisor modes:', error);
      return errorResponse('Failed to fetch advisor modes', 500);
    }
    
    return successResponse<AdvisorModeListResponse>({ modes: modes || [] });
  } catch (error: any) {
    console.error('Error in advisor modes route:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
}
