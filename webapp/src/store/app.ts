import { create } from 'zustand';
import type { TelegramUser } from '../lib/telegram';

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppState {
  user: TelegramUser | null;
  setUser: (user: TelegramUser) => void;
  
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  toast: Toast | null;
  showToast: (message: string, type: Toast['type']) => void;
  hideToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  isLoading: false,
  setLoading: (isLoading) => set({ isLoading }),
  
  toast: null,
  showToast: (message, type) => {
    set({ toast: { message, type } });
    // Auto-hide after 3 seconds
    setTimeout(() => {
      set({ toast: null });
    }, 3000);
  },
  hideToast: () => set({ toast: null }),
}));

