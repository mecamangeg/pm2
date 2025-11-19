export interface PM2Process {
  pm_id: number;
  name: string;
  pid: number;
  pm2_env: PM2Environment;
  monit: PM2Monit;
}

export interface PM2Environment {
  pm_id: number;
  name: string;
  namespace: string;
  version: string;
  status: PM2Status;
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
  pm_pid_path: string;
  vizion: boolean;
  axm_monitor: Record<string, unknown>;
  axm_options: Record<string, unknown>;
  axm_actions: unknown[];
  max_memory_restart?: number;
  cron_restart?: string;
}

export type PM2Status =
  | 'online'
  | 'stopping'
  | 'stopped'
  | 'launching'
  | 'errored'
  | 'one-launch-status';

export interface PM2Monit {
  memory: number;
  cpu: number;
}

export interface ProcessConfig {
  name: string;
  script: string;
  cwd?: string;
  args?: string | string[];
  instances?: number | 'max';
  exec_mode?: 'fork' | 'cluster';
  env?: Record<string, string | number>;
  max_memory_restart?: string;
  max_restarts?: number;
  min_uptime?: number;
  autorestart?: boolean;
  watch?: boolean;
  ignore_watch?: string[];
  cron_restart?: string;
  interpreter?: string;
  interpreter_args?: string[];
  out_file?: string;
  error_file?: string;
  log_file?: string;
  time?: boolean;
  // Windows optimization fields
  windowsHide?: boolean;
  restart_delay?: number;
  kill_timeout?: number;
  listen_timeout?: number;
  shutdown_with_message?: boolean;
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

export interface LogEntry {
  id: string;
  processId: number;
  processName: string;
  type: 'out' | 'err' | 'pm2';
  message: string;
  timestamp: number;
}
