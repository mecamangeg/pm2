import { Router, Request, Response, NextFunction } from 'express';
import { findAvailablePort, isPortAvailable, getListeningPorts } from '../utils/ports';
import { portRegistry } from '../utils/portRegistry';
import { detectProjectType, discoverPort } from '../utils/projectDetector';
import { logger } from '../utils/logger';
import fs from 'fs/promises';

const router = Router();

/**
 * GET /api/ports/check?port=3000
 * Check if a port is available
 */
router.get('/check', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const port = Number(req.query.port);

    if (isNaN(port) || port < 1024 || port > 65535) {
      return res.status(400).json({ error: 'Invalid port number' });
    }

    const available = await isPortAvailable(port);
    const pm2Process = portRegistry.getProcessUsingPort(port);
    const pm2UsedPorts = portRegistry.getUsedPorts();

    let suggestion: number | null = null;
    if (!available || pm2Process) {
      suggestion = await findAvailablePort(port, pm2UsedPorts);
    }

    res.json({
      port,
      available,
      usedByPM2: pm2Process || null,
      suggestion,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ports/used
 * Get all ports used by PM2 processes
 */
router.get('/used', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const entries = portRegistry.getAllEntries();

    res.json({
      ports: entries.map((entry) => ({
        processName: entry.processName,
        port: entry.port,
        projectPath: entry.projectPath,
        assignedAt: entry.assignedAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ports/system
 * Get all ports in use system-wide
 */
router.get('/system', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const ports = await getListeningPorts();

    res.json({
      ports: ports.map((p) => ({
        port: p.port,
        protocol: p.protocol,
        pid: p.pid,
        processName: p.processName,
        isPM2GUI: p.isPM2GUI,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ports/suggest
 * Suggest an available port for a project
 */
router.post('/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectPath, preferredPort } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    // Get PM2 used ports
    const pm2UsedPorts = portRegistry.getUsedPorts();

    // Try to discover port from project files
    let detectedPort: number | null = null;
    try {
      const packageJsonPath = `${projectPath}/package.json`;
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      detectedPort = await discoverPort(projectPath, packageJson);
    } catch (error) {
      logger.warn('Failed to discover port from project files', { error, projectPath });
    }

    // Use priority: preferredPort > detectedPort > 3000
    const targetPort = preferredPort || detectedPort || 3000;

    // Find available port
    const suggestedPort = await findAvailablePort(targetPort, pm2UsedPorts);

    // Check if we had to change the port
    const wasChanged = suggestedPort !== targetPort;
    const pm2Owner = portRegistry.getProcessUsingPort(targetPort);

    res.json({
      suggestedPort,
      detectedPort,
      preferredPort: targetPort,
      wasChanged,
      source: detectedPort ? 'CLAUDE.md or .env' : 'default',
      reason: wasChanged
        ? pm2Owner
          ? `Port ${targetPort} in use by PM2 process "${pm2Owner}"`
          : `Port ${targetPort} in use by system`
        : null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ports/detect
 * Auto-detect project type and configuration
 */
router.post('/detect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'projectPath is required' });
    }

    // Detect project type
    const detected = await detectProjectType(projectPath);

    // Get PM2 used ports for conflict checking
    const pm2UsedPorts = portRegistry.getUsedPorts();

    // Find available port (may be different from detected if conflict)
    const suggestedPort = await findAvailablePort(detected.port, pm2UsedPorts);
    const portChanged = suggestedPort !== detected.port;

    const pm2Owner = portRegistry.getProcessUsingPort(detected.port);

    res.json({
      ...detected,
      originalPort: detected.port,
      suggestedPort,
      portChanged,
      portConflict: portChanged
        ? {
            reason: pm2Owner ? `In use by PM2 process "${pm2Owner}"` : 'In use by system',
            original: detected.port,
            suggested: suggestedPort,
          }
        : null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
