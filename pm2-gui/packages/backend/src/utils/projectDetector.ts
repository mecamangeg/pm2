import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';

export type ProjectType =
  | 't3-app'
  | 'electron'
  | 'nextjs'
  | 'nuxt'
  | 'sveltekit'
  | 'vite-react'
  | 'vite-vue'
  | 'vite-svelte'
  | 'cra'
  | 'nodejs'
  | 'unknown';

export interface DetectedProject {
  type: ProjectType;
  confidence: 'high' | 'medium' | 'low';
  port: number;
  script: string;
  args?: string;
  interpreter?: string;
  entryPoint?: string;
  framework: string;
  detectSource: 'package.json' | 'files';
}

/**
 * Parse port from CLAUDE.md file
 */
export async function parsePortFromCLAUDEmd(projectPath: string): Promise<number | null> {
  try {
    const claudePath = path.join(projectPath, 'CLAUDE.md');
    const content = await fs.readFile(claudePath, 'utf-8');

    // Try multiple patterns in priority order
    const patterns = [
      /PORT\s*[=:]\s*(\d+)/i, // PORT=3000 or PORT: 3000
      /port\s*[=:]\s*(\d+)/, // port: 3000
      /localhost:(\d+)/, // localhost:3000
      /http:\/\/[^:]+:(\d+)/, // http://localhost:3000
      /(?:backend|server|api).*?(\d{4})/i, // Backend: 3001
      /(?:frontend|client|dev).*?(\d{4})/i, // Frontend: 5173
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const port = parseInt(match[1]);
        if (port >= 1024 && port <= 65535) {
          logger.info(`Found port ${port} in CLAUDE.md`, { projectPath });
          return port;
        }
      }
    }
  } catch (error) {
    // CLAUDE.md doesn't exist - that's fine
  }

  return null;
}

/**
 * Parse port from .env files
 */
export async function parsePortFromEnv(projectPath: string): Promise<number | null> {
  const envFiles = ['.env', '.env.example', '.env.development', '.env.local'];

  for (const envFile of envFiles) {
    try {
      const envPath = path.join(projectPath, envFile);
      const content = await fs.readFile(envPath, 'utf-8');

      const patterns = [
        /^PORT\s*=\s*(\d+)/m,
        /^VITE_PORT\s*=\s*(\d+)/m,
        /^NEXT_PUBLIC_PORT\s*=\s*(\d+)/m,
        /^SERVER_PORT\s*=\s*(\d+)/m,
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          const port = parseInt(match[1]);
          if (port >= 1024 && port <= 65535) {
            logger.info(`Found port ${port} in ${envFile}`, { projectPath });
            return port;
          }
        }
      }
    } catch (error) {
      // File doesn't exist, try next one
      continue;
    }
  }

  return null;
}

/**
 * Parse port from package.json
 */
export async function parsePortFromPackageJson(packageJson: any): Promise<number | null> {
  // Check config.port
  if (packageJson.config?.port) {
    const port = parseInt(packageJson.config.port);
    if (port >= 1024 && port <= 65535) {
      return port;
    }
  }

  // Parse from scripts
  const scripts = packageJson.scripts || {};
  for (const [name, script] of Object.entries(scripts)) {
    if (typeof script === 'string' && (name === 'dev' || name === 'start')) {
      const portMatch = script.match(/--port[= ](\d+)/);
      if (portMatch) {
        const port = parseInt(portMatch[1]);
        if (port >= 1024 && port <= 65535) {
          return port;
        }
      }
    }
  }

  return null;
}

/**
 * Discover port from multiple sources with priority
 */
export async function discoverPort(projectPath: string, packageJson: any): Promise<number | null> {
  // Priority 1: CLAUDE.md
  let port = await parsePortFromCLAUDEmd(projectPath);
  if (port) return port;

  // Priority 2: .env files
  port = await parsePortFromEnv(projectPath);
  if (port) return port;

  // Priority 3: package.json
  port = await parsePortFromPackageJson(packageJson);
  if (port) return port;

  return null;
}

/**
 * Detect if project is a monorepo with common folder structures
 */
async function detectMonorepoStructure(projectPath: string): Promise<string[]> {
  const commonMonorepoFolders = ['backend', 'frontend', 'server', 'client', 'api', 'web', 'app'];
  const detectedFolders: string[] = [];

  for (const folder of commonMonorepoFolders) {
    try {
      const folderPath = path.join(projectPath, folder);
      const stats = await fs.stat(folderPath);
      if (stats.isDirectory()) {
        // Check if this folder has a package.json
        const packageJsonPath = path.join(folderPath, 'package.json');
        try {
          await fs.access(packageJsonPath);
          detectedFolders.push(folder);
        } catch {
          // No package.json in this folder, skip
        }
      }
    } catch {
      // Folder doesn't exist, continue
      continue;
    }
  }

  return detectedFolders;
}

/**
 * Detect project type from package.json
 */
