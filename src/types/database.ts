// Database entity types matching Supabase schema

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  job_title: string | null;
  company: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  joined_at: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface AdvisorMode {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  is_global: boolean;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  organization_id: string;
  user_id: string;
  advisor_mode_id: string;
  query: string;
  created_at: string;
}

export interface AnalysisOutput {
  id: string;
  analysis_id: string;
  section_title: string;
  content: string;
  order_index: number;
  created_at: string;
}

// Extended types with joins
export interface OrganizationWithRole extends Organization {
  role: UserRole;
}

export interface OrganizationMemberWithProfile extends OrganizationMember {
  profile: Profile;
}

export interface InvitationWithDetails extends OrganizationInvitation {
  organization?: Organization;
  inviter_profile?: Profile;
}

export interface AnalysisWithOutputs extends Analysis {
  outputs: AnalysisOutput[];
  advisor_mode?: AdvisorMode;
}
