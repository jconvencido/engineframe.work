// Zustand store for organization state

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Organization, UserRole } from '@/types';

interface OrganizationWithRole extends Organization {
  role: UserRole;
}

interface OrganizationState {
  currentOrg: OrganizationWithRole | null;
  userOrgs: OrganizationWithRole[];
  isLoading: boolean;
  
  setCurrentOrg: (org: OrganizationWithRole | null) => void;
  setUserOrgs: (orgs: OrganizationWithRole[]) => void;
  switchOrganization: (orgId: string) => void;
  addOrganization: (org: OrganizationWithRole) => void;
  setLoading: (loading: boolean) => void;
  
  // Permission helpers
  canManageTeam: () => boolean;
  canCreateAnalysis: () => boolean;
  canInviteMembers: () => boolean;
  isAdmin: () => boolean;
  isOwner: () => boolean;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      currentOrg: null,
      userOrgs: [],
      isLoading: true,
      
      setCurrentOrg: (org) => set({ currentOrg: org }),
      
      setUserOrgs: (orgs) => {
        const state = get();
        set({ userOrgs: orgs });
        
        // If current org is not set or not in the list, set the first one
        if (!state.currentOrg || !orgs.find(o => o.id === state.currentOrg?.id)) {
          if (orgs.length > 0) {
            set({ currentOrg: orgs[0] });
          }
        }
      },
      
      switchOrganization: (orgId) => {
        const state = get();
        const org = state.userOrgs.find(o => o.id === orgId);
        if (org) {
          set({ currentOrg: org });
        }
      },
      
      addOrganization: (org) => {
        const state = get();
        set({
          userOrgs: [...state.userOrgs, org],
          currentOrg: org,
        });
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      // Permission helpers
      canManageTeam: () => {
        const role = get().currentOrg?.role;
        return role === 'owner' || role === 'admin';
      },
      
      canCreateAnalysis: () => {
        const role = get().currentOrg?.role;
        return role === 'owner' || role === 'admin' || role === 'member';
      },
      
      canInviteMembers: () => {
        const role = get().currentOrg?.role;
        return role === 'owner' || role === 'admin';
      },
      
      isAdmin: () => {
        const role = get().currentOrg?.role;
        return role === 'admin';
      },
      
      isOwner: () => {
        const role = get().currentOrg?.role;
        return role === 'owner';
      },
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({
        currentOrg: state.currentOrg,
        userOrgs: state.userOrgs,
      }),
    }
  )
);
