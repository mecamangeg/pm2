export interface Process {
  pm_id: number;
  name: string;
  pid: number;
  pm2_env: ProcessEnvironment;
  monit: ProcessMonit;
}

export interface ProcessEnvironment {
  pm_id: number;
  name: string;
  namespace: string;
  version: string;
  status: ProcessStatus;
  pm_exec_path: string;
  pm_cwd: string;
  exec_mode: 'fork' | 'cluster';
  instances: number;
  restart_time: number;
  unstable_restarts: number;
  created_at: number;
  pm_uptime: number;
  env: Record<string, string>;
  args: string[];
  node_args: string[];
  max_restarts: number;
  min_uptime: number;
  autorestart: boolean;
  watch: boolean;
  exec_interpreter: string;
  pm_out_log_path: string;
  pm_err_log_path: string;
  pm_pid_path?: string;
  max_memory_restart?: string;
  cron_restart?: string;
  node_version?: string;
  kill_timeout?: number;
  merge_logs?: boolean;
}

export type ProcessStatus =
  | 'online'
  | 'stopping'
  | 'stopped'
  | 'launching'
  | 'errored'
  | 'one-launch-status';

export interface ProcessMonit {
  memory: number;
  cpu: number;
}

export interface LogEntry {
  id: string;
  processId: number;
  processName: string;
  type: 'out' | 'err' | 'pm2';
  message: string;
  timestamp: number;
}

export interface SystemInfo {
  hostname: string;
  platform: string;
  arch: string;
  uptime: number;
  nodeVersion: string;
  pm2Version: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
}

export interface ProcessConfig {
  name: string;
  script: string;
  cwd?: string;
  args?: string[];
  instances?: number | 'max';
  exec_mode?: 'fork' | 'cluster';
  env?: Record<string, string>;
  max_memory_restart?: string;
  max_restarts?: number;
  min_uptime?: number;
  autorestart?: boolean;
  watch?: boolean;
  ignore_watch?: string[];
  cron_restart?: string;
  interpreter?: string;
}

// WebSocket message types
export type WSMessageType =
  | 'PROCESS_LIST_UPDATE'
  | 'PROCESS_EVENT'
  | 'LOG_MESSAGE'
  | 'METRICS_UPDATE'
  | 'CONNECTION_STATUS'
  | 'ERROR';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  data: T;
  timestamp: number;
}
