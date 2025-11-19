import { clsx } from 'clsx';
import { ProcessStatus } from '@/types';

interface StatusBadgeProps {
  status: ProcessStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  ProcessStatus,
  { label: string; color: string; bgColor: string }
> = {
  online: {
    label: 'Online',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  stopped: {
    label: 'Stopped',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
  stopping: {
    label: 'Stopping',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  errored: {
    label: 'Errored',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  launching: {
    label: 'Launching',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  'one-launch-status': {
    label: 'Initial',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.stopped;

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        config.color,
        config.bgColor,
        sizeClasses[size]
      )}
    >
      <span
        className={clsx(
          'mr-1.5 h-2 w-2 rounded-full',
          status === 'online' && 'bg-green-500 animate-pulse',
          status === 'stopped' && 'bg-gray-500',
          status === 'stopping' && 'bg-yellow-500 animate-pulse',
          status === 'errored' && 'bg-red-500',
          status === 'launching' && 'bg-blue-500 animate-pulse'
        )}
      />
      {config.label}
    </span>
  );
}
