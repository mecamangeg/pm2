import { create } from 'zustand';
import { Process } from '@/types';

interface ProcessStore {
  processes: Process[];
  selectedProcessId: number | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProcesses: (processes: Process[]) => void;
  updateProcess: (id: number, updates: Partial<Process>) => void;
  removeProcess: (id: number) => void;
  selectProcess: (id: number | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useProcessStore = create<ProcessStore>((set) => ({
  processes: [],
  selectedProcessId: null,
  isLoading: true,
  error: null,

  setProcesses: (processes) =>
    set({
      processes,
      isLoading: false,
      error: null,
    }),

  updateProcess: (id, updates) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.pm_id === id ? { ...p, ...updates } : p
      ),
    })),

  removeProcess: (id) =>
    set((state) => ({
      processes: state.processes.filter((p) => p.pm_id !== id),
      selectedProcessId:
        state.selectedProcessId === id ? null : state.selectedProcessId,
    })),

  selectProcess: (id) => set({ selectedProcessId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  reset: () =>
    set({
      processes: [],
      selectedProcessId: null,
      isLoading: true,
      error: null,
    }),
}));

// Selectors
export const useSelectedProcess = () =>
  useProcessStore((state) => {
    if (state.selectedProcessId === null) return null;
    return state.processes.find((p) => p.pm_id === state.selectedProcessId) || null;
  });

export const useProcessById = (id: number) =>
  useProcessStore((state) => state.processes.find((p) => p.pm_id === id));

export const useProcessStats = () =>
  useProcessStore((state) => {
    const total = state.processes.length;
    const online = state.processes.filter(
      (p) => p.pm2_env.status === 'online'
    ).length;
    const stopped = state.processes.filter(
      (p) => p.pm2_env.status === 'stopped'
    ).length;
    const errored = state.processes.filter(
      (p) => p.pm2_env.status === 'errored'
    ).length;

    return { total, online, stopped, errored };
  });
