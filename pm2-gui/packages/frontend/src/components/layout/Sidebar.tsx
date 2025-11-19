import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  List,
  Terminal,
  PlusCircle,
  Settings,
  Save,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Processes', href: '/processes', icon: List },
  { name: 'Logs', href: '/logs', icon: Terminal },
  { name: 'Monitoring', href: '/monitoring', icon: Activity },
  { name: 'New Process', href: '/new', icon: PlusCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-background px-6 pt-20">
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={clsx(
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )}
                      >
                        <item.icon
                          className={clsx(
                            'h-5 w-5 shrink-0',
                            isActive
                              ? 'text-primary-foreground'
                              : 'text-muted-foreground group-hover:text-foreground'
                          )}
                          aria-hidden="true"
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Quick Actions */}
            <li className="mt-auto pb-4">
              <div className="text-xs font-semibold leading-6 text-muted-foreground mb-2">
                Quick Actions
              </div>
              <button className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted">
                <Save className="h-5 w-5 shrink-0" aria-hidden="true" />
                Save State
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
