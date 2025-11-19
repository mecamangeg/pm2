import { Router, Request, Response, NextFunction } from 'express';
import { pm2API } from '../pm2/api';

const router = Router();

// POST /api/logs/:id/flush - Flush logs for specific process
router.post('/:id/flush', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const processId = isNaN(Number(id)) ? id : Number(id);
    await pm2API.flush(processId);
    res.json({ message: `Logs for process ${id} flushed successfully` });
  } catch (error) {
    next(error);
  }
});

// POST /api/logs/flush-all - Flush all logs
router.post('/flush-all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await pm2API.flush();
    res.json({ message: 'All logs flushed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
