import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';
type ViewMode = 'table' | 'grid';

interface SettingsStore {
  theme: Theme;
  viewMode: ViewMode;
  refreshInterval: number;
  showNotifications: boolean;
  autoScroll: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  setViewMode: (mode: ViewMode) => void;
  setRefreshInterval: (interval: number) => void;
  setShowNotifications: (show: boolean) => void;
  setAutoScroll: (auto: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      viewMode: 'table',
      refreshInterval: 2000,
      showNotifications: true,
      autoScroll: true,

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      setViewMode: (viewMode) => set({ viewMode }),

      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),

      setShowNotifications: (showNotifications) => set({ showNotifications }),

      setAutoScroll: (autoScroll) => set({ autoScroll }),
    }),
    {
      name: 'pm2-gui-settings',
    }
  )
);

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
}

// Initialize theme on load
export function initializeTheme() {
  const theme = useSettingsStore.getState().theme;
  applyTheme(theme);
}
