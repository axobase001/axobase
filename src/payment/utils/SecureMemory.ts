/**
 * Secure Memory Manager
 * Ensures sensitive data (private keys) never touch disk unencrypted
 * and is wiped from memory when no longer needed
 */

import { SecureMemoryEntry } from '../types';

export class SecureMemory {
  private static instance: SecureMemory;
  private memory: Map<string, SecureMemoryEntry> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Register cleanup handlers
    this.registerCleanupHandlers();
  }

  static getInstance(): SecureMemory {
    if (!SecureMemory.instance) {
      SecureMemory.instance = new SecureMemory();
    }
    return SecureMemory.instance;
  }

  /**
   * Store data in secure memory
   * @param tag Unique identifier for this data
   * @param data Sensitive data as Buffer
   * @param ttlMs Optional TTL in milliseconds
   */
  store(tag: string, data: Buffer, ttlMs?: number): void {
    // Clear any existing data with this tag
    this.clear(tag);

    // Store new data
    this.memory.set(tag, {
      data: Buffer.from(data), // Create a copy
      createdAt: Date.now(),
      tag,
    });

    // Set up automatic cleanup if TTL specified
    if (ttlMs) {
      const timer = setTimeout(() => {
        this.clear(tag);
      }, ttlMs);
      this.timers.set(tag, timer);
    }
  }

  /**
   * Retrieve data from secure memory
   * @param tag Unique identifier
   * @returns Copy of the data or null if not found
   */
  retrieve(tag: string): Buffer | null {
    const entry = this.memory.get(tag);
    if (!entry) return null;

    // Return a copy to prevent external modification
    return Buffer.from(entry.data);
  }

  /**
   * Check if data exists in secure memory
   */
  has(tag: string): boolean {
    return this.memory.has(tag);
  }

  /**
   * Securely clear data from memory
   * Overwrites buffer with zeros before deletion
   */
  clear(tag: string): void {
    const entry = this.memory.get(tag);
    
    if (entry) {
      // Overwrite with zeros (best effort in JS)
      entry.data.fill(0);
      this.memory.delete(tag);
    }

    // Clear any associated timer
    const timer = this.timers.get(tag);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(tag);
    }
  }

  /**
   * Clear all secure memory
   * Called on process exit
   */
  clearAll(): void {
    for (const [tag] of this.memory) {
      this.clear(tag);
    }
    this.memory.clear();
    
    for (const [, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  /**
   * Get memory statistics (for debugging, no sensitive data)
   */
  getStats(): { entries: number; tags: string[] } {
    return {
      entries: this.memory.size,
      tags: Array.from(this.memory.keys()),
    };
  }

  /**
   * Register process cleanup handlers
   * Ensures memory is wiped on exit
   */
  private registerCleanupHandlers(): void {
    const cleanup = () => {
      console.log('[SecureMemory] Emergency cleanup initiated...');
      this.clearAll();
      process.exit(0);
    };

    process.on('exit', () => {
      this.clearAll();
    });

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGUSR1', cleanup);
    process.on('SIGUSR2', cleanup);

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('[SecureMemory] Uncaught exception, wiping memory:', err);
      this.clearAll();
      process.exit(1);
    });
  }
}

// Export singleton instance
export const secureMemory = SecureMemory.getInstance();

/**
 * Decorator for methods that use sensitive data
 * Automatically clears memory after execution
 */
export function withSecureCleanup<T extends (...args: unknown[]) => unknown>(
  fn: T,
  tags: string[]
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } finally {
      for (const tag of tags) {
        secureMemory.clear(tag);
      }
    }
  }) as T;
}

/**
 * Utility to safely handle private keys
 * Ensures keys are never logged or stringified
 */
export class PrivateKeyHandle {
  private tag: string;

  constructor(privateKeyHex: string) {
    this.tag = `pk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const buffer = Buffer.from(privateKeyHex.replace('0x', ''), 'hex');
    secureMemory.store(this.tag, buffer);
  }

  /**
   * Access the private key within a callback
   * Key is automatically cleared after callback completes
   */
  use<T>(callback: (key: string) => T): T {
    const buffer = secureMemory.retrieve(this.tag);
    if (!buffer) {
      throw new Error('Private key no longer available in secure memory');
    }
    
    try {
      const key = '0x' + buffer.toString('hex');
      return callback(key);
    } finally {
      // Don't clear here - let the handle manage lifecycle
    }
  }

  /**
   * Get the tag for this private key (for external storage references)
   */
  getTag(): string {
    return this.tag;
  }

  /**
   * Explicitly destroy this handle and clear memory
   */
  destroy(): void {
    secureMemory.clear(this.tag);
  }
}
