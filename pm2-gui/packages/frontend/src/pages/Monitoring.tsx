import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Cpu, HardDrive, Activity, Clock } from 'lucide-react';
import { apiClient } from '@/api/client';
import { formatBytes, formatUptime } from '@/utils/formatters';

interface MetricPoint {
  timestamp: number;
  cpu: number;
  memory: number;
  load: number[];
}

interface SystemMetrics {
  cpu: number;
  memory: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  load: number[];
  uptime: number;
}

export function Monitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [timeRange, setTimeRange] = useState(5); // minutes
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [metricsRes, historyRes] = await Promise.all([
          apiClient.get<SystemMetrics>('/system/metrics'),
          apiClient.get<{ history: MetricPoint[] }>(`/system/metrics/history?minutes=${timeRange}`),
        ]);
        setMetrics(metricsRes.data);
        setHistory(historyRes.data.history);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const chartData = history.map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString(),
    cpu: point.cpu,
    memory: point.memory,
    load1: point.load[0],
    load5: point.load[1],
    load15: point.load[2],
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system metrics and performance history
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          className="rounded-md border bg-background px-3 py-2"
        >
          <option value={1}>Last 1 minute</option>
          <option value={5}>Last 5 minutes</option>
          <option value={10}>Last 10 minutes</option>
        </select>
      </div>

      {/* Current Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Cpu className="h-4 w-4" />
            <span className="text-sm font-medium">CPU Usage</span>
          </div>
          <div className="text-3xl font-bold">{metrics?.cpu.toFixed(1)}%</div>
          <div className="mt-2 w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                (metrics?.cpu || 0) > 80
                  ? 'bg-red-500'
                  : (metrics?.cpu || 0) > 50
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(metrics?.cpu || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <HardDrive className="h-4 w-4" />
            <span className="text-sm font-medium">Memory Usage</span>
          </div>
          <div className="text-3xl font-bold">
            {metrics?.memory.percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatBytes(metrics?.memory.used || 0)} / {formatBytes(metrics?.memory.total || 0)}
          </div>
          <div className="mt-2 w-full bg-muted rounded-full h-2">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(metrics?.memory.percentage || 0, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Load Average</span>
          </div>
          <div className="text-3xl font-bold">
            {metrics?.load[0].toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            1m: {metrics?.load[0].toFixed(2)} | 5m: {metrics?.load[1].toFixed(2)} | 15m: {metrics?.load[2].toFixed(2)}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">System Uptime</span>
          </div>
          <div className="text-3xl font-bold">
            {formatUptime((metrics?.uptime || 0) * 1000)}
          </div>
        </div>
      </div>

      {/* CPU Chart */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">CPU Usage Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="cpu"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.2)"
                strokeWidth={2}
                name="CPU %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Memory Chart */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Memory Usage Over Time</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="memory"
                stroke="#3b82f6"
                fill="rgba(59, 130, 246, 0.2)"
                strokeWidth={2}
                name="Memory %"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Load Average Chart */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Load Average</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="load1"
                stroke="#10b981"
                strokeWidth={2}
                name="1 min"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="load5"
                stroke="#f59e0b"
                strokeWidth={2}
                name="5 min"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="load15"
                stroke="#ef4444"
                strokeWidth={2}
                name="15 min"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
