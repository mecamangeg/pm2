import { apiClient } from './client';
import { Process, SystemInfo, ProcessConfig } from '@/types';
// System and process API endpoints v2 - with shutdown support

// Process endpoints
export const processesApi = {
  list: async (): Promise<Process[]> => {
    const response = await apiClient.get<{ processes: Process[] }>('/processes');
    return response.data.processes;
  },

  get: async (id: number | string): Promise<Process> => {
    const response = await apiClient.get<{ process: Process }>(`/processes/${id}`);
    return response.data.process;
  },

  start: async (config: ProcessConfig): Promise<Process[]> => {
    const response = await apiClient.post<{ processes: Process[] }>(
      '/processes',
      config
    );
    return response.data.processes;
  },

  restart: async (id: number | string): Promise<void> => {
    await apiClient.post(`/processes/${id}/restart`);
  },

  stop: async (id: number | string): Promise<void> => {
    await apiClient.post(`/processes/${id}/stop`);
  },

  reload: async (id: number | string): Promise<void> => {
    await apiClient.post(`/processes/${id}/reload`);
  },

  reset: async (id: number | string): Promise<void> => {
    await apiClient.post(`/processes/${id}/reset`);
  },

  delete: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/processes/${id}`);
  },

  restartAll: async (): Promise<void> => {
    await apiClient.post('/processes/restart-all');
  },

  stopAll: async (): Promise<void> => {
    await apiClient.post('/processes/stop-all');
  },

  scale: async (id: number | string, instances: number | 'max'): Promise<void> => {
    await apiClient.post(`/processes/${id}/scale`, { instances });
  },
};

// Ecosystem endpoints
export const ecosystemApi = {
  export: async (): Promise<{ apps: ProcessConfig[] }> => {
    const response = await apiClient.get<{ ecosystem: { apps: ProcessConfig[] } }>(
      '/processes/ecosystem'
    );
    return response.data.ecosystem;
  },

  import: async (
    apps: ProcessConfig[]
  ): Promise<Array<{ name: string; status: string; error?: string }>> => {
    const response = await apiClient.post<{
      results: Array<{ name: string; status: string; error?: string }>;
    }>('/processes/ecosystem', { apps });
    return response.data.results;
  },
};

// System endpoints
export const systemApi = {
  getInfo: async (): Promise<SystemInfo> => {
    const response = await apiClient.get<{ info: SystemInfo }>('/system/info');
    return response.data.info;
  },

  dump: async (): Promise<void> => {
    await apiClient.post('/system/dump');
  },

  resurrect: async (): Promise<void> => {
    await apiClient.post('/system/resurrect');
  },

  shutdown: async (): Promise<void> => {
    await apiClient.post('/system/shutdown');
  },

  getPorts: async (): Promise<PortScanResult> => {
    const response = await apiClient.get<PortScanResult>('/system/ports');
    return response.data;
  },

  checkPort: async (port: number): Promise<{ port: number; available: boolean }> => {
    const response = await apiClient.get<{ port: number; available: boolean }>(
      `/system/ports/check/${port}`
    );
    return response.data;
  },

  suggestPorts: async (
    preferredPort: number,
    count?: number
  ): Promise<{ preferredPort: number; available: boolean; suggestions: number[] }> => {
    const response = await apiClient.get<{
      preferredPort: number;
      available: boolean;
      suggestions: number[];
    }>(`/system/ports/suggest/${preferredPort}${count ? `?count=${count}` : ''}`);
    return response.data;
  },

  killProcess: async (pid: number): Promise<void> => {
    await apiClient.post(`/system/ports/kill/${pid}`);
  },
};

// Port types
export interface PortInfo {
  port: number;
  protocol: 'TCP' | 'UDP';
  state: string;
  pid: number;
  processName: string;
  isOrphaned: boolean;
  isPM2GUI: boolean;
  pm2ProcessName?: string;
}

export interface PortScanResult {
  gui: PortInfo[];
  pm2: PortInfo[];
  orphaned: PortInfo[];
  total: number;
}

// Logs endpoints
export const logsApi = {
  flush: async (id: number | string): Promise<void> => {
    await apiClient.post(`/logs/${id}/flush`);
  },

  flushAll: async (): Promise<void> => {
    await apiClient.post('/logs/flush-all');
  },
};
