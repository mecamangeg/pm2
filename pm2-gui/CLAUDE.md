# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

PM2 Control Center is a modern web GUI for managing PM2 processes. It's a TypeScript monorepo using pnpm workspaces with a React frontend and Express backend connected via WebSocket for real-time updates.

## Development Commands

### Setup
```bash
pnpm install              # Install all dependencies (run from root)
```

### Development
```bash
pnpm dev                  # Start both backend (3001) and frontend (5173) in parallel
pnpm dev:backend          # Start only backend with ts-node-dev
pnpm dev:frontend         # Start only frontend with Vite
```

### Build & Production
```bash
pnpm build                # Build both packages (backend/dist, frontend/dist)
pnpm build:backend        # Build backend only (TypeScript compilation)
pnpm build:frontend       # Build frontend only (Vite production build)
```

### Code Quality
```bash
pnpm lint                 # Run ESLint on all packages
pnpm clean                # Remove all build artifacts
```

### Testing
No test suite currently exists. When adding tests, use the `pnpm test` command pattern.

## Architecture

### Monorepo Structure
- **Root**: Orchestrates both packages via pnpm workspaces
- **packages/backend**: Express.js API server (port 3001)
- **packages/frontend**: React SPA (port 5173 in dev)

### Backend Architecture

#### PM2 Integration Pattern
The backend uses a **singleton PM2 client** (`pm2Client`) that manages the connection to the PM2 daemon:
- **Location**: `packages/backend/src/pm2/client.ts`
- **Key methods**: `connect()`, `disconnect()`, `ensureConnected()`, `reconnect()`
- **Reconnection logic**: Exponential backoff with configurable max attempts
- **Usage**: All PM2 operations call `ensureConnected()` first

#### API Layer Pattern
PM2 operations are abstracted through `pm2API` class:
- **Location**: `packages/backend/src/pm2/api.ts`
- **Pattern**: Promisified wrappers around PM2 callback-based API
- **Methods**: `list()`, `describe()`, `start()`, `restart()`, `stop()`, `delete()`, `scale()`
- **Error handling**: Custom error classes (`PM2Error`, `ProcessNotFoundError`)

#### WebSocket Real-Time Updates
WebSocket server (`wsManager`) broadcasts process events:
- **Location**: `packages/backend/src/websocket/server.ts`
- **Path**: `/ws`
- **Features**: Heartbeat/ping-pong, per-process log subscriptions, reconnection handling
- **Message types**: `PROCESS_LIST_UPDATE`, `LOG_MESSAGE`, `PROCESS_EVENT`, `CONNECTION_STATUS`
- **PM2 Event Bus**: `packages/backend/src/pm2/events.ts` listens to PM2 events and broadcasts via WebSocket

#### Authentication & Authorization
JWT-based authentication with role-based access:
- **File storage**: `packages/backend/data/users.json` (created automatically)
- **Default credentials**: `admin` / `admin123` (auto-created on first run)
- **Roles**: `admin` (full access), `viewer` (read-only)
- **Middleware**: `authMiddleware` (validates JWT), `requireAdmin` (checks role)
- **Environment variable**: `AUTH_ENABLED=false` disables auth (not recommended for production)

### Frontend Architecture

#### State Management Strategy
Uses **Zustand** for global state with distinct stores:
- **processStore**: Process list, selected process, loading states
- **logStore**: Log entries with filtering and limits
- **authStore**: JWT token, user info, authentication state
- **settingsStore**: Theme, refresh intervals, UI preferences

#### WebSocket Integration
Custom hook pattern for real-time updates:
- **Hook**: `useWebSocket` in `packages/frontend/src/hooks/useWebSocket.ts`
- **Reconnection**: Exponential backoff with max 10 attempts
- **Auto-subscription**: Connects on mount, disconnects on unmount
- **State updates**: Messages automatically update Zustand stores (processStore, logStore)

#### API Client Pattern
Axios-based client with interceptors:
- **Location**: `packages/frontend/src/api/client.ts`
- **Base URL**: `/api` (proxied by Vite in dev, same-origin in production)
- **Request interceptor**: Auto-injects JWT token from authStore
- **Response interceptor**: Handles 401 → logout, network errors
- **Endpoints**: Defined in `packages/frontend/src/api/endpoints.ts`

#### Component Organization
- **Pages**: Top-level route components (`Dashboard`, `Processes`, `Logs`, `Monitoring`, `Settings`)
- **Layout**: `Header`, `Sidebar`, `CommandPalette` (Ctrl+K)
- **Process components**: `ProcessTable`, `ProcessDetailPanel`, `ProcessWizard`
- **Common components**: `StatusBadge`, reusable UI elements

## Key Development Patterns

### Adding a New PM2 Operation

**Backend**:
1. Add method to `pm2API` class (`packages/backend/src/pm2/api.ts`)
   ```typescript
   async myOperation(processId: number): Promise<void> {
     await pm2Client.ensureConnected();
     return new Promise((resolve, reject) => {
       pm2.myPM2Method(processId, (err) => {
         if (err) reject(new PM2Error('Operation failed'));
         else resolve();
       });
     });
   }
   ```

