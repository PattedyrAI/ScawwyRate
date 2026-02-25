import { create } from 'zustand';

interface UIState {
  isTabBarVisible: boolean;
  setTabBarVisible: (visible: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isTabBarVisible: true,
  setTabBarVisible: (isTabBarVisible) => set({ isTabBarVisible }),
}));
