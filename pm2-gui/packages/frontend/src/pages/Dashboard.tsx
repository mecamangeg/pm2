import { Activity, CheckCircle, XCircle, AlertTriangle, RotateCw, Square, Trash } from 'lucide-react';
import { useProcessStore, useProcessStats } from '@/stores/processStore';
import { ProcessTable } from '@/components/process/ProcessTable';
import { PortMonitor } from '@/components/monitoring/PortMonitor';
import { processesApi, logsApi, systemApi } from '@/api/endpoints';
import toast from 'react-hot-toast';

export function Dashboard() {
  const processes = useProcessStore((state) => state.processes);
  const isLoading = useProcessStore((state) => state.isLoading);
  const stats = useProcessStats();

  const handleRestart = async (id: number) => {
    try {
      await processesApi.restart(id);
      toast.success(`Process ${id} restarted`);
    } catch (error) {
      toast.error(`Failed to restart process: ${(error as Error).message}`);
    }
  };

  const handleStop = async (id: number) => {
    try {
      await processesApi.stop(id);
      toast.success(`Process ${id} stopped`);
    } catch (error) {
      toast.error(`Failed to stop process: ${(error as Error).message}`);
    }
  };

  const handleReload = async (id: number) => {
    try {
      await processesApi.reload(id);
      toast.success(`Process ${id} reloaded with 0-downtime`);
    } catch (error) {
      toast.error(`Failed to reload process: ${(error as Error).message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Are you sure you want to delete process ${id}?`)) return;
    try {
      await processesApi.delete(id);
      toast.success(`Process ${id} deleted`);
    } catch (error) {
      toast.error(`Failed to delete process: ${(error as Error).message}`);
    }
  };

  const handleSelect = (id: number) => {
    console.log('Selected process:', id);
    // TODO: Open detail panel
  };

  const handleRestartAll = async () => {
    if (!confirm('Are you sure you want to restart all processes?')) return;
    try {
      await processesApi.restartAll();
      toast.success('All processes restarted');
    } catch (error) {
      toast.error(`Failed to restart all: ${(error as Error).message}`);
    }
  };

  const handleStopAll = async () => {
    if (!confirm('Are you sure you want to stop all processes?')) return;
    try {
      await processesApi.stopAll();
      toast.success('All processes stopped');
    } catch (error) {
      toast.error(`Failed to stop all: ${(error as Error).message}`);
    }
  };

  const handleFlushLogs = async () => {
    if (!confirm('Are you sure you want to flush all logs?')) return;
    try {
      await logsApi.flushAll();
      toast.success('All logs flushed');
    } catch (error) {
      toast.error(`Failed to flush logs: ${(error as Error).message}`);
    }
  };

  const handleSaveState = async () => {
    try {
      await systemApi.dump();
      toast.success('Process state saved');
    } catch (error) {
      toast.error(`Failed to save state: ${(error as Error).message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor and control your PM2 processes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-primary" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Total Processes
              </p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Running
              </p>
              <p className="text-2xl font-bold text-green-600">{stats.online}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-gray-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Stopped
              </p>
              <p className="text-2xl font-bold text-gray-600">{stats.stopped}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Errored
              </p>
              <p className="text-2xl font-bold text-red-600">{stats.errored}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleRestartAll}
          className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Restart All
        </button>
        <button
          onClick={handleStopAll}
          className="inline-flex items-center px-4 py-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
        >
          <Square className="h-4 w-4 mr-2" />
          Stop All
        </button>
        <button
          onClick={handleFlushLogs}
          className="inline-flex items-center px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 transition-colors"
        >
          <Trash className="h-4 w-4 mr-2" />
          Flush Logs
        </button>
        <button
          onClick={handleSaveState}
          className="inline-flex items-center px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Save State
        </button>
      </div>

      {/* Port Monitor */}
      <PortMonitor />

      {/* Process Table */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Processes</h2>
        </div>
        <ProcessTable
          processes={processes}
          onRestart={handleRestart}
          onStop={handleStop}
          onReload={handleReload}
          onDelete={handleDelete}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
