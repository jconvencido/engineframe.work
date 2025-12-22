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
  updateOrganization: (orgId: string, updates: Partial<Organization>) => void;
  removeOrganization: (orgId: string) => void;
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
        
        // If current org exists in the new list, update it with fresh data
        if (state.currentOrg) {
          const updatedCurrentOrg = orgs.find(o => o.id === state.currentOrg?.id);
          if (updatedCurrentOrg) {
            set({ currentOrg: updatedCurrentOrg });
          } else if (orgs.length > 0) {
            // Current org not found, set first one
            set({ currentOrg: orgs[0] });
          } else {
            set({ currentOrg: null });
          }
        } else if (orgs.length > 0) {
          // No current org, set the first one
          set({ currentOrg: orgs[0] });
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
      
      updateOrganization: (orgId, updates) => {
        const state = get();
        
        // Update userOrgs array
        const updatedOrgs = state.userOrgs.map(org => 
          org.id === orgId ? { ...org, ...updates } : org
        );
        
        // If the updated org is the current org, find the updated version from the array
        let newCurrentOrg = state.currentOrg;
        if (state.currentOrg?.id === orgId) {
          newCurrentOrg = updatedOrgs.find(org => org.id === orgId) || state.currentOrg;
        }
        
        set({ 
          userOrgs: updatedOrgs,
          currentOrg: newCurrentOrg
        });
      },
      
      removeOrganization: (orgId) => {
        const state = get();
        const filteredOrgs = state.userOrgs.filter(o => o.id !== orgId);
        set({ 
          userOrgs: filteredOrgs,
          currentOrg: state.currentOrg?.id === orgId 
            ? (filteredOrgs[0] || null) 
            : state.currentOrg
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
