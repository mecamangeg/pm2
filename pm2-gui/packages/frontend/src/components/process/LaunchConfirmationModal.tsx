import { X, Rocket, AlertCircle, CheckCircle2 } from 'lucide-react';

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

interface LaunchConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (port: number) => void;
  onEdit: () => void;
  projectPath: string;
  detectedConfig: DetectedConfig | null;
}

export function LaunchConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  onEdit,
  projectPath,
  detectedConfig,
}: LaunchConfirmationModalProps) {
  if (!isOpen || !detectedConfig) return null;

  const projectName = projectPath.split(/[/\\]/).filter(Boolean).pop() || 'project';
  const finalPort = detectedConfig.suggestedPort || detectedConfig.port;

  const confidenceColor = {
    high: 'text-green-600',
    medium: 'text-yellow-600',
    low: 'text-orange-600',
  }[detectedConfig.confidence];

  const confidenceIcon = {
    high: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    medium: <AlertCircle className="h-4 w-4 text-yellow-600" />,
    low: <AlertCircle className="h-4 w-4 text-orange-600" />,
  }[detectedConfig.confidence];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Rocket className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Ready to Launch</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Project Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Project</h3>
            <p className="text-lg font-medium">{projectName}</p>
            <p className="text-sm text-muted-foreground">{projectPath}</p>
          </div>

          {/* Detection Confidence */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Auto-Detected Configuration</h3>
              <div className={`flex items-center gap-1 text-sm ${confidenceColor}`}>
                {confidenceIcon}
                <span className="capitalize">{detectedConfig.confidence} Confidence</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 font-medium">{detectedConfig.framework}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Command:</span>
                <span className="ml-2 font-mono text-xs">
                  {detectedConfig.script} {detectedConfig.args || ''}
                </span>
              </div>
              {detectedConfig.interpreter && (
                <div>
                  <span className="text-muted-foreground">Interpreter:</span>
                  <span className="ml-2 font-medium">{detectedConfig.interpreter}</span>
                </div>
              )}
              {detectedConfig.entryPoint && (
                <div>
                  <span className="text-muted-foreground">Entry Point:</span>
                  <span className="ml-2 font-mono text-xs">{detectedConfig.entryPoint}</span>
                </div>
              )}
            </div>
          </div>

          {/* Port Configuration */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">Port Configuration</h3>

            {detectedConfig.portConflict ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-orange-600">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Port Conflict Detected</p>
                    <p className="text-muted-foreground mt-1">
                      {detectedConfig.portConflict.reason}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Detected Port:</span>
                    <span className="ml-2 font-medium line-through">
                      {detectedConfig.portConflict.original}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Assigned Port:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {detectedConfig.portConflict.suggested} ✓
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>Port {finalPort} is available and will be used</span>
              </div>
            )}
          </div>

          {/* Command Preview */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">PM2 Command</h3>
            <div className="bg-black/50 rounded-md p-3 font-mono text-sm text-green-400">
              pm2 start {detectedConfig.script}
              {detectedConfig.args && ` ${detectedConfig.args}`}
              {` --name ${projectName}-dev --cwd "${projectPath}"`}
            </div>
          </div>

          {/* Low Confidence Warning */}
          {detectedConfig.confidence === 'low' && (
            <div className="flex items-start gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Low Confidence Detection</p>
                <p className="text-muted-foreground mt-1">
                  The project type could not be reliably detected. Please review the
                  configuration before launching, or edit manually.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            Edit Configuration
          </button>
          <button
            onClick={() => onConfirm(finalPort)}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors flex items-center gap-2"
          >
            <Rocket className="h-4 w-4" />
            Launch with PM2
          </button>
        </div>
      </div>
    </div>
  );
}
