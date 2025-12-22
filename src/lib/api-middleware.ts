// API middleware utilities for authentication and authorization

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { UserRole, ApiResponse } from '@/types';

// Create Supabase server client for API routes
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Cookie setting can fail in middleware
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Cookie removal can fail in middleware
          }
        },
      },
    }
  );
}

// Error response helper
export function errorResponse(message: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

// Success response helper
export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    ...(message && { message }),
  });
}

// Extract user from request
export async function getUserFromRequest(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  
  // Check for Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }
    
    return user;
  }
  
  // Fallback to session-based auth
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Authentication middleware
export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, userId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  
  return handler(request, user.id);
}

// Organization permission middleware
export async function withOrgPermission(
  request: NextRequest,
  organizationId: string,
  requiredRole: UserRole | UserRole[],
  handler: (request: NextRequest, userId: string, userRole: UserRole) => Promise<NextResponse>
): Promise<NextResponse> {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }
  
  const supabase = await createSupabaseServerClient();
  
  // Check user's membership and role in the organization
  const { data: membership, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single();
  
  if (error || !membership) {
    return errorResponse('Not a member of this organization', 403);
  }
  
  // Check if user has required role
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const roleHierarchy: UserRole[] = ['owner', 'admin', 'member', 'viewer'];
  const userRoleLevel = roleHierarchy.indexOf(membership.role);
  const hasPermission = allowedRoles.some(role => {
    const requiredLevel = roleHierarchy.indexOf(role);
    return userRoleLevel <= requiredLevel;
  });
  
  if (!hasPermission) {
    return errorResponse('Insufficient permissions', 403);
  }
  
  return handler(request, user.id, membership.role);
}

// Parse JSON body safely
export async function parseBody<T>(request: NextRequest): Promise<T | null> {
  try {
    return await request.json();
  } catch (error) {
    return null;
  }
}

// Get organization ID from query params
export function getOrgIdFromUrl(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  return searchParams.get('organizationId');
}
