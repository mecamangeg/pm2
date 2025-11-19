import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import path from 'path';

import { pm2Client } from './pm2/client';
import { pm2EventBus } from './pm2/events';
import { wsManager } from './websocket/server';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import processesRouter from './routes/processes';
import systemRouter from './routes/system';
import logsRouter from './routes/logs';
import authRouter from './routes/auth';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env['PORT'] || 3001;
const HOST = process.env['HOST'] || '0.0.0.0';
const AUTH_ENABLED = process.env['AUTH_ENABLED'] !== 'false';

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: { error: 'Too many login attempts, please try again later' },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    pm2Connected: pm2Client.isConnected(),
    wsClients: wsManager.getClientCount(),
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (before auth middleware)
app.use('/api/auth', authRouter);

// Apply auth middleware if enabled
if (AUTH_ENABLED) {
  app.use('/api', authMiddleware);
}

// API Routes
app.use('/api/processes', processesRouter);
app.use('/api/system', systemRouter);
app.use('/api/logs', logsRouter);

// Serve static frontend files in production
if (process.env['NODE_ENV'] === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket
wsManager.initialize(server);

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');

  wsManager.shutdown();
  pm2EventBus.destroy();
  await pm2Client.disconnect();

  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const startServer = async () => {
  try {
    // Connect to PM2
    await pm2Client.connect();
    logger.info('Connected to PM2 daemon');

    // Initialize event bus
    await pm2EventBus.initialize();
    logger.info('PM2 event bus ready');

    // Start HTTP server
    server.listen(Number(PORT), HOST, () => {
      logger.info(`Server running on http://${HOST}:${PORT}`);
      logger.info(`WebSocket available on ws://${HOST}:${PORT}/ws`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
