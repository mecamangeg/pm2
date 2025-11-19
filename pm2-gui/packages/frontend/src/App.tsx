import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/common/CommandPalette';
import { Dashboard } from '@/pages/Dashboard';
import { Processes } from '@/pages/Processes';
import { Logs } from '@/pages/Logs';
import { NewProcess } from '@/pages/NewProcess';
import { Settings } from '@/pages/Settings';
import { Monitoring } from '@/pages/Monitoring';
import { Login } from '@/pages/Login';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/stores/authStore';

function ProtectedLayout() {
  const { connected, connecting } = useWebSocket();

  return (
    <div className="min-h-screen bg-background">
      <Header connected={connected} connecting={connecting} />
      <Sidebar />
      <CommandPalette />
      <main className="lg:pl-64">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/processes" element={<Processes />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/new" element={<NewProcess />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  // Authentication disabled - always allow access
  // const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
