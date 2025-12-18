'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

interface OrganizationContextType {
  currentOrg: Organization | null;
  userOrgs: Organization[];
  userRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  isLoading: boolean;
  switchOrganization: (orgId: string) => void;
  refreshOrganizations: () => Promise<void>;
  canManageTeam: () => boolean;
  canManageBilling: () => boolean;
  canManageModes: () => boolean;
  canCreateAnalysis: () => boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrganizations = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Load all organizations user is a member of
      const { data: memberships } = await supabaseBrowser
        .from('organization_members')
        .select('organization_id, role, organizations(*)')
        .eq('user_id', session.user.id);

      if (memberships && memberships.length > 0) {
        const orgs = memberships.map((m: any) => m.organizations).filter(Boolean);
        setUserOrgs(orgs);

        // Get current org from localStorage or default to first
        const storedOrgId = localStorage.getItem('currentOrgId');
        const currentOrgData = storedOrgId 
          ? orgs.find((org: Organization) => org.id === storedOrgId) || orgs[0]
          : orgs[0];

        setCurrentOrg(currentOrgData);

        // Set user role for current org
        const currentMembership = memberships.find(
          (m: any) => m.organizations?.id === currentOrgData.id
        );
        setUserRole(currentMembership?.role || null);

        // Save to localStorage
        localStorage.setItem('currentOrgId', currentOrgData.id);
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const switchOrganization = (orgId: string) => {
    const org = userOrgs.find(o => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      localStorage.setItem('currentOrgId', orgId);
      
      // Update user role for new org
      supabaseBrowser
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', supabaseBrowser.auth.getUser().then((u: any) => u.data.user?.id))
        .single()
        .then(({ data }: { data: any }) => {
          if (data) setUserRole(data.role);
        });
      
      // Reload page to refresh data
      window.location.reload();
    }
  };

  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  // Permission helpers
  const canManageTeam = () => {
    return userRole === 'owner' || userRole === 'admin';
  };

  const canManageBilling = () => {
    return userRole === 'owner' || userRole === 'admin';
  };

  const canManageModes = () => {
    return userRole === 'owner' || userRole === 'admin';
  };

  const canCreateAnalysis = () => {
    return userRole === 'owner' || userRole === 'admin' || userRole === 'member';
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrg,
        userOrgs,
        userRole,
        isLoading,
        switchOrganization,
        refreshOrganizations,
        canManageTeam,
        canManageBilling,
        canManageModes,
        canCreateAnalysis,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
