import { PM2Process, LogEntry } from './pm2';

export type WSMessageType =
  | 'PROCESS_LIST_UPDATE'
  | 'PROCESS_EVENT'
  | 'LOG_MESSAGE'
  | 'METRICS_UPDATE'
  | 'SUBSCRIBE_LOGS'
  | 'UNSUBSCRIBE_LOGS'
  | 'CONNECTION_STATUS'
  | 'ERROR';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  data: T;
  timestamp: number;
}

export interface ProcessListUpdateData {
  processes: PM2Process[];
}

export interface ProcessEventData {
  processId: number;
  processName: string;
  event: 'online' | 'stopped' | 'errored' | 'restart' | 'exit';
  timestamp: number;
}

export interface LogMessageData extends LogEntry {}

export interface MetricsUpdateData {
  processId: number;
  cpu: number;
  memory: number;
}

export interface SubscribeLogsData {
  processId: number | 'all';
}

export interface UnsubscribeLogsData {
  processId: number | 'all';
}

export interface ConnectionStatusData {
  connected: boolean;
  pm2Connected: boolean;
}

export interface ErrorData {
  message: string;
  code?: string;
}
