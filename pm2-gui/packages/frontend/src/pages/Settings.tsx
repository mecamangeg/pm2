import { useState, useEffect } from 'react';
import { Download, Upload, Check, X, Lock, Network, Plus, Trash2 } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { ecosystemApi } from '@/api/endpoints';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';

export function Settings() {
  const {
    theme,
    setTheme,
    viewMode,
    setViewMode,
    refreshInterval,
    setRefreshInterval,
    showNotifications,
    setShowNotifications,
    autoScroll,
    setAutoScroll,
  } = useSettingsStore();

  const { user } = useAuthStore();

  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState<Array<{
    name: string;
    status: string;
    error?: string;
  }> | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Port reservation state
  const [reservedPorts, setReservedPorts] = useState<number[]>([]);
  const [newPort, setNewPort] = useState('');

  // Load reserved ports from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pm2-gui-reserved-ports');
    if (saved) {
      try {
        setReservedPorts(JSON.parse(saved));
      } catch {
        setReservedPorts([]);
      }
    }
  }, []);

  // Save to localStorage whenever reserved ports change
  useEffect(() => {
    localStorage.setItem('pm2-gui-reserved-ports', JSON.stringify(reservedPorts));
  }, [reservedPorts]);

  const handleAddPort = () => {
    const port = parseInt(newPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      toast.error('Invalid port number (must be 1-65535)');
      return;
    }
    if (reservedPorts.includes(port)) {
      toast.error(`Port ${port} is already reserved`);
      return;
    }
    setReservedPorts([...reservedPorts, port].sort((a, b) => a - b));
    setNewPort('');
    toast.success(`Port ${port} reserved`);
  };

  const handleRemovePort = (port: number) => {
    setReservedPorts(reservedPorts.filter(p => p !== port));
    toast.success(`Port ${port} removed from reservations`);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const ecosystem = await ecosystemApi.export();
      const content = `module.exports = ${JSON.stringify(ecosystem, null, 2)};`;
      const blob = new Blob([content], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ecosystem.config.js';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Ecosystem exported successfully');
    } catch (error) {
      toast.error(`Export failed: ${(error as Error).message}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        // Try to parse as JSON first
        let apps;
        try {
          const json = JSON.parse(content);
          apps = json.apps || json;
        } catch {
          // Try to extract from module.exports format
          const match = content.match(/module\.exports\s*=\s*({[\s\S]*})/);
          if (match) {
            // eslint-disable-next-line no-eval
            apps = eval(`(${match[1]})`).apps;
          } else {
            throw new Error('Invalid ecosystem file format');
          }
        }

        if (!Array.isArray(apps)) {
          throw new Error('Ecosystem file must contain an apps array');
        }

        setImportLoading(true);
        const results = await ecosystemApi.import(apps);
        setImportResults(results);

        const successCount = results.filter((r) => r.status === 'started').length;
        const errorCount = results.filter((r) => r.status === 'error').length;

        if (errorCount === 0) {
          toast.success(`All ${successCount} processes started successfully`);
        } else if (successCount > 0) {
          toast.success(`${successCount} started, ${errorCount} failed`);
        } else {
          toast.error('All processes failed to start');
        }
      } catch (error) {
        toast.error(`Import failed: ${(error as Error).message}`);
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your preferences</p>
      </div>

      {/* Appearance */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Appearance</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
            className="rounded-md border bg-background px-3 py-2"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Default View</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'table' | 'grid')}
            className="rounded-md border bg-background px-3 py-2"
          >
            <option value="table">Table</option>
            <option value="grid">Grid</option>
          </select>
        </div>
      </div>

      {/* Behavior */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Behavior</h2>

        <div>
          <label className="block text-sm font-medium mb-2">
            Refresh Interval (ms)
          </label>
          <input
            type="number"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 2000)}
            min={500}
            max={60000}
            step={500}
            className="w-32 rounded-md border bg-background px-3 py-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            How often to poll for updates (500-60000ms)
          </p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="showNotifications"
            checked={showNotifications}
            onChange={(e) => setShowNotifications(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="showNotifications" className="text-sm font-medium">
            Show Notifications
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoScroll"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="autoScroll" className="text-sm font-medium">
            Auto-scroll Logs
          </label>
        </div>
      </div>

      {/* Port Reservations */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Network className="h-5 w-5" />
          Port Reservations
        </h2>
        <p className="text-sm text-muted-foreground">
          Reserve specific ports for your development workflow. These ports will be highlighted in the Port Monitor.
        </p>

        <div className="flex gap-2">
          <input
            type="number"
            value={newPort}
            onChange={(e) => setNewPort(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddPort()}
            placeholder="Port number (e.g., 3000)"
            min={1}
            max={65535}
            className="flex-1 max-w-xs rounded-md border bg-background px-3 py-2"
          />
          <button
            onClick={handleAddPort}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Reserve Port
          </button>
        </div>

        {reservedPorts.length > 0 ? (
          <div>
            <h3 className="text-sm font-semibold mb-2">Reserved Ports ({reservedPorts.length}):</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {reservedPorts.map((port) => (
                <div
                  key={port}
                  className="flex items-center justify-between bg-muted p-2 rounded border border-primary/20"
                >
                  <span className="font-mono font-semibold text-primary">{port}</span>
                  <button
                    onClick={() => handleRemovePort(port)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove reservation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No ports reserved yet. Add ports that you frequently use for development.
          </div>
        )}
      </div>

      {/* Ecosystem Management */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Ecosystem Management</h2>
        <p className="text-sm text-muted-foreground">
          Export your current process configuration or import from an ecosystem file.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'Exporting...' : 'Export Ecosystem'}
          </button>

          <label className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 cursor-pointer">
            <Upload className="h-4 w-4" />
            {importLoading ? 'Importing...' : 'Import Ecosystem'}
            <input
              type="file"
              accept=".js,.json"
              onChange={handleImportFile}
              className="hidden"
              disabled={importLoading}
            />
          </label>
        </div>

        {importResults && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-2">Import Results:</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {importResults.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2 rounded ${
                    result.status === 'started' ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {result.status === 'started' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{result.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {result.status === 'started' ? 'Started' : result.error}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setImportResults(null)}
              className="mt-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Clear results
            </button>
          </div>
        )}
      </div>

      {/* Security */}
      {user && (
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </h2>
          <p className="text-sm text-muted-foreground">
            Change your account password. Password must be at least 6 characters.
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full max-w-sm rounded-md border bg-background px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full max-w-sm rounded-md border bg-background px-3 py-2"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full max-w-sm rounded-md border bg-background px-3 py-2"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      )}

      {/* About */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">About</h2>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>PM2 Control Center v1.0.0</p>
          <p>A modern web GUI for PM2 process manager</p>
          <p className="pt-2">
            Built with React, TypeScript, Tailwind CSS, and Express.js
          </p>
        </div>
      </div>
    </div>
  );
}
