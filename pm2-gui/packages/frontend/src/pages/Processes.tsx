import { useState } from 'react';
import { useProcessStore } from '@/stores/processStore';
import { ProcessTable } from '@/components/process/ProcessTable';
import { ProcessDetailPanel } from '@/components/process/ProcessDetailPanel';
import { QuickLauncherV2 } from '@/components/process/QuickLauncherV2';
import { processesApi } from '@/api/endpoints';
import toast from 'react-hot-toast';
import { Process } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function Processes() {
  const processes = useProcessStore((state) => state.processes);
  const isLoading = useProcessStore((state) => state.isLoading);
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
  const [showLauncher, setShowLauncher] = useState(false);

  const handleRestart = async (id: number) => {
    try {
      await processesApi.restart(id);
      toast.success(`Process ${id} restarted`);
    } catch (error) {
      toast.error(`Failed to restart: ${(error as Error).message}`);
    }
  };

  const handleStop = async (id: number) => {
    try {
      await processesApi.stop(id);
      toast.success(`Process ${id} stopped`);
    } catch (error) {
      toast.error(`Failed to stop: ${(error as Error).message}`);
    }
  };

  const handleReload = async (id: number) => {
    try {
      await processesApi.reload(id);
      toast.success(`Process ${id} reloaded with 0-downtime`);
    } catch (error) {
      toast.error(`Failed to reload: ${(error as Error).message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`Delete process ${id}?`)) return;
    try {
      await processesApi.delete(id);
      toast.success(`Process ${id} deleted`);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status: number; data?: { error?: string } }; message: string };
      if (axiosError.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (axiosError.response?.status === 403) {
        toast.error('Admin privileges required to delete processes.');
      } else {
        toast.error(`Failed to delete: ${axiosError.response?.data?.error || axiosError.message}`);
      }
    }
  };

  const handleSelect = (id: number) => {
    const process = processes.find((p) => p.pm_id === id);
    if (process) {
      setSelectedProcess(process);
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Processes</h1>
          <p className="text-muted-foreground">
            Manage all your PM2 processes
          </p>
        </div>
        <button
          onClick={() => setShowLauncher(!showLauncher)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {showLauncher ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Launcher
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Quick Launch
            </>
          )}
        </button>
      </div>

      {showLauncher && (
        <QuickLauncherV2 onLaunched={() => setShowLauncher(false)} />
      )}

      <div className="rounded-lg border bg-card">
        <ProcessTable
          processes={processes}
          onRestart={handleRestart}
          onStop={handleStop}
          onReload={handleReload}
          onDelete={handleDelete}
          onSelect={handleSelect}
        />
      </div>

      {/* Process Detail Slide-over Panel */}
      <ProcessDetailPanel
        process={selectedProcess}
        onClose={() => setSelectedProcess(null)}
        onAction={() => {
          // Refresh the selected process data
          if (selectedProcess) {
            const updated = processes.find((p) => p.pm_id === selectedProcess.pm_id);
            if (updated) {
              setSelectedProcess(updated);
            }
          }
        }}
      />
    </div>
  );
}
