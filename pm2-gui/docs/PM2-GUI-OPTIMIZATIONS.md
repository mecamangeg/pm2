# PM2 GUI Optimization Implementations

**Date:** 2025-11-16
**Purpose:** Prevent console popups, improve server registration workflow

---

## 1. JSON Persistence for Server Registrations

**File: `config/servers.json`**
```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-11-16T10:00:00Z",
  "servers": [{
    "id": "pm2-gui-backend-001",
    "name": "PM2 GUI Backend",
    "script": "./packages/backend/dist/index.js",
    "cwd": "D:/Projects/pm2/pm2-gui",
    "port": 3001,
    "env": { "AUTH_ENABLED": "false", "NODE_ENV": "production" },
    "autoStart": true,
    "healthCheck": "http://localhost:3001/api/health"
  }]
}
```

**Persistence Script:**
```typescript
// scripts/persistence.ts
export function loadServers() {
  if (!fs.existsSync(SERVERS_FILE)) return { servers: [] };
  return JSON.parse(fs.readFileSync(SERVERS_FILE, 'utf-8'));
}

export function saveServer(config) {
  const data = loadServers();
  const idx = data.servers.findIndex(s => s.id === config.id);
  if (idx >= 0) data.servers[idx] = config;
  else data.servers.push(config);
  fs.writeFileSync(SERVERS_FILE, JSON.stringify(data, null, 2));
}
```

---

## 2. Add-Server Script with Pre-flight Checks

**File: `scripts/add-server.ts`**

Pre-flight checks before PM2 registration:
1. ✅ PM2 daemon running? → `pm2 ping`
2. ✅ Script file exists? → `fs.existsSync()`
3. ✅ Port available? → `net.createServer().listen()`
4. ✅ No conflicts? → `pm2 delete existing` first
5. ✅ Register with PM2 → `pm2 start ...`
6. ✅ Health check passes → HTTP GET health endpoint

```bash
# Usage
ts-node scripts/add-server.ts "pm2-gui-backend" "./packages/backend/dist/index.js" 3001 "D:/Projects/pm2/pm2-gui"
```

**Key implementation:**
```typescript
async function addServer(opts) {
  // 1. Check PM2
  if (!isPM2Running()) execSync('pm2 ping');

  // 2. Check script exists
  if (!fs.existsSync(opts.script)) throw new Error('Script not found');

  // 3. Free port if needed
  if (!(await isPortFree(opts.port))) await killProcessOnPort(opts.port);

  // 4. Remove existing registration
  execSync(`pm2 delete "${opts.name}"`, { stdio: 'ignore' });

  // 5. Register
  execSync(`pm2 start "${opts.script}" --name "${opts.name}" --cwd "${opts.cwd}"`);

  // 6. Health check
  return await pollHealth(`http://localhost:${opts.port}/api/health`);
}
```

---

## 3. Windows Log Capture Fix

**Problem:** Windows `cmd.exe` wrapper doesn't forward stdout/stderr properly.

**Solution: ecosystem.config.js**
```javascript
module.exports = {
  apps: [{
    name: 'pm2-gui-backend',
    script: './packages/backend/dist/index.js',
    cwd: 'D:/Projects/pm2/pm2-gui',

    // Explicit log paths (fixes Windows capture)
    output: './logs/pm2-gui-out.log',
    error: './logs/pm2-gui-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // KEY: Prevent console popups
    windowsHide: true,
    interpreter: 'node',

    env: {
      PORT: 3001,
      HOST: '0.0.0.0',
      AUTH_ENABLED: 'false',
      FORCE_COLOR: '0',  // Clean logs
      NO_COLOR: '1'
    }
  }]
};
```

**Usage:**
```bash
pm2 start ecosystem.config.js
```

---

## 4. Automatic Port Cleanup Before PM2 Start

**File: `scripts/cleanup-ports.ts`**
```typescript
const PORTS = [3001, 5173, 5174, 5175];

