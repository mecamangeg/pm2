# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Overview

PM2 is a production process manager for Node.js/Bun applications with a built-in load balancer. It uses a client-daemon architecture with RPC communication to manage processes persistently across system restarts.

**Key Facts:**
- Supports Node.js 16+ and Bun v1+
- Works on Linux, macOS, and Windows
- License: AGPL-3.0
- Primary language: JavaScript (no build step required)

---

## Development Setup

### Installation

```bash
git clone https://github.com/Unitech/pm2.git
cd pm2
npm install
```

### Using Development Version

Create an alias to use the local development version:

```bash
# Linux/macOS
echo "alias pm2='`pwd`/bin/pm2'" >> ~/.bashrc

# Windows (PowerShell)
# Add to profile or use: D:\Projects\pm2\bin\pm2
```

After changes to the daemon, reload PM2:

```bash
pm2 update
```

---

## Testing

### Run All Tests

```bash
npm test
# Runs both unit and e2e tests
```

### Unit Tests (Programmatic)

```bash
npm run test:unit
# Or: bash test/unit.sh
```

Unit tests are located in `test/programmatic/` and test the PM2 API directly using Mocha. Tests run with retry logic (automatic retry on first failure).

**Run Single Unit Test:**

```bash
npx mocha test/programmatic/<test-name>.mocha.js
```

### E2E Tests (Behavioral)

```bash
npm run test:e2e
# Or: bash test/e2e.sh
```

E2E tests are bash scripts in `test/e2e/` that test PM2's CLI behavior end-to-end.

**Run Single E2E Test:**

```bash
bash test/e2e/cli/<test-name>.sh
```

**Important:** E2E tests use helper functions from `test/e2e/include.sh`. Tests automatically clean up processes with `pm2 kill` between runs.

---

## Architecture

PM2 uses a persistent **daemon process** that manages application processes, with a **client** that communicates via RPC/pub-sub sockets.

### Core Components

**God (`lib/God.js`)**
- Central process orchestrator (the "daemon brain")
- Manages the process table (`clusters_db`)
- Delegates to ForkMode or ClusterMode for process execution
- Populated by modules: `God/Methods.js`, `God/ForkMode.js`, `God/ClusterMode.js`, `God/Reload.js`, `God/ActionMethods.js`

**Daemon (`lib/Daemon.js`)**
- Persistent background process
- Sets up RPC server (commands) and PUB socket (events)
- Initializes God on startup
- Handles graceful shutdown and error recovery

**Client (`lib/Client.js`)**
- CLI/API interface to the daemon
- Checks if daemon is alive, launches if needed
- Establishes RPC connection for commands
- Subscribes to PUB socket for process events

**API (`lib/API.js`)**
- High-level programmatic interface
- Main entry point when using PM2 as a module
- Wraps Client and provides methods for process management
- Extended by modules in `lib/API/*` (Deploy, Startup, Log, Modules, etc.)

### Process Execution Modes

**Fork Mode (`lib/God/ForkMode.js`)**
- Single process execution using `child_process.spawn`
- Used for non-Node.js apps or when clustering is disabled
- Supports custom interpreters (Python, Ruby, binaries)

**Cluster Mode (`lib/God/ClusterMode.js`)**
- Node.js cluster module for load balancing
- Spawns multiple workers that share ports
- Automatic load distribution across CPU cores
- Zero-downtime reload capability

**Process Containers:**
- `lib/ProcessContainer.js` - Cluster mode wrapper
- `lib/ProcessContainerFork.js` - Fork mode wrapper
- `lib/ProcessContainerBun.js` - Bun-specific cluster wrapper
- `lib/ProcessContainerForkBun.js` - Bun-specific fork wrapper

### Communication Flow

```
CLI/API → Client → [RPC Socket] → Daemon → God → Process (Fork/Cluster)
                                                    ↓
Process Events → God → [PUB Socket] → Client → User
```

- **RPC Socket** (`~/.pm2/rpc.sock`): Commands (start, stop, restart, etc.)
- **PUB Socket** (`~/.pm2/pub.sock`): Events (process exit, restart, logs, etc.)

### Configuration Files

PM2 uses `ecosystem.config.js` for application configuration:

