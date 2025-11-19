import { useState, useEffect } from 'react';
import { Network, AlertCircle, X, RefreshCw } from 'lucide-react';
import { systemApi, PortInfo, PortScanResult } from '@/api/endpoints';
import toast from 'react-hot-toast';

export function PortMonitor() {
  const [ports, setPorts] = useState<PortScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [killing, setKilling] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPorts = async () => {
    try {
      setRefreshing(true);
      const data = await systemApi.getPorts();
      setPorts(data);
    } catch (error) {
      toast.error(`Failed to fetch ports: ${(error as Error).message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPorts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPorts, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleKillProcess = async (pid: number, port: number) => {
    if (!confirm(`Kill process PID ${pid} (port ${port})?\n\nNote: This requires admin permissions on Windows.`)) {
      return;
    }

    setKilling(pid);
    try {
      await systemApi.killProcess(pid);
      toast.success(`Process ${pid} killed successfully`);
      // Refresh port list
      await fetchPorts();
    } catch (error) {
      const err = error as any;
      if (err.response?.status === 403) {
        toast.error('Admin privileges required to kill processes');
      } else if (err.response?.status === 500) {
        toast.error('Failed to kill process. Try running PM2 GUI as administrator.');
      } else {
        toast.error(`Failed to kill process: ${err.message}`);
      }
    } finally {
      setKilling(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!ports) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-2 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <p>Failed to load port information</p>
        </div>
      </div>
    );
  }

  const PortBadge = ({ info }: { info: PortInfo }) => (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${
        info.isPM2GUI
          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
          : info.pm2ProcessName
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          : info.isOrphaned
          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      }`}
    >
      <Network className="h-3.5 w-3.5" />
      <span className="font-mono font-bold">{info.port}</span>
    </div>
  );

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Port Monitor</h2>
          <span className="text-sm text-muted-foreground">
            ({ports.total} port{ports.total !== 1 ? 's' : ''} in use)
          </span>
        </div>
        <button
          onClick={fetchPorts}
          disabled={refreshing}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title="Refresh port scan"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* PM2 GUI Ports */}
        {ports.gui.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              PM2 GUI Ports
            </h3>
            <div className="flex flex-wrap gap-2">
              {ports.gui.map((info) => (
                <div key={`gui-${info.port}-${info.pid}`} className="flex items-center gap-1">
                  <PortBadge info={info} />
                  <div className="text-xs text-muted-foreground">
                    {info.port === 3001 && '(Backend API)'}
                    {info.port === 5173 && '(Frontend Dev)'}
                    <div className="font-mono text-[10px]">
                      {info.processName} [PID: {info.pid}]
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PM2 Process Ports */}
        {ports.pm2.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              PM2 Process Ports
            </h3>
            <div className="flex flex-wrap gap-2">
              {ports.pm2.map((info) => (
                <div key={`pm2-${info.port}-${info.pid}`} className="flex items-center gap-1">
                  <PortBadge info={info} />
                  <div className="text-xs">
                    <div className="font-semibold">{info.pm2ProcessName}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {info.processName} [PID: {info.pid}]
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orphaned Ports */}
        {ports.orphaned.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Orphaned Ports (Not PM2)
              <span className="text-xs font-normal">(Click X to kill)</span>
            </h3>
            <div className="space-y-1">
              {ports.orphaned.map((info) => (
                <div
                  key={`orphaned-${info.port}-${info.pid}`}
                  className="flex items-center justify-between p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                >
                  <div className="flex items-center gap-2">
                    <PortBadge info={info} />
                    <div className="text-xs">
                      <div className="font-semibold">{info.processName}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        PID: {info.pid} | Protocol: {info.protocol}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleKillProcess(info.pid, info.port)}
                    disabled={killing === info.pid}
                    className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-900 transition-colors disabled:opacity-50"
                    title={`Kill process ${info.pid} (requires admin)`}
                  >
                    {killing === info.pid ? (
                      <RefreshCw className="h-4 w-4 text-red-600 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No orphaned ports */}
        {ports.orphaned.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-2">
            No orphaned ports detected
          </div>
        )}

        {/* Legend */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span>PM2 GUI</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>PM2 Processes</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Orphaned (Non-PM2)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
