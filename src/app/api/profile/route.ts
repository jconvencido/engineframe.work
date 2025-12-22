// API route for user profile management
// GET /api/profile - Get current user's profile
// PATCH /api/profile - Update current user's profile

import { NextRequest } from 'next/server';
import {
  withAuth,
  createSupabaseServerClient,
  errorResponse,
  successResponse,
  parseBody,
} from '@/lib/api-middleware';
import type { UpdateProfileRequest, ProfileResponse } from '@/types';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    const supabase = await createSupabaseServerClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return errorResponse('Failed to fetch profile', 500);
    }
    
    if (!profile) {
      return errorResponse('Profile not found', 404);
    }
    
    return successResponse<ProfileResponse>({ profile });
  });
}

export async function PATCH(request: NextRequest) {
  return withAuth(request, async (req, userId) => {
    const body = await parseBody<UpdateProfileRequest>(request);
    
    if (!body) {
      return errorResponse('Invalid request body');
    }
    
    const supabase = await createSupabaseServerClient();
    
    // Build update object with only provided fields
    const updateData: Partial<UpdateProfileRequest> & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.full_name !== undefined) updateData.full_name = body.full_name;
    if (body.phone_number !== undefined) updateData.phone_number = body.phone_number;
    if (body.job_title !== undefined) updateData.job_title = body.job_title;
    if (body.company !== undefined) updateData.company = body.company;
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return errorResponse('Failed to update profile', 500);
    }
    
    return successResponse<ProfileResponse>({ profile }, 'Profile updated successfully');
  });
}
