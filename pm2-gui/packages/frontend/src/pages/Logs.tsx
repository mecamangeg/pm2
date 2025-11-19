import { useRef, useEffect } from 'react';
import { Pause, Play, Trash, Download } from 'lucide-react';
import { useLogStore, useFilteredLogs } from '@/stores/logStore';
import { useProcessStore } from '@/stores/processStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatTimestamp } from '@/utils/formatters';
import { clsx } from 'clsx';

export function Logs() {
  const logs = useFilteredLogs();
  const { filters, setFilter, isPaused, togglePause, clearLogs } = useLogStore();
  const processes = useProcessStore((state) => state.processes);
  const autoScroll = useSettingsStore((state) => state.autoScroll);

  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && !isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  const handleDownload = () => {
    const content = logs
      .map(
        (log) =>
          `[${formatTimestamp(log.timestamp)}] [${log.processName}] [${log.type.toUpperCase()}] ${log.message}`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pm2-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs</h1>
        <p className="text-muted-foreground">Real-time process logs</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={filters.processId}
          onChange={(e) =>
            setFilter({
              processId: e.target.value === 'all' ? 'all' : Number(e.target.value),
            })
          }
          className="rounded-md border bg-background px-3 py-2"
        >
          <option value="all">All Processes</option>
          {processes.map((p) => (
            <option key={p.pm_id} value={p.pm_id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={filters.type}
          onChange={(e) =>
            setFilter({ type: e.target.value as 'all' | 'out' | 'err' | 'pm2' })
          }
          className="rounded-md border bg-background px-3 py-2"
        >
          <option value="all">All Types</option>
          <option value="out">stdout</option>
          <option value="err">stderr</option>
          <option value="pm2">PM2</option>
        </select>

        <input
          type="text"
          placeholder="Search logs..."
          value={filters.search}
          onChange={(e) => setFilter({ search: e.target.value })}
          className="rounded-md border bg-background px-3 py-2 flex-1 min-w-[200px]"
        />

        <div className="flex gap-2">
          <button
            onClick={togglePause}
            className={clsx(
              'inline-flex items-center px-3 py-2 rounded-md',
              isPaused
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            )}
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-1" /> Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-1" /> Pause
              </>
            )}
          </button>

          <button
            onClick={clearLogs}
            className="inline-flex items-center px-3 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700"
          >
            <Trash className="h-4 w-4 mr-1" /> Clear
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4 mr-1" /> Download
          </button>
        </div>
      </div>

      {/* Log Stats */}
      <div className="text-sm text-muted-foreground">
        Showing {logs.length} logs {isPaused && '(Paused)'}
      </div>

      {/* Log Viewer */}
      <div
        ref={logContainerRef}
        className="rounded-lg border bg-card p-4 h-[600px] overflow-y-auto font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No logs to display
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex hover:bg-muted/30 py-0.5">
              <span className="text-muted-foreground w-24 flex-shrink-0">
                {formatTimestamp(log.timestamp)}
              </span>
              <span className="text-primary w-32 flex-shrink-0 truncate">
                [{log.processName}]
              </span>
              <span
                className={clsx(
                  'w-16 flex-shrink-0',
                  log.type === 'out' && 'text-blue-500',
                  log.type === 'err' && 'text-red-500',
                  log.type === 'pm2' && 'text-purple-500'
                )}
              >
                [{log.type.toUpperCase()}]
              </span>
              <span className="break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
