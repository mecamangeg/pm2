import { useState } from 'react';
import { Rocket, FolderOpen, Wand2, Play } from 'lucide-react';
import { processesApi } from '@/api/endpoints';
import toast from 'react-hot-toast';
import axios from 'axios';
import { LaunchConfirmationModal } from './LaunchConfirmationModal';

interface QuickLauncherProps {
  onLaunched?: () => void;
}

interface DetectedConfig {
  type: string;
  framework: string;
  confidence: 'high' | 'medium' | 'low';
  port: number;
  originalPort?: number;
  suggestedPort?: number;
  portChanged?: boolean;
  portConflict?: {
    reason: string;
    original: number;
    suggested: number;
  };
  script: string;
  args?: string;
  interpreter?: string;
  entryPoint?: string;
}

export function QuickLauncherV2({ onLaunched }: QuickLauncherProps) {
  const [projectPath, setProjectPath] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [detectedConfig, setDetectedConfig] = useState<DetectedConfig | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleBrowseDirectory = async () => {
    try {
      // Check if browser supports directory picker
      if (!('showDirectoryPicker' in window)) {
        toast.error('Directory picker not supported. Please use Chrome/Edge or enter path manually.');
        return;
      }

      // @ts-ignore - showDirectoryPicker is not in TypeScript types yet
      const dirHandle = await window.showDirectoryPicker();

      // Browser security prevents getting full path, but we can get the folder name
      // Set it as a hint and ask user to complete the full path
      const folderName = dirHandle.name;
      setProjectPath(folderName);

      toast.info(`Selected: ${folderName}. Please edit to add the full path (e.g., D:\\Projects\\${folderName})`, {
        duration: 5000,
      });

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Directory picker error:', error);
      }
    }
  };

  const handleAutoDetect = async () => {
    if (!projectPath.trim()) {
      toast.error('Please enter a project path first');
      return;
    }

    setIsDetecting(true);
    try {
      const response = await axios.post<DetectedConfig>('/api/ports/detect', {
        projectPath: projectPath.replace(/\\/g, '/'),
      });

      setDetectedConfig(response.data);
      setShowConfirmation(true);

      toast.success(`Detected: ${response.data.framework}`, {
        icon: '🔍',
      });
    } catch (error: any) {
      console.error('Detection error:', error);
      toast.error(error.response?.data?.error || 'Failed to detect project type');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleConfirmLaunch = async (port: number) => {
    if (!detectedConfig) return;

    setIsLaunching(true);
    setShowConfirmation(false);

    try {
      const name = projectPath.split(/[/\\]/).filter(Boolean).pop() || 'app';
      const normalizedPath = projectPath.replace(/\\/g, '/');

      // Build PM2 config from detected settings
      const config: any = {
        name: `${name}-dev`,
        cwd: normalizedPath,
        script: detectedConfig.script,
        env: {
          PORT: port.toString(),
          NODE_ENV: 'development',
        },
        windowsHide: true,
        min_uptime: 5000,
        max_restarts: 5,
        restart_delay: 2000,
        autorestart: true,
      };

      // Only set interpreter if it's not "none"
      if (detectedConfig.interpreter && detectedConfig.interpreter !== 'none') {
        config.interpreter = detectedConfig.interpreter;
      }

      if (detectedConfig.args) {
        config.args = detectedConfig.args;
      }

      if (detectedConfig.type === 'nodejs' && detectedConfig.entryPoint) {
        config.watch = true;
      }

      await processesApi.start(config);
      toast.success(`Started ${name} on port ${port}`);

      // Clear form
      setProjectPath('');
      setDetectedConfig(null);
      onLaunched?.();
    } catch (error: any) {
      console.error('Launch error:', error);
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setIsLaunching(false);
    }
  };

  const handleEditConfig = () => {
    setShowConfirmation(false);
    toast.info('Manual configuration mode coming soon. For now, please use the regular Process Wizard.');
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Smart Project Launcher</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
            Auto-Detect
          </span>
        </div>

        <div className="space-y-4">
          {/* Project Directory Input */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Project Directory
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="D:\Projects\your-project"
                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                onClick={handleBrowseDirectory}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md transition-colors"
                title="Browse (Chrome/Edge only)"
              >
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the full path to your project directory
            </p>
          </div>

          {/* Auto-Detect Button */}
          <button
            onClick={handleAutoDetect}
            disabled={isDetecting || !projectPath.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-md hover:from-primary/90 hover:to-primary/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Wand2 className={`h-4 w-4 ${isDetecting ? 'animate-spin' : ''}`} />
            {isDetecting ? 'Detecting Project Type...' : 'Auto-Detect & Launch'}
          </button>

          {/* Info Box */}
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>How it works:</strong>
              <br />• Analyzes package.json to detect framework
              <br />• Reads PORT from CLAUDE.md or .env files
              <br />• Auto-assigns free port if conflict detected
              <br />• Supports: Next.js, T3, Electron, Vite, Nuxt, SvelteKit, CRA
            </p>
          </div>

          {/* Detected Preview (if available) */}
          {detectedConfig && !showConfirmation && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex items-start gap-2">
                <Wand2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Detected: {detectedConfig.framework}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    Port: {detectedConfig.suggestedPort || detectedConfig.port} •{' '}
                    Confidence: {detectedConfig.confidence}
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirmation(true)}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Review →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <LaunchConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmLaunch}
        onEdit={handleEditConfig}
        projectPath={projectPath}
        detectedConfig={detectedConfig}
      />
    </>
  );
}
