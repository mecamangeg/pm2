import { Router, Request, Response, NextFunction } from 'express';
import os from 'os';
import { pm2API } from '../pm2/api';
import { requireAdmin } from '../middleware/auth';
import { scanPorts, isPortAvailable, suggestAvailablePorts, killProcessByPID } from '../utils/ports';
import { logger } from '../utils/logger';

const router = Router();

// In-memory metrics history (circular buffer)
interface MetricPoint {
  timestamp: number;
  cpu: number;
  memory: number;
  load: number[];
}

const metricsHistory: MetricPoint[] = [];
const MAX_HISTORY = 300; // 5 minutes of 1-second samples

// Start collecting metrics
setInterval(() => {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const totalTick = cpus.reduce(
    (acc, cpu) => acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq,
    0
  );
  const cpuUsage = 100 - (100 * totalIdle) / totalTick;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem) * 100;

  const point: MetricPoint = {
    timestamp: Date.now(),
    cpu: Math.round(cpuUsage * 100) / 100,
    memory: Math.round(memUsage * 100) / 100,
    load: os.loadavg(),
  };

  metricsHistory.push(point);
  if (metricsHistory.length > MAX_HISTORY) {
    metricsHistory.shift();
  }
}, 1000);

// GET /api/system/info - Get system information
router.get('/info', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const info = await pm2API.getSystemInfo();
    res.json({ info });
  } catch (error) {
    next(error);
  }
});

// GET /api/system/metrics - Get current system metrics
router.get('/metrics', (_req: Request, res: Response) => {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
  const totalTick = cpus.reduce(
    (acc, cpu) => acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq,
    0
  );
  const cpuUsage = 100 - (100 * totalIdle) / totalTick;

  res.json({
    cpu: Math.round(cpuUsage * 100) / 100,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percentage: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 10000) / 100,
    },
    load: os.loadavg(),
    uptime: os.uptime(),
  });
});

// GET /api/system/metrics/history - Get metrics history
router.get('/metrics/history', (req: Request, res: Response) => {
  const minutes = parseInt(req.query.minutes as string) || 5;
  const cutoff = Date.now() - minutes * 60 * 1000;
  const history = metricsHistory.filter((m) => m.timestamp >= cutoff);
  res.json({ history });
});

// GET /api/system/ports - Get all port information
router.get('/ports', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all PM2 processes and extract their ports
    const processes = await pm2API.list();
    const pm2ProcessPorts = new Map<number, string>();

    for (const proc of processes) {
      // Extract port from environment variables
      const env = proc.pm2_env.env;
      if (env) {
        // Check common port env vars
        const portEnvVars = ['PORT', 'port', 'HTTP_PORT', 'SERVER_PORT', 'APP_PORT'];
        for (const envVar of portEnvVars) {
          if (env[envVar]) {
            const port = parseInt(String(env[envVar]), 10);
            if (!isNaN(port)) {
              pm2ProcessPorts.set(port, proc.name);
            }
          }
        }
      }
    }

    // Scan all ports and categorize them
    const portScan = await scanPorts(pm2ProcessPorts);

    res.json({
      gui: portScan.guiPorts,
      pm2: portScan.pm2Ports,
      orphaned: portScan.orphanedPorts,
      total: portScan.allPorts.length,
    });
  } catch (error) {
    logger.error('Failed to scan ports', error);
    next(error);
  }
});

// GET /api/system/ports/check/:port - Check if port is available
router.get('/ports/check/:port', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const port = parseInt(req.params.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      return res.status(400).json({ error: 'Invalid port number' });
    }

    const available = await isPortAvailable(port);
    res.json({ port, available });
  } catch (error) {
    next(error);
  }
});

// GET /api/system/ports/suggest/:port - Suggest available ports
router.get('/ports/suggest/:port', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preferredPort = parseInt(req.params.port, 10);
    if (isNaN(preferredPort) || preferredPort < 1 || preferredPort > 65535) {
      return res.status(400).json({ error: 'Invalid port number' });
    }

    const count = parseInt(req.query.count as string) || 3;
    const suggestions = await suggestAvailablePorts(preferredPort, count);

    res.json({
      preferredPort,
      available: suggestions.length > 0 && suggestions[0] === preferredPort,
      suggestions,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/system/ports/kill/:pid - Kill process by PID (Admin only)
router.post('/ports/kill/:pid', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pid = parseInt(req.params.pid, 10);
    if (isNaN(pid) || pid < 1) {
      return res.status(400).json({ error: 'Invalid PID' });
    }

    const success = await killProcessByPID(pid);
    if (success) {
      res.json({ message: `Process ${pid} killed successfully` });
    } else {
      res.status(500).json({ error: 'Failed to kill process' });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/system/dump - Save process list
router.post('/dump', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pm2API.dump();
    res.json({ message: 'Process list saved successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/system/resurrect - Restore process list
router.post('/resurrect', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pm2API.resurrect();
    res.json({ message: 'Processes resurrected successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/system/shutdown - Kill PM2 daemon (Admin only)
router.post('/shutdown', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pm2API.killDaemon();
    res.json({ message: 'PM2 daemon killed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
