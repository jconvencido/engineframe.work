// API request and response types

import type { UserRole, Profile, Organization, OrganizationMember, AdvisorMode, Analysis, Conversation, ConversationMessage } from './database';

// Standard API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
}

// Profile API types
export interface UpdateProfileRequest {
  full_name?: string;
  phone_number?: string;
  job_title?: string;
  company?: string;
}

export interface ProfileResponse {
  profile: Profile;
}

// Organization API types
export interface CreateOrganizationRequest {
  name: string;
  description?: string;
}

export interface CreateOrganizationResponse {
  organization: Organization;
  membership: OrganizationMember;
}

export interface OrganizationListResponse {
  organizations: Array<{
    id: string;
    name: string;
    description: string | null;
    role: UserRole;
    created_at: string;
  }>;
}

// Team API types
export interface TeamMember {
  id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

export interface TeamListResponse {
  members: TeamMember[];
  invitations: TeamInvitation[];
}

export interface InviteMemberRequest {
  email: string;
  role: UserRole;
}

export interface UpdateMemberRoleRequest {
  role: UserRole;
}

export interface AcceptInvitationRequest {
  token: string;
}

// Advisor Mode API types
export interface AdvisorModeListResponse {
  modes: AdvisorMode[];
}

// Analysis API types
export interface CreateAnalysisRequest {
  query: string;
  advisorMode: string;
  organizationId: string;
}

export interface AnalysisSection {
  title: string;
  content: string;
}

export interface CreateAnalysisResponse {
  analysisId: string;
  sections: AnalysisSection[];
}

// Conversation API types
export interface ConversationListResponse {
  conversations: Conversation[];
}

export interface ConversationDetailResponse {
  conversation: Conversation;
  messages: ConversationMessage[];
}

export interface CreateConversationRequest {
  organization_id: string;
  advisor_mode_id: string;
  title: string;
  is_shared?: boolean;
}

export interface UpdateConversationRequest {
  title?: string;
  is_shared?: boolean;
}

export interface CreateMessageRequest {
  role: 'user' | 'assistant';
  content: string;
  sections?: Array<{ section_name: string; content: string }>;
}

// Permission check types
export interface PermissionContext {
  userId: string;
  organizationId: string;
  requiredRole?: UserRole;
}
