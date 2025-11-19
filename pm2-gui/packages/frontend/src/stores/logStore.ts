import { create } from 'zustand';
import { LogEntry } from '@/types';

interface LogFilters {
  processId: number | 'all';
  type: 'all' | 'out' | 'err' | 'pm2';
  search: string;
}

interface LogStore {
  logs: LogEntry[];
  filters: LogFilters;
  isPaused: boolean;
  maxLogs: number;

  // Actions
  addLog: (entry: LogEntry) => void;
  addLogs: (entries: LogEntry[]) => void;
  clearLogs: () => void;
  setFilter: (filter: Partial<LogFilters>) => void;
  togglePause: () => void;
  setPaused: (paused: boolean) => void;
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  filters: {
    processId: 'all',
    type: 'all',
    search: '',
  },
  isPaused: false,
  maxLogs: 10000,

  addLog: (entry) =>
    set((state) => {
      if (state.isPaused) return state;

      const newLogs = [...state.logs, entry];
      // Keep only the last maxLogs entries
      if (newLogs.length > state.maxLogs) {
        return { logs: newLogs.slice(-state.maxLogs) };
      }
      return { logs: newLogs };
    }),

  addLogs: (entries) =>
    set((state) => {
      if (state.isPaused) return state;

      const newLogs = [...state.logs, ...entries];
      if (newLogs.length > state.maxLogs) {
        return { logs: newLogs.slice(-state.maxLogs) };
      }
      return { logs: newLogs };
    }),

  clearLogs: () => set({ logs: [] }),

  setFilter: (filter) =>
    set((state) => ({
      filters: { ...state.filters, ...filter },
    })),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  setPaused: (isPaused) => set({ isPaused }),
}));

// Selector for filtered logs
export const useFilteredLogs = () =>
  useLogStore((state) => {
    let filtered = state.logs;

    // Filter by process
    if (state.filters.processId !== 'all') {
      filtered = filtered.filter(
        (log) => log.processId === state.filters.processId
      );
    }

    // Filter by type
    if (state.filters.type !== 'all') {
      filtered = filtered.filter((log) => log.type === state.filters.type);
    }

    // Filter by search
    if (state.filters.search) {
      const search = state.filters.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(search) ||
          log.processName.toLowerCase().includes(search)
      );
    }

    return filtered;
  });
