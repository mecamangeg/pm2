import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pm2API } from '../pm2/api';
import { ValidationError } from '../utils/errors';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Validation schemas
const ProcessConfigSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  script: z.string().min(1, 'Script path is required'),
  cwd: z.string().optional(),
  args: z.union([z.string(), z.array(z.string())]).optional(),
  instances: z.union([z.number().min(1), z.literal('max')]).optional(),
  exec_mode: z.enum(['fork', 'cluster']).optional(),
  env: z.record(z.union([z.string(), z.number()])).optional(),
  max_memory_restart: z.string().optional(),
  max_restarts: z.number().optional(),
  min_uptime: z.number().optional(),
  autorestart: z.boolean().optional(),
  watch: z.boolean().optional(),
  ignore_watch: z.array(z.string()).optional(),
  cron_restart: z.string().optional(),
  interpreter: z.string().optional(),
  // Windows optimization fields
  windowsHide: z.boolean().optional(),
  restart_delay: z.number().optional(),
  kill_timeout: z.number().optional(),
  listen_timeout: z.number().optional(),
  shutdown_with_message: z.boolean().optional(),
});

// GET /api/processes - List all processes
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const processes = await pm2API.list();
    res.json({ processes });
  } catch (error) {
    next(error);
  }
});

// GET /api/processes/:id - Get process details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const processId = isNaN(Number(id)) ? id : Number(id);
    const process = await pm2API.describe(processId!);
    res.json({ process });
  } catch (error) {
    next(error);
  }
});

// POST /api/processes - Start new process (Admin only)
router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = ProcessConfigSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError('Invalid process configuration', validation.error.errors);
    }

    const processes = await pm2API.start(validation.data);
    res.status(201).json({ processes });
  } catch (error) {
    next(error);
  }
});

// POST /api/processes/:id/restart - Restart process (Admin only)
router.post('/:id/restart', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const processId = isNaN(Number(id)) ? id : Number(id);
    await pm2API.restart(processId!);
    res.json({ message: `Process ${id} restarted successfully` });
  } catch (error) {
    next(error);
  }
});

// POST /api/processes/:id/stop - Stop process (Admin only)
router.post('/:id/stop', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const processId = isNaN(Number(id)) ? id : Number(id);
    await pm2API.stop(processId!);
    res.json({ message: `Process ${id} stopped successfully` });
  } catch (error) {
    next(error);
  }
});

// POST /api/processes/:id/reload - Reload process (Admin only)
router.post('/:id/reload', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const processId = isNaN(Number(id)) ? id : Number(id);
    await pm2API.reload(processId!);
    res.json({ message: `Process ${id} reloaded successfully` });
  } catch (error) {
    next(error);
  }
});

// POST /api/processes/:id/reset - Reset process counters (Admin only)
router.post('/:id/reset', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const processId = isNaN(Number(id)) ? id : Number(id);
    await pm2API.reset(processId!);
    res.json({ message: `Process ${id} counters reset successfully` });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/processes/:id - Delete process (Admin only)
router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const processId = isNaN(Number(id)) ? id : Number(id);
    await pm2API.delete(processId!);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// POST /api/processes/restart-all - Restart all processes (Admin only)
router.post('/restart-all', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pm2API.restart('all');
    res.json({ message: 'All processes restarted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/processes/stop-all - Stop all processes (Admin only)
router.post('/stop-all', requireAdmin, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pm2API.stop('all');
    res.json({ message: 'All processes stopped successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/processes/:id/scale - Scale cluster instances (Admin only)
router.post('/:id/scale', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { instances } = req.body;
    if (!instances || (typeof instances !== 'number' && instances !== 'max')) {
      throw new ValidationError('Invalid instances value', []);
    }
    const processId = isNaN(Number(id)) ? id : Number(id);
    await pm2API.scale(processId!, instances);
    res.json({ message: `Process ${id} scaled to ${instances} instances` });
  } catch (error) {
    next(error);
  }
});

// GET /api/ecosystem - Export ecosystem configuration
router.get('/ecosystem', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const processes = await pm2API.list();
    const apps = processes.map((proc) => ({
      name: proc.name,
      script: proc.pm2_env.pm_exec_path,
      cwd: proc.pm2_env.pm_cwd,
      instances: proc.pm2_env.instances || 1,
      exec_mode: proc.pm2_env.exec_mode || 'fork',
      env: proc.pm2_env.env || {},
      autorestart: proc.pm2_env.autorestart,
      watch: proc.pm2_env.watch,
      max_restarts: proc.pm2_env.max_restarts,
      args: proc.pm2_env.args || [],
    }));

    const ecosystem = {
      apps,
    };

    res.json({ ecosystem });
  } catch (error) {
    next(error);
  }
});

// POST /api/ecosystem - Import ecosystem configuration (Admin only)
router.post('/ecosystem', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apps } = req.body;
    if (!Array.isArray(apps)) {
      throw new ValidationError('Invalid ecosystem format: apps must be an array', []);
    }

    const results: Array<{ name: string; status: string; error?: string }> = [];

    for (const app of apps) {
      try {
        const validation = ProcessConfigSchema.safeParse(app);
        if (!validation.success) {
          results.push({
            name: app.name || 'unknown',
            status: 'error',
            error: 'Invalid configuration',
          });
          continue;
        }
        await pm2API.start(validation.data);
        results.push({ name: app.name, status: 'started' });
      } catch (error) {
        results.push({
          name: app.name || 'unknown',
          status: 'error',
          error: (error as Error).message,
        });
      }
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

export default router;
