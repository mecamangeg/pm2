import { X, RotateCw, Square, Trash2, Play, Activity, Clock, Cpu, HardDrive, Terminal, RefreshCcw } from 'lucide-react';
import { Process } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatUptime, formatBytes, formatCPU } from '@/utils/formatters';
import { useState } from 'react';
import { processesApi } from '@/api/endpoints';
import toast from 'react-hot-toast';

interface ProcessDetailPanelProps {
  process: Process | null;
  onClose: () => void;
  onAction: () => void;
}

type TabType = 'overview' | 'metrics' | 'env' | 'config';

export function ProcessDetailPanel({
  process,
  onClose,
  onAction,
}: ProcessDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState<string | null>(null);

  if (!process) return null;

  const handleRestart = async () => {
    setLoading('restart');
    try {
      await processesApi.restart(process.pm_id);
      toast.success(`Process ${process.name} restarted`);
      onAction();
    } catch (error) {
      toast.error(`Failed to restart: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleStop = async () => {
    setLoading('stop');
    try {
      await processesApi.stop(process.pm_id);
      toast.success(`Process ${process.name} stopped`);
      onAction();
    } catch (error) {
      toast.error(`Failed to stop: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleStart = async () => {
    setLoading('start');
    try {
      await processesApi.restart(process.pm_id);
      toast.success(`Process ${process.name} started`);
      onAction();
    } catch (error) {
      toast.error(`Failed to start: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleReload = async () => {
    setLoading('reload');
    try {
      await processesApi.reload(process.pm_id);
      toast.success(`Process ${process.name} reloaded with 0-downtime`);
      onAction();
    } catch (error) {
      toast.error(`Failed to reload: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${process.name}? This action cannot be undone.`)) {
      return;
    }
    setLoading('delete');
    try {
      await processesApi.delete(process.pm_id);
      toast.success(`Process ${process.name} deleted`);
      onClose();
      onAction();
    } catch (error) {
      toast.error(`Failed to delete: ${(error as Error).message}`);
    } finally {
      setLoading(null);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
    { id: 'metrics', label: 'Metrics', icon: <Cpu className="h-4 w-4" /> },
    { id: 'env', label: 'Environment', icon: <Terminal className="h-4 w-4" /> },
    { id: 'config', label: 'Config', icon: <HardDrive className="h-4 w-4" /> },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-background shadow-xl z-50 flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              {process.name}
              <StatusBadge status={process.pm2_env.status} />
            </h2>
            <p className="text-sm text-muted-foreground">
              PM2 ID: {process.pm_id} | PID: {process.pid || 'N/A'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 p-4 border-b bg-muted/30">
          {process.pm2_env.status === 'stopped' ? (
            <button
              onClick={handleStart}
              disabled={loading !== null}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              title="Start (pm2 start)"
            >
              <Play className="h-4 w-4" />
              {loading === 'start' ? 'Starting...' : 'Start'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading !== null}
              className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 disabled:opacity-50"
              title="Stop (pm2 stop)"
            >
              <Square className="h-4 w-4" />
              {loading === 'stop' ? 'Stopping...' : 'Stop'}
            </button>
          )}
          <button
            onClick={handleRestart}
            disabled={loading !== null}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            title="Restart (pm2 restart)"
          >
            <RotateCw className="h-4 w-4" />
            {loading === 'restart' ? 'Restarting...' : 'Restart'}
          </button>
          <button
            onClick={handleReload}
            disabled={loading !== null}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            title="Reload with 0-downtime (pm2 reload)"
          >
            <RefreshCcw className="h-4 w-4" />
            {loading === 'reload' ? 'Reloading...' : 'Reload'}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            title="Delete (pm2 delete)"
          >
            <Trash2 className="h-4 w-4" />
            {loading === 'delete' ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <div className="text-lg font-semibold">
                    <StatusBadge status={process.pm2_env.status} />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">Uptime</div>
                  <div className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {process.pm2_env.pm_uptime
                      ? formatUptime(Date.now() - process.pm2_env.pm_uptime)
                      : 'N/A'}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">Restarts</div>
                  <div className="text-lg font-semibold">
                    {process.pm2_env.restart_time}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground mb-1">Exec Mode</div>
                  <div className="text-lg font-semibold">
                    {process.pm2_env.exec_mode || 'fork'}
                  </div>
                </div>
              </div>

              {/* Process Info */}
              <div className="space-y-2">
                <h3 className="font-semibold">Process Information</h3>
                <div className="rounded-lg border divide-y">
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Script</span>
                    <span className="font-mono text-sm">{process.pm2_env.pm_exec_path}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">CWD</span>
                    <span className="font-mono text-sm">{process.pm2_env.pm_cwd}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Interpreter</span>
                    <span className="font-mono text-sm">{process.pm2_env.exec_interpreter}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Node Version</span>
                    <span className="font-mono text-sm">{process.pm2_env.node_version}</span>
                  </div>
                  <div className="flex justify-between p-3">
                    <span className="text-muted-foreground">Instances</span>
                    <span>{process.pm2_env.instances || 1}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {/* CPU */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  CPU Usage
                </h3>
                <div className="rounded-lg border p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-2xl font-bold">
                      {formatCPU(process.monit.cpu)}
                    </span>
                    <span className="text-muted-foreground">of 100%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        process.monit.cpu > 80
                          ? 'bg-red-500'
                          : process.monit.cpu > 50
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(process.monit.cpu, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Memory */}
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Memory Usage
                </h3>
                <div className="rounded-lg border p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-2xl font-bold">
                      {formatBytes(process.monit.memory)}
                    </span>
                    <span className="text-muted-foreground">
                      {process.pm2_env.max_memory_restart
                        ? `of ${process.pm2_env.max_memory_restart}`
                        : 'No limit'}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-blue-500 transition-all"
                      style={{
                        width: `${Math.min(
                          (process.monit.memory / (512 * 1024 * 1024)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Event Loop Lag */}
              <div className="space-y-2">
                <h3 className="font-semibold">Additional Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Created At
                    </div>
                    <div className="font-mono text-sm">
                      {process.pm2_env.created_at
                        ? new Date(process.pm2_env.created_at).toLocaleString()
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground mb-1">
                      Unstable Restarts
                    </div>
                    <div className="font-semibold">
                      {process.pm2_env.unstable_restarts || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Environment Variables</h3>
              <div className="rounded-lg border divide-y max-h-96 overflow-y-auto">
                {process.pm2_env.env && Object.keys(process.pm2_env.env).length > 0 ? (
                  Object.entries(process.pm2_env.env).map(([key, value]) => (
                    <div key={key} className="p-3">
                      <div className="font-mono text-sm font-semibold text-primary">
                        {key}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground break-all">
                        {String(value)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No custom environment variables set
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Note: System environment variables are inherited but not shown here.
              </p>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Process Configuration</h3>
              <div className="rounded-lg border divide-y">
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">Auto Restart</span>
                  <span className={process.pm2_env.autorestart ? 'text-green-500' : 'text-red-500'}>
                    {process.pm2_env.autorestart ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">Watch Mode</span>
                  <span className={process.pm2_env.watch ? 'text-green-500' : 'text-muted-foreground'}>
                    {process.pm2_env.watch ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">Max Restarts</span>
                  <span>{process.pm2_env.max_restarts || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">Min Uptime</span>
                  <span>{process.pm2_env.min_uptime || '1000ms'}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">Kill Timeout</span>
                  <span>{process.pm2_env.kill_timeout || '1600ms'}</span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-muted-foreground">Merge Logs</span>
                  <span>{process.pm2_env.merge_logs ? 'Yes' : 'No'}</span>
                </div>
              </div>

              {/* Log Paths */}
              <h3 className="font-semibold mt-6">Log Files</h3>
              <div className="rounded-lg border divide-y">
                <div className="p-3">
                  <div className="text-sm text-muted-foreground mb-1">Output Log</div>
                  <div className="font-mono text-xs break-all">
                    {process.pm2_env.pm_out_log_path || 'N/A'}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-sm text-muted-foreground mb-1">Error Log</div>
                  <div className="font-mono text-xs break-all">
                    {process.pm2_env.pm_err_log_path || 'N/A'}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-sm text-muted-foreground mb-1">PM2 Log</div>
                  <div className="font-mono text-xs break-all">
                    {process.pm2_env.pm_pid_path || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