```javascript
module.exports = {
  apps: [{
    name: 'app-name',
    script: './app.js',
    instances: 'max',      // or number, or -1 for (CPUs - 1)
    exec_mode: 'cluster',  // or 'fork'
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

Default filename: `ecosystem.config.js` (see `constants.js:34`)

---

## Key Directories

- **`bin/`** - Executables: `pm2`, `pm2-dev`, `pm2-runtime`, `pm2-docker`
- **`lib/`** - Source code
  - `lib/API/` - API modules (Deploy, Startup, Modules, UX, etc.)
  - `lib/God/` - Process orchestration logic
  - `lib/binaries/` - CLI entry points
  - `lib/tools/` - Utilities (Config, open, sexec, etc.)
- **`test/`** - Tests
  - `test/programmatic/` - Unit tests (Mocha)
  - `test/e2e/` - End-to-end bash scripts
  - `test/fixtures/` - Test applications
- **`types/`** - TypeScript definitions
- **`constants.js`** - Global constants and paths configuration
- **`paths.js`** - PM2 home directory structure

### PM2 Home Directory (`~/.pm2/`)

- `logs/` - Application logs
- `pids/` - Process PID files
- `pm2.log` - PM2 daemon log
- `pm2.pid` - PM2 daemon PID
- `rpc.sock` - RPC socket for commands
- `pub.sock` - Pub socket for events
- `dump.pm2` - Process list snapshot (for resurrection)

---

## Common Workflows

### Modifying Daemon Code

If you change files in `lib/Daemon.js`, `lib/God.js`, `lib/God/*`, or `lib/Watcher.js`:

```bash
pm2 update
```

This restarts the PM2 daemon with your changes.

### Adding a New API Method

1. Add method to `lib/API.js` or appropriate module in `lib/API/*`
2. If daemon-side logic needed, add to `lib/God/Methods.js` or `lib/God/ActionMethods.js`
3. Update RPC interface if adding new daemon commands
4. Add unit test in `test/programmatic/`
5. Add E2E test in `test/e2e/` if it's a CLI feature

### Adding Support for New Languages/Interpreters

1. Update `lib/God/ForkMode.js` to handle the new interpreter
2. Add configuration parsing in `lib/Common.js` if needed
3. Add test fixture in `test/fixtures/extra-lang/`
4. Add E2E test in `test/e2e/cli/extra-lang.sh`

---

## Platform-Specific Notes

### Windows

- Platform detection: `constants.js:49` checks for `win32`, `win64`, `msys`, `cygwin`
- Windows-specific binaries: `bin/pm2.ps1`, `bin/pm2-windows`
- Path handling: Windows uses `\` but PM2 normalizes paths internally
- Daemon resurrection path: Uses `__dirname + '/../bin/pm2'` instead of `process.env['_']`

### Bun Runtime

- Detected via `typeof Bun !== 'undefined'` in `constants.js:48`
- Uses dedicated process containers: `ProcessContainerBun.js`, `ProcessContainerForkBun.js`
- Cluster setup: `lib/God.js:33-37` sets different exec path for Bun
- Some tests skipped when running under Bun (see `test/e2e.sh:59-69`)

---

## Important Constants

From `constants.js`:

- `APP_CONF_DEFAULT_FILE: 'ecosystem.config.js'` - Default config filename
- `CLUSTER_MODE_ID: 'cluster_mode'` - Cluster execution mode
- `FORK_MODE_ID: 'fork_mode'` - Fork execution mode
- `EXP_BACKOFF_RESET_TIMER: 30000` - Exponential backoff reset (ms)
- `KILL_TIMEOUT: 1600` - Default SIGTERM timeout (ms)
- `CONCURRENT_ACTIONS: 1` - Max concurrent process actions

Environment variables:
- `PM2_HOME` - Override default PM2 directory
- `PM2_MACHINE_NAME` - Custom instance name
- `PM2_SECRET_KEY`, `PM2_PUBLIC_KEY` - PM2 Plus authentication

---

## Debugging

Enable debug output:

```bash
DEBUG=pm2:* pm2 start app.js
```

Debug namespaces:
- `pm2:cli` - CLI operations
- `pm2:god` - God process management
- `pm2:client` - Client-daemon communication
- `pm2:daemon` - Daemon lifecycle
- `pm2:fork_mode` - Fork mode execution
- `pm2:cluster` - Cluster mode execution

---

## Commit Conventions

Follow these commit prefixes:
- `fix:` - Bug fix
- `feat:` - New or updated feature
- `docs:` - Documentation updates
- `BREAKING:` - Breaking change
- `refactor:` - Code refactoring (no functional change)
- `test:` - Test updates
- `chore:` - Build/tooling updates

Commit messages should be lowercase (except proper nouns/acronyms) and ~50 characters for the summary.
