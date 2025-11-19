import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LayoutDashboard, List, Terminal, Activity, Settings, PlusCircle, RotateCw, Square, Play } from 'lucide-react';
import { useProcessStore } from '@/stores/processStore';
import { processesApi } from '@/api/endpoints';
import toast from 'react-hot-toast';

interface CommandAction {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const processes = useProcessStore((state) => state.processes);

  // Build command list
  const commands: CommandAction[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      name: 'Go to Dashboard',
      description: 'Navigate to dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
      action: () => navigate('/'),
      keywords: ['dashboard', 'home', 'main'],
    },
    {
      id: 'nav-processes',
      name: 'Go to Processes',
      description: 'View all processes',
      icon: <List className="h-4 w-4" />,
      action: () => navigate('/processes'),
      keywords: ['processes', 'list', 'apps'],
    },
    {
      id: 'nav-logs',
      name: 'Go to Logs',
      description: 'View log stream',
      icon: <Terminal className="h-4 w-4" />,
      action: () => navigate('/logs'),
      keywords: ['logs', 'output', 'stream'],
    },
    {
      id: 'nav-monitoring',
      name: 'Go to Monitoring',
      description: 'System metrics',
      icon: <Activity className="h-4 w-4" />,
      action: () => navigate('/monitoring'),
      keywords: ['monitoring', 'metrics', 'cpu', 'memory'],
    },
    {
      id: 'nav-settings',
      name: 'Go to Settings',
      description: 'Configure preferences',
      icon: <Settings className="h-4 w-4" />,
      action: () => navigate('/settings'),
      keywords: ['settings', 'preferences', 'config'],
    },
    {
      id: 'nav-new',
      name: 'New Process',
      description: 'Create new process',
      icon: <PlusCircle className="h-4 w-4" />,
      action: () => navigate('/new'),
      keywords: ['new', 'create', 'start', 'add'],
    },
    // Global actions
    {
      id: 'action-restart-all',
      name: 'Restart All Processes',
      description: 'Restart every process',
      icon: <RotateCw className="h-4 w-4 text-blue-500" />,
      action: async () => {
        try {
          await processesApi.restartAll();
          toast.success('All processes restarted');
        } catch {
          toast.error('Failed to restart all');
        }
      },
      keywords: ['restart', 'all', 'refresh'],
    },
    {
      id: 'action-stop-all',
      name: 'Stop All Processes',
      description: 'Stop every process',
      icon: <Square className="h-4 w-4 text-yellow-500" />,
      action: async () => {
        if (confirm('Stop all processes?')) {
          try {
            await processesApi.stopAll();
            toast.success('All processes stopped');
          } catch {
            toast.error('Failed to stop all');
          }
        }
      },
      keywords: ['stop', 'all', 'halt'],
    },
    // Process-specific commands
    ...processes.map((proc) => ({
      id: `restart-${proc.pm_id}`,
      name: `Restart ${proc.name}`,
      description: `Restart process #${proc.pm_id}`,
      icon: <RotateCw className="h-4 w-4 text-blue-500" />,
      action: async () => {
        try {
          await processesApi.restart(proc.pm_id);
          toast.success(`${proc.name} restarted`);
        } catch {
          toast.error(`Failed to restart ${proc.name}`);
        }
      },
      keywords: ['restart', proc.name.toLowerCase()],
    })),
    ...processes.map((proc) => ({
      id: `stop-${proc.pm_id}`,
      name: `Stop ${proc.name}`,
      description: `Stop process #${proc.pm_id}`,
      icon: <Square className="h-4 w-4 text-yellow-500" />,
      action: async () => {
        try {
          await processesApi.stop(proc.pm_id);
          toast.success(`${proc.name} stopped`);
        } catch {
          toast.error(`Failed to stop ${proc.name}`);
        }
      },
      keywords: ['stop', proc.name.toLowerCase()],
    })),
  ];

  // Filter commands
  const filteredCommands = search
    ? commands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(search.toLowerCase()) ||
          cmd.description.toLowerCase().includes(search.toLowerCase()) ||
          cmd.keywords.some((kw) => kw.includes(search.toLowerCase()))
      )
    : commands.slice(0, 10);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].action();
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Command Palette */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-xl bg-background border rounded-lg shadow-2xl z-50">
        {/* Search Input */}
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full bg-transparent py-4 px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs bg-muted px-2 py-1 rounded">ESC</kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2 text-sm ${
                  i === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted'
                }`}
              >
                {cmd.icon}
                <div className="flex-1 text-left">
                  <div className="font-medium">{cmd.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {cmd.description}
                  </div>
                </div>
                {i === selectedIndex && (
                  <kbd className="text-xs bg-muted px-2 py-1 rounded">Enter</kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex gap-4">
          <span>
            <kbd className="bg-muted px-1 rounded">↑↓</kbd> Navigate
          </span>
          <span>
            <kbd className="bg-muted px-1 rounded">Enter</kbd> Select
          </span>
          <span>
            <kbd className="bg-muted px-1 rounded">Esc</kbd> Close
          </span>
        </div>
      </div>
    </>
  );
}
