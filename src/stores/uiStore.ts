// Zustand store for UI state (modals, dropdowns, etc.)

import { create } from 'zustand';

interface UIState {
  // Modals
  authModalOpen: boolean;
  authMode: 'login' | 'signup';
  
  // Dropdowns
  userMenuOpen: boolean;
  orgMenuOpen: boolean;
  modeDropdownOpen: boolean;
  
  // Actions
  openAuthModal: (mode: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  switchAuthMode: () => void;
  toggleUserMenu: () => void;
  toggleOrgMenu: () => void;
  toggleModeDropdown: () => void;
  closeAllDropdowns: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  authModalOpen: false,
  authMode: 'login',
  userMenuOpen: false,
  orgMenuOpen: false,
  modeDropdownOpen: false,
  
  // Modal actions
  openAuthModal: (mode) =>
    set({
      authModalOpen: true,
      authMode: mode,
    }),
  
  closeAuthModal: () => set({ authModalOpen: false }),
  
  switchAuthMode: () => {
    const currentMode = get().authMode;
    set({ authMode: currentMode === 'login' ? 'signup' : 'login' });
  },
  
  // Dropdown actions
  toggleUserMenu: () => {
    const isOpen = get().userMenuOpen;
    set({
      userMenuOpen: !isOpen,
      orgMenuOpen: false,
      modeDropdownOpen: false,
    });
  },
  
  toggleOrgMenu: () => {
    const isOpen = get().orgMenuOpen;
    set({
      orgMenuOpen: !isOpen,
      userMenuOpen: false,
      modeDropdownOpen: false,
    });
  },
  
  toggleModeDropdown: () => {
    const isOpen = get().modeDropdownOpen;
    set({
      modeDropdownOpen: !isOpen,
      userMenuOpen: false,
      orgMenuOpen: false,
    });
  },
  
  closeAllDropdowns: () =>
    set({
      userMenuOpen: false,
      orgMenuOpen: false,
      modeDropdownOpen: false,
    }),
}));
