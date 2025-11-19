import { useState } from 'react';
import { Rocket, FolderOpen, Play, Settings2 } from 'lucide-react';
import { processesApi } from '@/api/endpoints';
import toast from 'react-hot-toast';

interface QuickLauncherProps {
  onLaunched?: () => void;
}

type ProjectType = 'nextjs' | 'nodejs' | 'react-vite' | 'custom';

export function QuickLauncher({ onLaunched }: QuickLauncherProps) {
  const [projectType, setProjectType] = useState<ProjectType>('nextjs');
  const [projectPath, setProjectPath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [script, setScript] = useState('dev');
  const [port, setPort] = useState('3000');
  const [entryPoint, setEntryPoint] = useState('backend/src/server.js');
  const [customScript, setCustomScript] = useState('');
  const [customInterpreter, setCustomInterpreter] = useState('node');
  const [customArgs, setCustomArgs] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleLaunch = async () => {
    if (!projectPath.trim()) {
      toast.error('Please enter a project path');
      return;
    }

    // Validation for custom type
    if (projectType === 'custom' && !customScript.trim()) {
      toast.error('Please enter a script path for custom projects');
      return;
    }

    setIsLoading(true);
    try {
      // Derive name from path if not provided
      const name = projectName.trim() || projectPath.split(/[/\\]/).filter(Boolean).pop() || 'app';
      const normalizedPath = projectPath.replace(/\\/g, '/');

      // Base config
      let config: any = {
        name: `${name}-${script}`,
        cwd: normalizedPath,
        env: {
          PORT: port,
          NODE_ENV: script === 'dev' ? 'development' : 'production',
        },
        // Windows optimization: Hide console window
        windowsHide: true,
        // Prevent rapid restarts
        min_uptime: 5000,
        max_restarts: 5,
        restart_delay: 2000,
      };

      // Project type-specific configuration
      switch (projectType) {
        case 'nextjs':
          config = {
            ...config,
            script: 'node_modules/next/dist/bin/next',
            args: script === 'dev' ? `dev --turbo --port ${port}` : `start --port ${port}`,
            interpreter: 'node',
            autorestart: script !== 'dev',
          };
          break;

        case 'nodejs':
          config = {
            ...config,
            script: entryPoint,
            interpreter: 'node',
            watch: script === 'dev',
            autorestart: true,
            env: {
              ...config.env,
              DB_HOST: 'localhost',
            },
          };
          break;

        case 'react-vite':
          config = {
            ...config,
            script: 'npm',
            args: script === 'dev' ? 'run dev' : 'run preview',
            interpreter: 'none',
            autorestart: false,
          };
          break;

        case 'custom':
          config = {
            ...config,
            script: customScript,
            interpreter: customInterpreter,
            args: customArgs,
            autorestart: script !== 'dev',
          };
          break;
      }

      await processesApi.start(config);
      toast.success(`Started ${name} on port ${port}`);

      // Clear form
      setProjectPath('');
      setProjectName('');
      setPort('3000');
      setEntryPoint('backend/src/server.js');
      setCustomScript('');
      setCustomArgs('');
      onLaunched?.();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } }; message: string };
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic placeholder and helper text based on project type
  const getProjectPathPlaceholder = () => {
    switch (projectType) {
      case 'nextjs':
        return 'D:\\Projects\\your-nextjs-app';
      case 'nodejs':
        return 'D:\\Projects\\your-express-app';
      case 'react-vite':
        return 'D:\\Projects\\your-react-app';
      case 'custom':
        return 'D:\\Projects\\your-custom-app';
    }
  };

  const getProjectPathHelper = () => {
    switch (projectType) {
      case 'nextjs':
        return 'Full path to your Next.js project directory';
      case 'nodejs':
        return 'Full path to your Node.js/Express project directory';
      case 'react-vite':
        return 'Full path to your React + Vite project directory';
      case 'custom':
        return 'Full path to your project directory';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Quick Project Launcher</h3>
      </div>

      <div className="space-y-4">
        {/* Project Type Selector */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Project Type
          </label>
          <select
            value={projectType}
            onChange={(e) => setProjectType(e.target.value as ProjectType)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="nextjs">Next.js</option>
            <option value="nodejs">Node.js/Express</option>
            <option value="react-vite">React + Vite</option>
            <option value="custom">Custom</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            {projectType === 'nextjs' && 'Next.js applications with Turbopack'}
            {projectType === 'nodejs' && 'Node.js backend (Express, Fastify, etc.)'}
            {projectType === 'react-vite' && 'React applications with Vite dev server'}
            {projectType === 'custom' && 'Custom project with manual configuration'}
          </p>
        </div>

        {/* Project Directory */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Project Directory
          </label>
          <div className="relative">
            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder={getProjectPathPlaceholder()}
              className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getProjectPathHelper()}
          </p>
        </div>

        {/* Node.js Entry Point */}
        {projectType === 'nodejs' && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Entry Point
            </label>
            <input
              type="text"
              value={entryPoint}
              onChange={(e) => setEntryPoint(e.target.value)}
              placeholder="backend/src/server.js"
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Relative path to your server entry point (e.g., backend/src/server.js, src/index.js)
            </p>
          </div>
        )}

        {/* Custom Script Fields */}
        {projectType === 'custom' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Script Path
              </label>
              <input
                type="text"
                value={customScript}
                onChange={(e) => setCustomScript(e.target.value)}
                placeholder="src/index.js or npm"
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Interpreter
              </label>
              <input
                type="text"
                value={customInterpreter}
                onChange={(e) => setCustomInterpreter(e.target.value)}
                placeholder="node, python, none"
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Arguments (optional)
              </label>
              <input
                type="text"
                value={customArgs}
                onChange={(e) => setCustomArgs(e.target.value)}
                placeholder="--watch --verbose"
                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Script/Mode Selector */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {projectType === 'nextjs' ? 'Script' : 'Mode'}
            </label>
            <select
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projectType === 'nextjs' && (
                <>
                  <option value="dev">Development (Turbopack)</option>
                  <option value="start">Production</option>
                </>
              )}
              {projectType === 'nodejs' && (
                <>
                  <option value="dev">Development (watch)</option>
                  <option value="start">Production</option>
                </>
              )}
              {projectType === 'react-vite' && (
                <>
                  <option value="dev">Development</option>
                  <option value="start">Preview (built)</option>
                </>
              )}
              {projectType === 'custom' && (
                <>
                  <option value="dev">Development</option>
                  <option value="start">Production</option>
                </>
              )}
            </select>
          </div>

          {/* Port */}
          <div>
            <label className="block text-sm font-medium mb-1">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="3000"
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Custom Name (optional)
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Auto-derived from path"
              className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          disabled={isLoading || !projectPath.trim() || (projectType === 'custom' && !customScript.trim())}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="h-4 w-4" />
          {isLoading ? 'Launching...' : 'Launch with PM2'}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-3 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">
          <strong>Optimizations applied:</strong>
          <br />• Console window hidden (no popups)
          <br />• Restart throttling (prevents spam)
          <br />• Port exposed in environment
          {projectType === 'nodejs' && script === 'dev' && (
            <>
              <br />• File watching enabled (auto-restart on changes)
            </>
          )}
        </p>
      </div>
    </div>
  );
}
