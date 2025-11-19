import pm2 from 'pm2';
import os from 'os';
import { pm2Client } from './client';
import { PM2Process, ProcessConfig, SystemInfo } from '../types/pm2';
import { ProcessNotFoundError, PM2Error } from '../utils/errors';
import { logger } from '../utils/logger';

class PM2API {
  async list(): Promise<PM2Process[]> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.list((err, processDescriptionList) => {
        if (err) {
          logger.error('Failed to list processes', err);
          reject(new PM2Error('Failed to list processes'));
          return;
        }

        const processes = processDescriptionList.map((proc) => ({
          pm_id: proc.pm_id ?? 0,
          name: proc.name ?? 'unknown',
          pid: proc.pid ?? 0,
          pm2_env: proc.pm2_env as unknown as PM2Process['pm2_env'],
          monit: proc.monit ?? { memory: 0, cpu: 0 },
        }));

        resolve(processes);
      });
    });
  }

  async describe(processId: number | string): Promise<PM2Process> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.describe(processId, (err, processDescriptionList) => {
        if (err) {
          logger.error(`Failed to describe process ${processId}`, err);
          reject(new PM2Error(`Failed to describe process ${processId}`));
          return;
        }

        if (!processDescriptionList || processDescriptionList.length === 0) {
          reject(new ProcessNotFoundError(processId));
          return;
        }

        const proc = processDescriptionList[0];
        if (!proc) {
          reject(new ProcessNotFoundError(processId));
          return;
        }

        const process: PM2Process = {
          pm_id: proc.pm_id ?? 0,
          name: proc.name ?? 'unknown',
          pid: proc.pid ?? 0,
          pm2_env: proc.pm2_env as unknown as PM2Process['pm2_env'],
          monit: proc.monit ?? { memory: 0, cpu: 0 },
        };

        resolve(process);
      });
    });
  }

  async restart(processId: number | string): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.restart(processId, (err) => {
        if (err) {
          logger.error(`Failed to restart process ${processId}`, err);
          reject(new PM2Error(`Failed to restart process ${processId}`));
          return;
        }

        logger.info(`Process ${processId} restarted`);
        resolve();
      });
    });
  }

  async stop(processId: number | string): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.stop(processId, (err) => {
        if (err) {
          logger.error(`Failed to stop process ${processId}`, err);
          reject(new PM2Error(`Failed to stop process ${processId}`));
          return;
        }

        logger.info(`Process ${processId} stopped`);
        resolve();
      });
    });
  }

  async delete(processId: number | string): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.delete(processId, (err) => {
        if (err) {
          logger.error(`Failed to delete process ${processId}`, err);
          reject(new PM2Error(`Failed to delete process ${processId}`));
          return;
        }

        logger.info(`Process ${processId} deleted`);
        resolve();
      });
    });
  }

  async start(config: ProcessConfig): Promise<PM2Process[]> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.start(config as pm2.StartOptions, (err, proc) => {
        if (err) {
          logger.error('Failed to start process', err);
          reject(new PM2Error('Failed to start process'));
          return;
        }

        const processes = Array.isArray(proc) ? proc : [proc];
        const result = processes.map((p) => ({
          pm_id: p.pm_id ?? 0,
          name: p.name ?? 'unknown',
          pid: p.pid ?? 0,
          pm2_env: p.pm2_env as unknown as PM2Process['pm2_env'],
          monit: p.monit ?? { memory: 0, cpu: 0 },
        }));

        logger.info(`Started process ${config.name}`);
        resolve(result);
      });
    });
  }

  async killDaemon(): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.killDaemon((err) => {
        if (err) {
          logger.error('Failed to kill PM2 daemon', err);
          reject(new PM2Error('Failed to kill PM2 daemon'));
          return;
        }

        logger.info('PM2 daemon killed');
        resolve();
      });
    });
  }

  async reload(processId: number | string): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.reload(processId, (err) => {
        if (err) {
          logger.error(`Failed to reload process ${processId}`, err);
          reject(new PM2Error(`Failed to reload process ${processId}`));
          return;
        }

        logger.info(`Process ${processId} reloaded`);
        resolve();
      });
    });
  }

  async reset(processId: number | string): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.reset(processId, (err) => {
        if (err) {
          logger.error(`Failed to reset process ${processId}`, err);
          reject(new PM2Error(`Failed to reset process ${processId}`));
          return;
        }

        logger.info(`Process ${processId} reset`);
        resolve();
      });
    });
  }

  async flush(processId?: number | string): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      const callback = (err: Error | null) => {
        if (err) {
          logger.error('Failed to flush logs', err);
          reject(new PM2Error('Failed to flush logs'));
          return;
        }

        logger.info('Logs flushed');
        resolve();
      };

      if (processId !== undefined) {
        pm2.flush(processId, callback);
      } else {
        pm2.flush(callback);
      }
    });
  }

  async dump(): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.dump((err) => {
        if (err) {
          logger.error('Failed to dump process list', err);
          reject(new PM2Error('Failed to dump process list'));
          return;
        }

        logger.info('Process list saved');
        resolve();
      });
    });
  }

  async resurrect(): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      pm2.resurrect((err) => {
        if (err) {
          logger.error('Failed to resurrect processes', err);
          reject(new PM2Error('Failed to resurrect processes'));
          return;
        }

        logger.info('Processes resurrected');
        resolve();
      });
    });
  }

  async scale(processId: number | string, instances: number | 'max'): Promise<void> {
    await pm2Client.ensureConnected();

    return new Promise((resolve, reject) => {
      // PM2 scale expects a number, 'max' means use all CPUs
      const instanceCount = instances === 'max' ? 0 : instances;

      // PM2 scale method signature: scale(process, number, callback)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pm2 as any).scale(processId, instanceCount, (err: Error | null) => {
        if (err) {
          logger.error(`Failed to scale process ${processId}`, err);
          reject(new PM2Error(`Failed to scale process ${processId}`));
          return;
        }

        logger.info(`Process ${processId} scaled to ${instances} instances`);
        resolve();
      });
    });
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const pm2Version = await this.getPM2Version();

    return {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      pm2Version,
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
    };
  }

  private async getPM2Version(): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pm2Package = require('pm2/package.json');
      return pm2Package.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

export const pm2API = new PM2API();
export default pm2API;
