# DevMon-PM2: Server Registration Workflow

**Last Updated:** 2025-11-16
**Version:** 1.0.0
**Estimated Time:** 2-3 minutes (when following this guide)

---

## Quick Reference

```bash
# One-command registration (after cleanup)
curl -X POST http://localhost:3011/api/servers/manual \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"D:/Projects/YOUR_PROJECT","port":PORT,"startCommand":"npm run dev"}'
```

---

## Prerequisites Checklist

Before registering a server, ensure:

- [ ] DevMon-PM2 backend is running on port 3011
- [ ] DevMon-PM2 WebSocket server on port 3012
- [ ] Target port is NOT already in use
- [ ] Project path exists and contains valid package.json
- [ ] PM2 daemon is running (`pm2 ping`)

---

## Phase 1: Pre-Registration Cleanup (CRITICAL)

### Step 1.1: Check Target Port Availability

```bash
# Windows
netstat -ano | findstr ":YOUR_PORT.*LISTENING"

# Linux/Mac
lsof -i :YOUR_PORT
```

**If processes found on port:**

### Step 1.2: Kill Orphaned Processes (Windows)

```powershell
# PowerShell (Recommended)
powershell -Command "Get-NetTCPConnection -LocalPort YOUR_PORT -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

# Or using specific PIDs
powershell -Command "Stop-Process -Id PID1,PID2 -Force"
```

**Linux/Mac:**
```bash
# Kill all processes on port
lsof -ti :YOUR_PORT | xargs kill -9
```

### Step 1.3: Verify Port is Free

```bash
# Should return empty
netstat -ano | findstr ":YOUR_PORT.*LISTENING"
```

**Wait 2-3 seconds for OS to release port completely.**

---

## Phase 2: Server Registration

### Step 2.1: Register Server in DevMon-PM2

```bash
curl -X POST http://localhost:3011/api/servers/manual \
  -H "Content-Type: application/json" \
  -d '{
    "projectPath": "D:/Projects/YOUR_PROJECT",
    "port": YOUR_PORT,
    "startCommand": "npm run dev"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "port": YOUR_PORT,
    "status": "stopped",
    "pm2Id": null,
    "pm2Name": null,
    ...
  }
}
```

**Save the `id` for the next step!**

### Step 2.2: Start Server via PM2

```bash
# Use the ID from previous response
curl -X POST http://localhost:3011/api/servers/YOUR_SERVER_ID/register-pm2
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "status": "online",
    "pm2Id": 1,
    "pm2Name": "devmon-PROJECT-PORT",
    ...
  }
}
```

---

## Phase 3: Verification

### Step 3.1: Verify PM2 Status

```bash
pm2 list
```

**Expected Output:**
```
│ id │ name                  │ status    │ ↺    │ cpu │ mem    │
│ 1  │ devmon-PROJECT-PORT   │ online    │ 0    │ 0%  │ XX mb  │
```

**Key indicators:**
- Status should be `online`
- Restart count (↺) should be 0 or low
- Memory usage should increase (not stuck at 6.9mb)

### Step 3.2: Verify HTTP Response

```bash
# Check if server is responding
curl -s -I http://localhost:YOUR_PORT | head -10

# Or get full page
curl -s http://localhost:YOUR_PORT | head -50
```

### Step 3.3: Check PM2 Logs (if issues)

```bash
pm2 logs devmon-PROJECT-PORT --nostream --lines 50
```

---

## Common Issues & Solutions

### Issue 1: "spawn EINVAL" Error on Windows

**Symptom:** PM2 logs show `SyntaxError: Invalid or unexpected token` on npm.cmd

**Solution:** This has been fixed in PM2BridgeService.ts. The service now uses `cmd /c` wrapper on Windows. If still occurring, ensure backend was restarted after the fix.

### Issue 2: Process Shows "online" but Port Not Listening

**Symptom:** PM2 shows online but curl fails

**Solution:**
1. Check for orphaned processes: `netstat -ano | findstr ":PORT"`
2. Kill them: `powershell -Command "Stop-Process -Id PID -Force"`
3. Restart PM2 process: `pm2 restart devmon-PROJECT-PORT`

### Issue 3: Server Lost After Backend Restart

**Symptom:** Previously registered server disappears

**Cause:** Server state is stored in-memory only (not persisted)

**Solution:** Re-register the server using Phase 2 steps. Consider adding persistence layer to DevMon-PM2.

### Issue 4: High Restart Count (↺ > 10)

**Symptom:** PM2 shows many restarts

**Causes:**
- Port already in use (orphaned process)
- Missing dependencies (npm install not run)
- Environment variables not set
- Command syntax error

**Solution:**
```bash
# Check actual error
pm2 logs devmon-PROJECT-PORT --nostream --lines 50

# If port issue, cleanup first (Phase 1)
# If dependency issue, npm install in project dir first
```

### Issue 5: No Console Window Popup

**Expected Behavior:** No console windows should appear on Windows.

This is handled by `windowsHide: true` in PM2 start options. If windows appear, check PM2BridgeService.ts has this option set.

---

## One-Liner Scripts

### Complete Registration (Windows PowerShell)

