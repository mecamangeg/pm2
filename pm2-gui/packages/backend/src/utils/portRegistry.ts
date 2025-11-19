import fs from 'fs/promises';
import path from 'path';

interface PortEntry {
  processName: string;
  port: number;
  assignedAt: Date;
  projectPath: string;
}

class PortRegistry {
  private registry: Map<string, PortEntry> = new Map();
  private registryFile: string;

  constructor() {
    this.registryFile = path.join(process.cwd(), 'data', 'port-registry.json');
    this.load();
  }

  /**
   * Load registry from disk
   */
  private async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.registryFile, 'utf-8');
      const entries: PortEntry[] = JSON.parse(data);
      this.registry = new Map(
        entries.map((entry) => [
          entry.processName,
          {
            ...entry,
            assignedAt: new Date(entry.assignedAt),
          },
        ])
      );
    } catch (error) {
      // File doesn't exist yet - that's fine
      this.registry = new Map();
    }
  }

  /**
   * Persist registry to disk
   */
  private async persist(): Promise<void> {
    try {
      const entries = Array.from(this.registry.values());
      await fs.mkdir(path.dirname(this.registryFile), { recursive: true });
      await fs.writeFile(this.registryFile, JSON.stringify(entries, null, 2));
    } catch (error) {
      console.error('Failed to persist port registry:', error);
    }
  }

  /**
   * Register a new port assignment
   */
  async register(processName: string, port: number, projectPath: string): Promise<void> {
    this.registry.set(processName, {
      processName,
      port,
      assignedAt: new Date(),
      projectPath,
    });
    await this.persist();
  }

  /**
   * Unregister a port (when process stops)
   */
  async unregister(processName: string): Promise<void> {
    this.registry.delete(processName);
    await this.persist();
  }

  /**
   * Get all ports currently used by PM2 processes
   */
  getUsedPorts(): number[] {
    return Array.from(this.registry.values()).map((entry) => entry.port);
  }

  /**
   * Get all registry entries
   */
  getAllEntries(): PortEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Check if a port is used by any PM2 process
   */
  isPortUsedByPM2(port: number): boolean {
    return this.getUsedPorts().includes(port);
  }

  /**
   * Get the process name using a specific port
   */
  getProcessUsingPort(port: number): string | null {
    for (const entry of this.registry.values()) {
      if (entry.port === port) {
        return entry.processName;
      }
    }
    return null;
  }

  /**
   * Get port entry for a specific process
   */
  getEntry(processName: string): PortEntry | undefined {
    return this.registry.get(processName);
  }

  /**
   * Clear all entries (for testing/cleanup)
   */
  async clear(): Promise<void> {
    this.registry.clear();
    await this.persist();
  }
}

// Singleton instance
export const portRegistry = new PortRegistry();
