import { Process } from '@/types';

/**
 * Extract port number from process environment, args, or configuration
 * Priority: env.PORT > args (-p, --port) > null
 */
export function extractPort(process: Process): number | null {
  const env = process.pm2_env;

  // 1. Check env.PORT
  if (env.env?.PORT) {
    const port = parseInt(env.env.PORT, 10);
    if (!isNaN(port)) return port;
  }

  // 2. Check args for -p or --port flags
  if (env.args && env.args.length > 0) {
    for (let i = 0; i < env.args.length; i++) {
      const arg = env.args[i];

      // --port=3000 or -p=3000
      if (arg.startsWith('--port=') || arg.startsWith('-p=')) {
        const port = parseInt(arg.split('=')[1], 10);
        if (!isNaN(port)) return port;
      }

      // --port 3000 or -p 3000
      if ((arg === '--port' || arg === '-p') && i + 1 < env.args.length) {
        const port = parseInt(env.args[i + 1], 10);
        if (!isNaN(port)) return port;
      }
    }
  }

  // 3. Check for common port environment variables
  const portEnvVars = ['APP_PORT', 'SERVER_PORT', 'HTTP_PORT', 'NODE_PORT'];
  for (const varName of portEnvVars) {
    if (env.env?.[varName]) {
      const port = parseInt(env.env[varName], 10);
      if (!isNaN(port)) return port;
    }
  }

  return null;
}

/**
 * Extract folder name from process current working directory
 * /path/to/my-project → "my-project"
 */
export function extractFolderName(process: Process): string {
  const cwd = process.pm2_env.pm_cwd;

  if (!cwd) {
    return process.name;
  }

  // Handle both Windows and Unix paths
  const segments = cwd.split(/[/\\]/);
  const folderName = segments.filter(Boolean).pop();

  return folderName || process.name;
}

/**
 * Get display name for process (folder name with PM2 ID)
 * Format: "folder-name [ID]"
 */
export function getProcessDisplayName(process: Process): {
  name: string;
  id: number;
  folderName: string;
} {
  const folderName = extractFolderName(process);
  return {
    name: folderName,
    id: process.pm_id,
    folderName,
  };
}
