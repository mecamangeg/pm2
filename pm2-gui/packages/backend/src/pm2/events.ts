import pm2 from 'pm2';
import { pm2Client } from './client';
import { wsManager } from '../websocket/server';
import { pm2API } from './api';
import { logger } from '../utils/logger';
import { LogEntry } from '../types/pm2';
import { v4 as uuidv4 } from 'uuid';

interface PM2LogPacket {
  process: {
    pm_id: number;
    name: string;
    namespace: string;
  };
  data: string;
  at: number;
}

interface PM2ProcessEventPacket {
  event: string;
  process: {
    pm_id: number;
    name: string;
    pid: number;
  };
  at: number;
}

class PM2EventBus {
  private bus: unknown = null;
  private socket: unknown = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize: number = 10000;

  async initialize(): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.launchBus((err, bus, socket) => {
        if (err) {
          logger.error('Failed to launch PM2 event bus', err);
          reject(err);
          return;
        }

        this.bus = bus;
        this.socket = socket;

        this.setupLogHandlers(bus);
        this.setupProcessEventHandlers(bus);
        this.startMetricsPolling();

        logger.info('PM2 event bus initialized');
        resolve();
      });
    });
  }

  private setupLogHandlers(bus: NodeJS.EventEmitter): void {
    bus.on('log:out', (packet: PM2LogPacket) => {
      this.handleLog(packet, 'out');
    });

    bus.on('log:err', (packet: PM2LogPacket) => {
      this.handleLog(packet, 'err');
    });

    bus.on('log:PM2', (packet: PM2LogPacket) => {
      this.handleLog(packet, 'pm2');
    });
  }

  private handleLog(packet: PM2LogPacket, type: 'out' | 'err' | 'pm2'): void {
    const logEntry: LogEntry = {
      id: uuidv4(),
      processId: packet.process.pm_id,
      processName: packet.process.name,
      type,
      message: packet.data,
      timestamp: packet.at || Date.now(),
    };

    // Add to buffer
    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Broadcast to subscribed clients
    wsManager.broadcastToSubscribers(packet.process.pm_id, {
      type: 'LOG_MESSAGE',
      data: logEntry,
      timestamp: Date.now(),
    });
  }

  private setupProcessEventHandlers(bus: NodeJS.EventEmitter): void {
    bus.on('process:event', (packet: PM2ProcessEventPacket) => {
      logger.info(`Process event: ${packet.event} for ${packet.process.name}`);

      wsManager.broadcast({
        type: 'PROCESS_EVENT',
        data: {
          processId: packet.process.pm_id,
          processName: packet.process.name,
          event: packet.event as 'online' | 'stopped' | 'errored' | 'restart' | 'exit',
          timestamp: packet.at || Date.now(),
        },
        timestamp: Date.now(),
      });

      // Also broadcast updated process list
      this.broadcastProcessList();
    });
  }

  private startMetricsPolling(): void {
    // Initial broadcast
    this.broadcastProcessList();

    // Poll every 2 seconds
    this.metricsInterval = setInterval(() => {
      this.broadcastProcessList();
    }, 2000);
  }

  private async broadcastProcessList(): Promise<void> {
    try {
      const processes = await pm2API.list();
      wsManager.broadcast({
        type: 'PROCESS_LIST_UPDATE',
        data: { processes },
        timestamp: Date.now(),
      });
    } catch (error) {
      logger.error('Failed to broadcast process list', error);
    }
  }

  getRecentLogs(processId?: number, limit: number = 100): LogEntry[] {
    let logs = this.logBuffer;

    if (processId !== undefined) {
      logs = logs.filter((log) => log.processId === processId);
    }

    return logs.slice(-limit);
  }

  clearLogBuffer(): void {
    this.logBuffer = [];
  }

  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    this.bus = null;
    this.socket = null;
    this.logBuffer = [];

    logger.info('PM2 event bus destroyed');
  }
}

export const pm2EventBus = new PM2EventBus();
export default pm2EventBus;
