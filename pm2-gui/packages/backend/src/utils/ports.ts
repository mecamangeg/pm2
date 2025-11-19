import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger';

const execAsync = promisify(exec);

export interface PortInfo {
  port: number;
  protocol: 'TCP' | 'UDP';
  state: string;
  pid: number;
  processName: string;
  isOrphaned: boolean;
  isPM2GUI: boolean;
  pm2ProcessName?: string;
}

export interface PortScanResult {
  guiPorts: PortInfo[];
  pm2Ports: PortInfo[];
  orphanedPorts: PortInfo[];
  allPorts: PortInfo[];
}

// PM2 GUI ports to highlight
const GUI_PORTS = [3001, 5173];

/**
 * Get all listening ports on Windows using netstat
 */
export async function getListeningPorts(): Promise<PortInfo[]> {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      return await getWindowsPorts();
    } else {
      return await getUnixPorts();
    }
  } catch (error) {
    logger.error('Failed to get listening ports', error);
    return [];
  }
}

/**
 * Windows port detection using netstat
 */
async function getWindowsPorts(): Promise<PortInfo[]> {
  const { stdout } = await execAsync('netstat -ano -p TCP');
  const lines = stdout.split('\n');
  const ports: PortInfo[] = [];
  const seenPorts = new Set<string>();

  for (const line of lines) {
    // Match lines like: TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING    12345
    const match = line.trim().match(/^(TCP|UDP)\s+(?:\S+):(\d+)\s+\S+\s+(\w+)\s+(\d+)/);

    if (match && match[3] === 'LISTENING') {
      const protocol = match[1] as 'TCP' | 'UDP';
      const port = parseInt(match[2], 10);
      const state = match[3];
      const pid = parseInt(match[4], 10);

      // Avoid duplicates (same port, protocol, pid)
      const key = `${protocol}:${port}:${pid}`;
      if (seenPorts.has(key)) continue;
      seenPorts.add(key);

      // Get process name
      const processName = await getProcessName(pid);

      ports.push({
        port,
        protocol,
        state,
        pid,
        processName,
        isOrphaned: false, // Will be determined later
        isPM2GUI: GUI_PORTS.includes(port),
      });
    }
  }

  return ports;
}

/**
 * Unix/Linux/Mac port detection using lsof or netstat
 */
async function getUnixPorts(): Promise<PortInfo[]> {
  try {
    // Try lsof first (more reliable)
    const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -n -P');
    const lines = stdout.split('\n').slice(1); // Skip header
    const ports: PortInfo[] = [];
    const seenPorts = new Set<string>();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) continue;

      const processName = parts[0];
      const pid = parseInt(parts[1], 10);
      const addressPort = parts[8];

      // Extract port from format like "*:3001" or "127.0.0.1:3001"
      const portMatch = addressPort.match(/:(\d+)$/);
      if (!portMatch) continue;

      const port = parseInt(portMatch[1], 10);
      const key = `TCP:${port}:${pid}`;

      if (seenPorts.has(key)) continue;
      seenPorts.add(key);

      ports.push({
        port,
        protocol: 'TCP',
        state: 'LISTENING',
        pid,
        processName,
        isOrphaned: false,
        isPM2GUI: GUI_PORTS.includes(port),
      });
    }

    return ports;
  } catch {
    // Fallback to netstat if lsof fails
    try {
      const { stdout } = await execAsync('netstat -an | grep LISTEN');
      const lines = stdout.split('\n');
      const ports: PortInfo[] = [];

      for (const line of lines) {
        const match = line.match(/tcp\s+\S+\s+\S+:(\d+)\s+/);
        if (match) {
          const port = parseInt(match[1], 10);
          ports.push({
            port,
            protocol: 'TCP',
            state: 'LISTENING',
            pid: 0,
            processName: 'Unknown',
            isOrphaned: false,
            isPM2GUI: GUI_PORTS.includes(port),
          });
        }
      }

      return ports;
    } catch {
      logger.warn('Failed to get Unix ports using both lsof and netstat');
      return [];
    }
  }
}

/**
 * Get process name from PID on Windows
 */
async function getProcessName(pid: number): Promise<string> {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      const { stdout } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
      const match = stdout.match(/"([^"]+)"/);
      return match ? match[1] : 'Unknown';
    } else {
      const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
      return stdout.trim() || 'Unknown';
    }
  } catch {
    return 'Unknown';
  }
}

/**
 * Scan and categorize all ports
 */
export async function scanPorts(pm2ProcessPorts: Map<number, string>): Promise<PortScanResult> {
  const allPorts = await getListeningPorts();

  const guiPorts: PortInfo[] = [];
  const pm2Ports: PortInfo[] = [];
  const orphanedPorts: PortInfo[] = [];

  for (const portInfo of allPorts) {
    // Check if it's a GUI port
    if (portInfo.isPM2GUI) {
      guiPorts.push(portInfo);
      continue;
    }

    // Check if it's a PM2 process port
    const pm2ProcessName = pm2ProcessPorts.get(portInfo.port);
    if (pm2ProcessName) {
      pm2Ports.push({
        ...portInfo,
        pm2ProcessName,
      });
      continue;
    }

    // Check if it's an orphaned port (not PM2, not GUI, and process name suggests it's orphaned)
    const isLikelyOrphaned =
      !portInfo.isPM2GUI &&
      !pm2ProcessName &&
      portInfo.processName !== 'Unknown' &&
      !isSystemProcess(portInfo.processName);

    if (isLikelyOrphaned) {
      orphanedPorts.push({
        ...portInfo,
        isOrphaned: true,
      });
    }
  }

  return {
    guiPorts,
    pm2Ports,
    orphanedPorts,
    allPorts,
  };
}

/**
 * Check if a process is a system process (should not be marked as orphaned)
 */
function isSystemProcess(processName: string): boolean {
  const systemProcesses = [
    'System',
    'svchost.exe',
    'services.exe',
    'lsass.exe',
    'wininit.exe',
    'csrss.exe',
    'smss.exe',
    'explorer.exe',
    'systemd',
    'init',
    'kernel_task',
    'launchd',
  ];

  return systemProcesses.some(sys =>
    processName.toLowerCase().includes(sys.toLowerCase())
  );
}

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  const allPorts = await getListeningPorts();
  return !allPorts.some(p => p.port === port);
}

/**
 * Suggest available ports near a given port
 */
export async function suggestAvailablePorts(preferredPort: number, count: number = 3): Promise<number[]> {
  const allPorts = await getListeningPorts();
  const usedPorts = new Set(allPorts.map(p => p.port));
  const suggestions: number[] = [];

  // Try ports incrementing from preferred
  for (let i = 0; suggestions.length < count && i < 100; i++) {
    const candidate = preferredPort + i;
    if (!usedPorts.has(candidate) && candidate <= 65535) {
      suggestions.push(candidate);
    }
  }

  return suggestions;
}

/**
 * Kill a process by PID (requires admin on Windows)
 */
export async function killProcessByPID(pid: number): Promise<boolean> {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      await execAsync(`taskkill /F /PID ${pid}`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }

    logger.info(`Killed process PID ${pid}`);
    return true;
  } catch (error) {
    logger.error(`Failed to kill process PID ${pid}`, error);
    return false;
  }
}