export async function detectProjectType(projectPath: string): Promise<DetectedProject> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const scripts = packageJson.scripts || {};

    // Discover port from multiple sources
    const discoveredPort = await discoverPort(projectPath, packageJson);

    // 1. T3 App (most specific)
    if (deps.next && deps['@trpc/server'] && (deps.prisma || deps['drizzle-orm'])) {
      return {
        type: 't3-app',
        confidence: 'high',
        port: discoveredPort || 3000,
        script: 'node_modules/next/dist/bin/next',
        args: 'dev --turbo',
        framework: 'T3 Stack (Next.js + tRPC + Prisma)',
        detectSource: 'package.json',
      };
    }

    // 2. Electron
    if (packageJson.main && deps.electron) {
      return {
        type: 'electron',
        confidence: 'high',
        port: discoveredPort || 0, // Electron doesn't always need a port
        script: 'electron',
        args: '.',
        interpreter: 'none',
        framework: 'Electron',
        detectSource: 'package.json',
      };
    }

    // 3. Next.js
    if (deps.next) {
      return {
        type: 'nextjs',
        confidence: 'high',
        port: discoveredPort || 3000,
        script: 'node_modules/next/dist/bin/next',
        args: 'dev --turbo',
        framework: 'Next.js',
        detectSource: 'package.json',
      };
    }

    // 4. Nuxt.js
    if (deps.nuxt) {
      return {
        type: 'nuxt',
        confidence: 'high',
        port: discoveredPort || 3000,
        script: 'npm',
        args: 'run dev',
        interpreter: 'none',
        framework: 'Nuxt.js',
        detectSource: 'package.json',
      };
    }

    // 5. SvelteKit
    if (deps['@sveltejs/kit']) {
      return {
        type: 'sveltekit',
        confidence: 'high',
        port: discoveredPort || 5173,
        script: 'npm',
        args: 'run dev',
        interpreter: 'none',
        framework: 'SvelteKit',
        detectSource: 'package.json',
      };
    }

    // 6. Vite + React
    if (deps.vite && deps.react) {
      return {
        type: 'vite-react',
        confidence: 'high',
        port: discoveredPort || 5173,
        script: 'npm',
        args: 'run dev',
        interpreter: 'none',
        framework: 'Vite + React',
        detectSource: 'package.json',
      };
    }

    // 7. Vite + Vue
    if (deps.vite && deps.vue) {
      return {
        type: 'vite-vue',
        confidence: 'high',
        port: discoveredPort || 5173,
        script: 'npm',
        args: 'run dev',
        interpreter: 'none',
        framework: 'Vite + Vue',
        detectSource: 'package.json',
      };
    }

    // 8. Vite + Svelte
    if (deps.vite && deps.svelte) {
      return {
        type: 'vite-svelte',
        confidence: 'high',
        port: discoveredPort || 5173,
        script: 'npm',
        args: 'run dev',
        interpreter: 'none',
        framework: 'Vite + Svelte',
        detectSource: 'package.json',
      };
    }

    // 9. Create React App
    if (deps['react-scripts']) {
      return {
        type: 'cra',
        confidence: 'high',
        port: discoveredPort || 3000,
        script: 'npm',
        args: 'start',
        interpreter: 'none',
        framework: 'Create React App',
        detectSource: 'package.json',
      };
    }

    // 10. Generic Node.js (check for common entry points)
    if (scripts.dev || scripts.start) {
      const entryPoint = await findNodeEntryPoint(projectPath);

      // Try to extract actual script from npm dev command
      let script = entryPoint || 'npm';
      let args = '';
      let interpreter = 'node';

      if (scripts.dev && typeof scripts.dev === 'string') {
        // Check if dev script is just running a file with nodemon/node
        const devScriptMatch = scripts.dev.match(/(?:nodemon|node)\s+(.+\.(?:js|ts))/);
        if (devScriptMatch && entryPoint) {
          // Use the entry point directly instead of npm
          script = entryPoint;
          args = '';
          interpreter = 'node';
        } else {
          // Fall back to npm command (for complex scripts)
          script = 'npm';
          args = 'run dev';
          interpreter = 'none';
        }
      } else if (entryPoint) {
        script = entryPoint;
        args = '';
        interpreter = 'node';
      } else {
        script = 'npm';
        args = 'start';
        interpreter = 'none';
      }

      return {
        type: 'nodejs',
        confidence: 'medium',
        port: discoveredPort || 3000,
        script,
        args,
        interpreter,
        entryPoint,
        framework: 'Node.js',
        detectSource: 'package.json',
      };
    }

    // Fallback: Unknown project type
    return {
      type: 'unknown',
      confidence: 'low',
      port: discoveredPort || 3000,
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      framework: 'Unknown',
      detectSource: 'package.json',
    };
  } catch (error) {
    logger.error('Failed to detect project type', { error, projectPath });

    // Check if this is a monorepo structure (backend/frontend folders)
    const monorepoFolders = await detectMonorepoStructure(projectPath);
    if (monorepoFolders.length > 0) {
      throw new Error(
        `Monorepo detected with ${monorepoFolders.join(', ')} folders. ` +
        `Please specify the subdirectory path (e.g., ${path.join(projectPath, monorepoFolders[0])})`
      );
    }

    // No package.json - try to find entry point
    const entryPoint = await findNodeEntryPoint(projectPath);

    return {
      type: 'nodejs',
      confidence: 'low',
      port: 3000,
      script: entryPoint || 'index.js',
      interpreter: 'node',
      entryPoint,
      framework: 'Node.js (generic)',
      detectSource: 'files',
    };
  }
}

/**
 * Find common Node.js entry points
 */
async function findNodeEntryPoint(projectPath: string): Promise<string | null> {
  const commonEntryPoints = [
    'src/index.js',
    'src/server.js',
    'src/main.js',
    'index.js',
    'server.js',
    'main.js',
    'app.js',
    'src/index.ts',
    'src/server.ts',
  ];

  for (const entry of commonEntryPoints) {
    try {
      const fullPath = path.join(projectPath, entry);
      await fs.access(fullPath);
      return entry;
    } catch {
      // File doesn't exist, try next
      continue;
    }
  }

  return null;
}
