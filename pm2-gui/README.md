# PM2 Control Center

A modern, feature-rich web GUI for PM2 process manager. Control your PM2 processes with buttons instead of commands.

![PM2 Control Center](https://img.shields.io/badge/PM2-Control%20Center-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Real-time Process Monitoring** - Live CPU, memory, and status updates via WebSocket
- **One-Click Actions** - Start, stop, restart, delete processes with a single click
- **Live Log Streaming** - View logs in real-time with filtering and search
- **Advanced Process Wizard** - Multi-step wizard for creating processes with environment variables, resource limits, and cron scheduling
- **Process Detail Panel** - Slide-over panel with metrics, environment variables, and configuration
- **System Monitoring Dashboard** - Real-time charts for CPU, memory, and load average with historical data
- **Cluster Scaling** - Scale cluster instances dynamically
- **Ecosystem Management** - Export and import PM2 ecosystem configurations
- **Command Palette** - Quick actions with Ctrl+K keyboard shortcut
- **JWT Authentication** - Secure authentication with role-based access control (admin/viewer)
- **Dark/Light Theme** - Automatic theme switching with persistence
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Docker Support** - Production-ready Docker and docker-compose configuration
- **Security Hardening** - Rate limiting, Helmet security headers, bcrypt password hashing

## Screenshots

*Dashboard with process overview and quick actions*

*Real-time log viewer with filtering*

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PM2 installed globally (`npm install -g pm2`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd pm2-gui

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

### Access

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws

## Architecture

```
pm2-gui/
├── packages/
│   ├── backend/          # Express.js API server
│   │   ├── src/
│   │   │   ├── pm2/      # PM2 programmatic API integration
│   │   │   ├── routes/   # REST API endpoints
│   │   │   ├── websocket/# Real-time WebSocket server
│   │   │   └── types/    # TypeScript type definitions
│   │   └── package.json
│   │
│   └── frontend/         # React SPA
│       ├── src/
│       │   ├── pages/    # Page components
│       │   ├── components/# Reusable UI components
│       │   ├── hooks/    # Custom React hooks
│       │   ├── stores/   # Zustand state management
│       │   └── api/      # API client
│       └── package.json
│
├── package.json          # Monorepo root
└── pnpm-workspace.yaml   # Workspace configuration
```

## Tech Stack

### Backend
- **Express.js** - HTTP server and REST API
- **WebSocket (ws)** - Real-time communication
- **PM2 Programmatic API** - Direct PM2 daemon integration
- **TypeScript** - Type safety and better DX
- **Zod** - Request validation

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Recharts** - Charts and visualizations
- **Lucide Icons** - Beautiful icons
- **React Router** - Client-side routing

## API Endpoints

### Process Management
```
GET    /api/processes              # List all processes
GET    /api/processes/:id          # Get process details
POST   /api/processes              # Start new process
POST   /api/processes/:id/restart  # Restart process
POST   /api/processes/:id/stop     # Stop process
POST   /api/processes/:id/reload   # Graceful reload
DELETE /api/processes/:id          # Delete process
POST   /api/processes/restart-all  # Restart all
POST   /api/processes/stop-all     # Stop all
```

### System
```
GET    /api/system/info            # System information
POST   /api/system/dump            # Save process list
POST   /api/system/resurrect       # Restore processes
```

### Logs
```
POST   /api/logs/:id/flush         # Flush process logs
POST   /api/logs/flush-all         # Flush all logs
```

### Authentication
```
POST   /api/auth/login             # Login and get JWT token
GET    /api/auth/me                # Get current user info
POST   /api/auth/change-password   # Change password
POST   /api/auth/logout            # Logout (client-side)
```

### Health Check
```
GET    /health                     # Server health status
```

## WebSocket Events

### Server → Client
- `PROCESS_LIST_UPDATE` - Updated process list with metrics
- `PROCESS_EVENT` - Process state change (online/stopped/errored)
- `LOG_MESSAGE` - Real-time log entry
- `METRICS_UPDATE` - CPU/Memory metrics
- `CONNECTION_STATUS` - Connection state

### Client → Server
- `SUBSCRIBE_LOGS` - Subscribe to process logs
- `UNSUBSCRIBE_LOGS` - Unsubscribe from logs

## Development

### Commands

```bash
# Start all in development mode
pnpm dev

# Start only backend
pnpm dev:backend

# Start only frontend
pnpm dev:frontend

# Build for production
pnpm build

# Lint code
pnpm lint

# Clean build artifacts
pnpm -r clean
```

### Environment Variables (Backend)

Copy `.env.example` to `.env` in `packages/backend/`:

```env
PORT=3001
HOST=0.0.0.0
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

## Production Deployment

### Build

```bash
# Build both packages
pnpm build

# Backend output: packages/backend/dist/
# Frontend output: packages/frontend/dist/
```

### Run

```bash
# Start backend
cd packages/backend
node dist/index.js

# Serve frontend (with nginx, serve, etc.)
npx serve packages/frontend/dist
```

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
docker build -t pm2-control-center .
docker run -d \
  -p 3001:3001 \
  -v ~/.pm2:/root/.pm2 \
  -e JWT_SECRET=your-secret-key \
  pm2-control-center
```

The Docker container includes:
- Multi-stage build for optimized size
- PM2 pre-installed
- Health checks
- Volume mounts for PM2 socket and user data
- Production-ready security settings

**Default credentials**: `admin` / `admin` (change after first login)

## Configuration

### Process Config Schema

```typescript
interface ProcessConfig {
  name: string;              // Process name (required)
  script: string;            // Script path (required)
  cwd?: string;              // Working directory
  instances?: number | 'max';// Cluster instances
  exec_mode?: 'fork' | 'cluster';
  env?: Record<string, string>;
  max_memory_restart?: string;
  max_restarts?: number;
  autorestart?: boolean;
  watch?: boolean;
  cron_restart?: string;
}
```

## Roadmap

### Phase 1-2: Foundation (Complete)
- [x] Monorepo setup with pnpm workspaces
- [x] Backend API with PM2 integration
- [x] WebSocket real-time updates
- [x] Frontend with React + Tailwind
- [x] Dashboard with stats
- [x] Process table with actions
- [x] Log viewer with filtering
- [x] New process wizard
- [x] Settings page

### Phase 3-4: Core Features (Complete)
- [x] Process detail slide-over panel
- [x] Environment variables viewer
- [x] Configuration viewer
- [x] Enhanced log viewer

### Phase 5: Advanced Process Management (Complete)
- [x] Multi-step process creation wizard
- [x] Environment variables editor
- [x] Resource limits configuration
- [x] Cron scheduling
- [x] Ecosystem export/import

### Phase 6: Enhanced Monitoring (Complete)
- [x] System monitoring dashboard with Recharts
- [x] Historical metrics (CPU, memory, load average)
- [x] Cluster scaling UI
- [x] Command palette (Ctrl+K)
- [x] Quick actions and navigation

### Phase 7: Production Ready (Complete)
- [x] JWT authentication with role-based access
- [x] Password change functionality
- [x] Security hardening (rate limiting, Helmet, bcrypt)
- [x] Docker and docker-compose configuration
- [x] Environment variable documentation

### Future Plans
- [ ] Multi-server management
- [ ] Deployment automation
- [ ] Custom metrics visualization
- [ ] API documentation (Swagger/OpenAPI)
- [ ] E2E tests with Playwright
- [ ] User management UI
- [ ] Webhook notifications
- [ ] Backup and restore

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [PM2](https://pm2.keymetrics.io/) - Process manager for Node.js
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Lucide](https://lucide.dev/) - Beautiful icons
- [Zustand](https://github.com/pmndrs/zustand) - Simple state management

---

**Built with love for the PM2 community**