function cleanPort(port: number) {
  try {
    const result = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, { encoding: 'utf-8' });
    const pids = result.split('\n')
      .map(l => l.match(/LISTENING\s+(\d+)/)?.[1])
      .filter(Boolean);

    for (const pid of [...new Set(pids)]) {
      execSync(`taskkill //F //PID ${pid}`, { stdio: 'ignore' });
      console.log(`Killed PID ${pid} on port ${port}`);
    }
  } catch {
    console.log(`Port ${port} is free`);
  }
}

PORTS.forEach(cleanPort);
```

**Integrate in package.json:**
```json
{
  "scripts": {
    "predev": "ts-node scripts/cleanup-ports.ts",
    "dev": "pnpm -r --parallel dev"
  }
}
```

---

## 5. Health Check Polling After Registration

**File: `scripts/health-check.ts`**
```typescript
async function check(url: string, timeout = 5000): Promise<boolean> {
  return new Promise(resolve => {
    const req = http.get(url, { timeout }, res => resolve(res.statusCode === 200));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

export async function pollHealth(url: string, retries = 10, interval = 2000): Promise<boolean> {
  for (let i = 1; i <= retries; i++) {
    console.log(`Health check ${i}/${retries}...`);
    if (await check(url)) {
      console.log('✓ Server healthy!');
      return true;
    }
    if (i < retries) await new Promise(r => setTimeout(r, interval));
  }
  console.error('✗ Server failed health check');
  return false;
}
```

**Usage:**
```bash
ts-node scripts/health-check.ts http://localhost:3001/api/health
```

---

## 6. Quick CLI Workflow for Manual Additions

### One-Liner Commands

```bash
# Full registration workflow
pm2 kill && \
  ts-node scripts/cleanup-ports.ts && \
  pm2 start ecosystem.config.js && \
  sleep 5 && \
  ts-node scripts/health-check.ts && \
  pm2 save

# Quick status check
pm2 status && curl -s http://localhost:3001/api/health | jq

# Register new server with all checks
ts-node scripts/add-server.ts "my-app" "./dist/index.js" 3000 "/path/to/app"

# Clean restart
pm2 restart pm2-gui-backend && pm2 logs --lines 20
```

### Complete Registration Script

```bash
#!/bin/bash
# scripts/register-backend.sh

set -e
echo "=== PM2 GUI Backend Registration ==="

# 1. Cleanup ports
echo "1. Cleaning ports..."
npx ts-node scripts/cleanup-ports.ts

# 2. Register with pre-flight checks
echo "2. Registering..."
npx ts-node scripts/add-server.ts \
  "pm2-gui-backend" \
  "./packages/backend/dist/index.js" \
  3001 \
  "$(pwd)"

# 3. Save state
echo "3. Saving state..."
pm2 save

# 4. Verify
echo "4. Final status:"
pm2 status
curl -s http://localhost:3001/api/health | jq

echo "=== Complete ==="
```

---

## Console Popup Prevention Summary

**Key settings to prevent Windows console windows:**

```javascript
// ecosystem.config.js
{
  windowsHide: true,       // CRITICAL: No console popup
  interpreter: 'node',     // Direct node, not cmd.exe
  detached: false,         // Keep PM2 control
  treekill: true          // Kill entire process tree
}
```

**Why this works:**
1. `windowsHide: true` sets `CREATE_NO_WINDOW` flag
2. Explicit `interpreter: 'node'` avoids cmd.exe wrapper
3. PM2 manages process lifecycle silently

---

## Integration Summary

1. **On server restart:** No console popups due to `windowsHide: true`
2. **On registration:** Pre-flight checks ensure clean start
3. **On failure:** Health check polling detects issues early
4. **On persistence:** JSON file survives backend restarts
5. **On port conflicts:** Auto-cleanup frees stuck ports
6. **On logs:** Explicit paths fix Windows capture issues

**Result:** Reliable, headless server management without visible terminals.
