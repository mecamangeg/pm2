import pm2 from 'pm2';
import { logger } from '../utils/logger';
import { ConnectionError } from '../utils/errors';

class PM2Client {
  private connected: boolean = false;
  private connecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private maxReconnectDelay: number = 30000;

  async connect(): Promise<void> {
    if (this.connected) {
      logger.debug('Already connected to PM2');
      return;
    }

    if (this.connecting) {
      logger.debug('Connection already in progress');
      return;
    }

    this.connecting = true;

    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        this.connecting = false;

        if (err) {
          logger.error('Failed to connect to PM2 daemon', err);
          reject(new ConnectionError(err.message));
          return;
        }

        this.connected = true;
        this.reconnectAttempts = 0;
        logger.info('Connected to PM2 daemon');
        resolve();
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      logger.debug('Not connected to PM2');
      return;
    }

    return new Promise((resolve) => {
      pm2.disconnect();
      this.connected = false;
      logger.info('Disconnected from PM2 daemon');
      resolve();
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect();
    }
  }

  async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new ConnectionError(
        `Failed to reconnect after ${this.maxReconnectAttempts} attempts`
      );
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    logger.info(
      `Attempting to reconnect to PM2 (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`
    );

    await this.disconnect();
    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.connect();
  }

  getPM2(): typeof pm2 {
    return pm2;
  }
}

export const pm2Client = new PM2Client();
export default pm2Client;
