import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { logger } from '../utils/logger';
import { WSMessage } from '../types/websocket';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  subscriptions: Set<number | 'all'>;
}

class WebSocketManager {
  private wss: WSServer | null = null;
  private clients: Set<ExtendedWebSocket> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: HTTPServer): void {
    this.wss = new WSServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws as ExtendedWebSocket);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', error);
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeat();
    }, 30000);

    logger.info('WebSocket server initialized');
  }

  private handleConnection(ws: ExtendedWebSocket): void {
    ws.isAlive = true;
    ws.subscriptions = new Set(['all']); // Subscribe to all logs by default
    this.clients.add(ws);

    logger.info(`WebSocket client connected. Total clients: ${this.clients.size}`);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      logger.info(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket client error', error);
      this.clients.delete(ws);
    });

    // Send initial connection status
    this.sendToClient(ws, {
      type: 'CONNECTION_STATUS',
      data: { connected: true, pm2Connected: true },
      timestamp: Date.now(),
    });
  }

  private handleMessage(ws: ExtendedWebSocket, data: unknown): void {
    try {
      const message = JSON.parse(data.toString()) as WSMessage;

      switch (message.type) {
        case 'SUBSCRIBE_LOGS': {
          const { processId } = message.data as { processId: number | 'all' };
          ws.subscriptions.add(processId);
          logger.debug(`Client subscribed to logs for process ${processId}`);
          break;
        }
        case 'UNSUBSCRIBE_LOGS': {
          const { processId } = message.data as { processId: number | 'all' };
          ws.subscriptions.delete(processId);
          logger.debug(`Client unsubscribed from logs for process ${processId}`);
          break;
        }
        default:
          logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('Failed to parse WebSocket message', error);
      this.sendToClient(ws, {
        type: 'ERROR',
        data: { message: 'Invalid message format' },
        timestamp: Date.now(),
      });
    }
  }

  private checkHeartbeat(): void {
    this.clients.forEach((ws) => {
      if (!ws.isAlive) {
        logger.debug('Terminating unresponsive WebSocket client');
        ws.terminate();
        this.clients.delete(ws);
        return;
      }

      ws.isAlive = false;
      ws.ping();
    });
  }

  private sendToClient(ws: ExtendedWebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send message to client', error);
      }
    }
  }

  broadcast(message: WSMessage): void {
    this.clients.forEach((client) => {
      this.sendToClient(client, message);
    });
  }

  broadcastToSubscribers(processId: number, message: WSMessage): void {
    this.clients.forEach((client) => {
      if (client.subscriptions.has('all') || client.subscriptions.has(processId)) {
        this.sendToClient(client, message);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    logger.info('WebSocket server shut down');
  }
}

export const wsManager = new WebSocketManager();
export default wsManager;