2. Add route handler in `packages/backend/src/routes/processes.ts`
   ```typescript
   router.post('/:id/my-operation', requireAdmin, async (req, res, next) => {
     try {
       const processId = Number(req.params.id);
       await pm2API.myOperation(processId);
       res.json({ message: 'Operation successful' });
     } catch (error) {
       next(error);
     }
   });
   ```

**Frontend**:
1. Add endpoint to `packages/frontend/src/api/endpoints.ts`
   ```typescript
   export const myOperation = (id: number) =>
     apiClient.post(`/processes/${id}/my-operation`);
   ```

2. Use in component with error handling
   ```typescript
   import { myOperation } from '@/api/endpoints';
   import toast from 'react-hot-toast';

   const handleOperation = async (id: number) => {
     try {
       await myOperation(id);
       toast.success('Operation successful');
     } catch (error) {
       toast.error('Operation failed');
     }
   };
   ```

### Adding a New WebSocket Message Type

**Backend**:
1. Add type to `packages/backend/src/types/websocket.ts`
2. Broadcast from event bus or route handler:
   ```typescript
   wsManager.broadcast({
     type: 'MY_EVENT',
     data: { /* payload */ },
     timestamp: Date.now(),
   });
   ```

**Frontend**:
1. Add type to `packages/frontend/src/types/index.ts`
2. Handle in `useWebSocket` hook's `handleMessage` function:
   ```typescript
   case 'MY_EVENT': {
     const payload = message.data as MyEventData;
     // Update store or trigger action
     break;
   }
   ```

### Adding a New Page

1. Create page component in `packages/frontend/src/pages/MyPage.tsx`
2. Add route in `App.tsx`:
   ```typescript
   <Route path="/my-page" element={<MyPage />} />
   ```
3. Add navigation link in `Sidebar.tsx`

## Environment Configuration

### Backend `.env` (required for production)
Copy `packages/backend/.env.example` to `packages/backend/.env`:

```env
PORT=3001
HOST=0.0.0.0
AUTH_ENABLED=true
JWT_SECRET=<generate-with-openssl-rand-base64-64>
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info
```

**Critical**: Always change `JWT_SECRET` in production!

### Frontend Configuration
Frontend uses Vite's default behavior:
- **Dev**: Proxy `/api` to `localhost:3001` (configured in `vite.config.ts` if needed)
- **Production**: Expects backend to serve frontend static files and handle `/api` routes

## PM2 Connection Requirements

The backend **requires PM2 to be installed and running**:
- Install globally: `npm install -g pm2` or `pnpm add -g pm2`
- The PM2 daemon must be running (starts automatically when you use PM2)
- Backend connects to PM2 via IPC socket (`~/.pm2/pub.sock` on Linux/Mac, named pipe on Windows)
- If connection fails, backend will retry with exponential backoff

## Authentication Flow

1. **First run**: Backend auto-creates `admin` user (username: `admin`, password: `admin123`)
2. **Login**: POST `/api/auth/login` with `{ username, password }` → returns JWT token
3. **Token usage**: Frontend stores token in localStorage (via authStore)
4. **API requests**: Axios interceptor adds `Authorization: Bearer <token>` header
5. **Expiry**: Token expires after 24h (configurable via `JWT_EXPIRES_IN`)
6. **Logout**: Frontend clears token from store, redirects to `/login`

**Note**: Current frontend disables authentication by default (see `App.tsx` line 40-41). To enable, uncomment the `isAuthenticated` check and update the routing logic.

## Production Deployment

### Build Process
```bash
pnpm build
# Output:
# - Backend: packages/backend/dist/
# - Frontend: packages/frontend/dist/
```

### Deployment Options

**Option 1: Backend serves frontend**
```bash
NODE_ENV=production node packages/backend/dist/index.js
```
Backend will serve frontend static files from `packages/frontend/dist` and handle all routes.

**Option 2: Separate deployments**
- Backend: Run `node packages/backend/dist/index.js` on server
- Frontend: Deploy `packages/frontend/dist` to CDN/static host, set `VITE_API_URL` to backend URL

### Docker
```bash
docker-compose up -d
```
See `Dockerfile` and `docker-compose.yml` for containerized deployment. Default port: 3001.

## Common Gotchas

- **PM2 not connected**: Backend startup will fail if PM2 daemon isn't running. Check logs: "Failed to connect to PM2 daemon"
- **CORS errors in dev**: Ensure `CORS_ORIGIN=http://localhost:5173` in backend `.env`
- **WebSocket disconnects**: Frontend retries with exponential backoff (max 10 attempts). Check network tab for WS connection status.
- **Auth always fails**: Check `AUTH_ENABLED` env var. If `true`, ensure JWT token is valid. If `false`, auth is disabled.
- **Port conflicts**: Backend defaults to 3001, frontend to 5173. Change via `PORT` env var (backend) or Vite config (frontend).

## Tech Stack Quick Reference

**Backend**:
- Express.js (HTTP server)
- ws (WebSocket)
- PM2 Programmatic API
- jsonwebtoken (JWT auth)
- bcryptjs (password hashing)
- Zod (validation)
- TypeScript

**Frontend**:
- React 18
- Vite (build tool)
- TanStack Query (data fetching)
- Zustand (state management)
- Tailwind CSS (styling)
- Recharts (charts)
- Lucide Icons
- React Router
