import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Wifi, WifiOff, RefreshCw, User, LogOut, Key, Power } from 'lucide-react';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { systemApi } from '@/api/endpoints';
import toast from 'react-hot-toast';

interface HeaderProps {
  connected: boolean;
  connecting: boolean;
}

export function Header({ connected, connecting }: HeaderProps) {
  const { theme, setTheme } = useSettingsStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleShutdown = async () => {
    if (!confirm('Are you sure you want to shut down the PM2 daemon? This will stop all running processes.')) {
      return;
    }

    try {
      await systemApi.shutdown();
      toast.success('PM2 daemon shutdown initiated');
      setShowUserMenu(false);
    } catch (error) {
      toast.error(`Failed to shutdown: ${(error as Error).message}`);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <a href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">PM2</span>
            </div>
            <span className="hidden font-bold sm:inline-block">
              Control Center
            </span>
          </a>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {connecting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-yellow-500" />
                <span className="text-sm text-yellow-500">Connecting...</span>
              </>
            ) : connected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-500">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-500">Disconnected</span>
              </>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </button>

          {/* User Menu / System Actions */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-accent"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.username || 'System'}</span>
              {user && <span className="text-xs text-muted-foreground capitalize">({user.role})</span>}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg">
                <div className="p-2">
                  {user && (
                    <>
                      <div className="px-2 py-1.5 text-sm font-medium">
                        {user.username}
                      </div>
                      <div className="px-2 pb-2 text-xs text-muted-foreground capitalize">
                        Role: {user.role}
                      </div>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/settings');
                        }}
                        className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleShutdown}
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-orange-600 hover:bg-accent"
                  >
                    <Power className="mr-2 h-4 w-4" />
                    Shutdown PM2
                  </button>
                  {user && (
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-red-600 hover:bg-accent"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
