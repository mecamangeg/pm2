import { RotateCw, Square, Trash2, Eye, RefreshCcw } from 'lucide-react';
import { Process } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatUptime, formatBytes, formatCPU } from '@/utils/formatters';
import { extractPort, extractFolderName } from '@/utils/processHelpers';

interface ProcessTableProps {
  processes: Process[];
  onRestart: (id: number) => void;
  onStop: (id: number) => void;
  onReload: (id: number) => void;
  onDelete: (id: number) => void;
  onSelect: (id: number) => void;
}

export function ProcessTable({
  processes,
  onRestart,
  onStop,
  onReload,
  onDelete,
  onSelect,
}: ProcessTableProps) {
  if (processes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No processes running</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start a new process to see it here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Port
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              PID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              CPU
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Memory
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Uptime
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Restarts
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {processes.map((process) => (
            <tr
              key={process.pm_id}
              className="hover:bg-muted/30 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={process.pm2_env.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onSelect(process.pm_id)}
                  className="text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                  title="Click to view process details (pm2 describe)"
                >
                  <div className="text-sm font-medium text-primary hover:underline">
                    {extractFolderName(process)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {process.name} [ID: {process.pm_id}]
                  </div>
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {(() => {
                  const port = extractPort(process);
                  return port ? (
                    <a
                      href={`http://localhost:${port}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {port}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  );
                })()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {process.pid || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-16 bg-muted rounded-full h-2 mr-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${Math.min(process.monit.cpu, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm">
                    {formatCPU(process.monit.cpu)}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-16 bg-muted rounded-full h-2 mr-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          (process.monit.memory / (512 * 1024 * 1024)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm">
                    {formatBytes(process.monit.memory)}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {process.pm2_env.pm_uptime
                  ? formatUptime(Date.now() - process.pm2_env.pm_uptime)
                  : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {process.pm2_env.restart_time}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => onSelect(process.pm_id)}
                    className="p-1 rounded hover:bg-muted"
                    title="View Details (pm2 describe)"
                  >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => onRestart(process.pm_id)}
                    className="p-1 rounded hover:bg-muted"
                    title="Restart (pm2 restart)"
                  >
                    <RotateCw className="h-4 w-4 text-blue-500" />
                  </button>
                  <button
                    onClick={() => onReload(process.pm_id)}
                    className="p-1 rounded hover:bg-muted"
                    title="Reload with 0-downtime (pm2 reload)"
                  >
                    <RefreshCcw className="h-4 w-4 text-green-500" />
                  </button>
                  <button
                    onClick={() => onStop(process.pm_id)}
                    className="p-1 rounded hover:bg-muted"
                    title="Stop (pm2 stop)"
                  >
                    <Square className="h-4 w-4 text-yellow-500" />
                  </button>
                  <button
                    onClick={() => onDelete(process.pm_id)}
                    className="p-1 rounded hover:bg-muted"
                    title="Delete (pm2 delete)"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