```powershell
$port = 3001
$projectPath = "D:/Projects/YOUR_PROJECT"
$command = "npm run dev"

# Cleanup
Get-NetTCPConnection -LocalPort $port -EA 0 | % { Stop-Process -Id $_.OwningProcess -Force -EA 0 }
Start-Sleep -Seconds 2

# Register
$response = Invoke-RestMethod -Uri "http://localhost:3011/api/servers/manual" -Method Post -ContentType "application/json" -Body (@{
    projectPath = $projectPath
    port = $port
    startCommand = $command
} | ConvertTo-Json)

$serverId = $response.data.id
Write-Host "Server ID: $serverId"

# Start via PM2
Invoke-RestMethod -Uri "http://localhost:3011/api/servers/$serverId/register-pm2" -Method Post

# Verify
Start-Sleep -Seconds 5
pm2 list
Invoke-WebRequest -Uri "http://localhost:$port" -UseBasicParsing | Select-Object StatusCode
```

### Complete Registration (Bash)

```bash
PORT=3001
PROJECT="D:/Projects/YOUR_PROJECT"
COMMAND="npm run dev"

# Cleanup (Windows via bash)
powershell -Command "Get-NetTCPConnection -LocalPort $PORT -EA 0 | % { Stop-Process -Id \$_.OwningProcess -Force -EA 0 }"
sleep 2

# Register
SERVER_ID=$(curl -s -X POST http://localhost:3011/api/servers/manual \
  -H "Content-Type: application/json" \
  -d "{\"projectPath\":\"$PROJECT\",\"port\":$PORT,\"startCommand\":\"$COMMAND\"}" \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

echo "Server ID: $SERVER_ID"

# Start
curl -s -X POST "http://localhost:3011/api/servers/$SERVER_ID/register-pm2"

# Verify
sleep 5
pm2 list
curl -s -I "http://localhost:$PORT" | head -5
```

---

## Environment-Specific Notes

### Windows

- **Always use forward slashes** in paths: `D:/Projects/app` not `D:\Projects\app`
- PM2 uses `cmd /c` wrapper automatically (handled by backend)
- Use PowerShell for port cleanup (more reliable than cmd)
- Expect 6.9mb memory for cmd.exe wrapper (actual app memory is child process)

### Linux/Mac

- Direct command execution (no cmd wrapper needed)
- Use `lsof -i :PORT -t | xargs kill -9` for port cleanup
- PM2 captures logs directly

---

## Monitoring After Registration

### Real-time Log Monitoring

```bash
pm2 logs devmon-PROJECT-PORT --lines 100
```

### Check Metrics via DevMon API

```bash
curl -s http://localhost:3011/api/servers | jq '.data[] | {name: .pm2Name, status, cpu, memory, uptime}'
```

### WebSocket Events

Connect to `ws://localhost:3012` to receive:
- `metrics:update` - CPU/memory updates
- `server:status` - Status changes
- `health:result` - Health check results

---

## Performance Benchmarks

| Step | Expected Time |
|------|--------------|
| Port cleanup | 2-3 seconds |
| Server registration API | <1 second |
| PM2 start | 3-5 seconds |
| Health verification | 5-30 seconds |
| **Total** | **15-40 seconds** |

If taking longer, check for orphaned processes or network issues.

---

## Automation Recommendations

1. **Add persistence layer** - Store server configs in SQLite/JSON to survive backend restarts
2. **Pre-flight validation** - Auto-check port availability before registration
3. **Health polling** - Auto-verify server responds after PM2 start
4. **CLI tool** - Create `devmon add` command for quick registration
5. **Log capture** - Improve Windows cmd.exe stdout/stderr capture

---

## Troubleshooting Checklist

When registration fails:

1. [ ] Is DevMon-PM2 backend running? (`curl http://localhost:3011/api/health`)
2. [ ] Is PM2 daemon running? (`pm2 ping`)
3. [ ] Is target port free? (`netstat -ano | findstr ":PORT"`)
4. [ ] Does project path exist? (`ls PROJECT_PATH`)
5. [ ] Is start command valid? (try running manually)
6. [ ] Check PM2 logs for errors (`pm2 logs --lines 50`)
7. [ ] Check DevMon backend logs for errors

---

## Example: Register Next.js App on Port 3001

```bash
# 1. Cleanup
powershell -Command "Get-NetTCPConnection -LocalPort 3001 -EA 0 | % { Stop-Process -Id $_.OwningProcess -Force -EA 0 }"
sleep 2

# 2. Register
curl -X POST http://localhost:3011/api/servers/manual \
  -H "Content-Type: application/json" \
  -d '{"projectPath":"D:/Projects/my-nextjs-app","port":3001,"startCommand":"npm run dev"}'

# 3. Start (replace SERVER_ID)
curl -X POST http://localhost:3011/api/servers/SERVER_ID_HERE/register-pm2

# 4. Verify
pm2 list
curl -s http://localhost:3001 | head -20
```

---

## Future Improvements (TODO)

- [ ] Persist server registrations to database
- [ ] Add automatic orphan cleanup before PM2 start
- [ ] Create CLI tool: `devmon add <path> --port <port>`
- [ ] Add log capture for Windows cmd.exe child processes
- [ ] Implement health check polling after registration
- [ ] Add WebSocket notification for registration status

---

**Document maintained by:** DevMon-PM2 Team
**Source:** Lessons learned from kliis server registration (2025-11-16)
