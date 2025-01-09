import { debug } from "../utils/debug";
import { cleanup } from "../utils/cleanup";

/**
 * Buffer pool configuration
 */
type BufferPoolConfig = {
  initialSize: number;
  maxSize: number;
  growthFactor: number;
  shrinkThreshold: number;
};

/**
 * Buffer usage tracking
 */
type BufferUsage = {
  buffer: Uint8Array;
  lastUsed: number;
  useCount: number;
  isActive: boolean;
};

/**
 * Buffer pool state
 */
type BufferPoolState = {
  config: BufferPoolConfig;
  availableBuffers: Map<number, BufferUsage[]>;
  activeBuffers: Map<Uint8Array, BufferUsage>;
  totalAllocated: number;
  lastCleanup: number;
};

// Initialize buffer pool state
const state: BufferPoolState = {
  config: {
    initialSize: 1024,
    maxSize: 1024 * 1024 * 10, // 10MB
    growthFactor: 1.5,
    shrinkThreshold: 0.3
  },
  availableBuffers: new Map(),
  activeBuffers: new Map(),
  totalAllocated: 0,
  lastCleanup: performance.now()
};

/**
 * Gets or creates a buffer of the specified size
 */
export function acquireBuffer(size: number): Uint8Array {
  const available = state.availableBuffers.get(size);
  if (available?.length) {
    const usage = available.pop()!;
    usage.isActive = true;
    usage.useCount++;
    state.activeBuffers.set(usage.buffer, usage);
    return usage.buffer;
  }

  if (state.totalAllocated + size > state.config.maxSize) {
    cleanupBuffers();
  }

  const buffer = new Uint8Array(size);
  const usage = {
    buffer,
    lastUsed: performance.now(),
    useCount: 1,
    isActive: true
  };
  
  state.activeBuffers.set(buffer, usage);
  state.totalAllocated += size;
  
  return buffer;
}

/**
 * Releases a buffer back to the pool
 */
export function releaseBuffer(buffer: Uint8Array): void {
  const usage = state.activeBuffers.get(buffer);
  if (!usage) {
    debug.warn(`Attempted to release untracked buffer`);
    return;
  }
  
  usage.isActive = false;
  usage.lastUsed = performance.now();
  
  state.activeBuffers.delete(buffer);
  
  let available = state.availableBuffers.get(buffer.length);
  if (!available) {
    available = [];
    state.availableBuffers.set(buffer.length, available);
  }
  
  available.push(usage);
  
  // Run cleanup if threshold reached
  if (shouldCleanup()) {
    cleanupBuffers();
  }
}

/**
 * Checks if cleanup should be performed
 */
function shouldCleanup(): boolean {
  const now = performance.now();
  const timeSinceCleanup = now - state.lastCleanup;
  
  // Cleanup every 60 seconds or if memory usage is high
  return timeSinceCleanup > 60000 || 
    state.totalAllocated > state.config.maxSize * state.config.shrinkThreshold;
}

/**
 * Cleans up unused buffers
 */
function cleanupBuffers(): void {
  const now = performance.now();
  const IDLE_TIMEOUT = 30000; // 30 seconds
  
  let freedBytes = 0;
  
  // Clean up each size bucket
  for (const [size, buffers] of state.availableBuffers) {
    const stillUseful = buffers.filter(usage => {
      const isRecent = now - usage.lastUsed < IDLE_TIMEOUT;
      const isFrequentlyUsed = usage.useCount > 5;
      
      if (!isRecent && !isFrequentlyUsed) {
        freedBytes += usage.buffer.length;
        state.totalAllocated -= usage.buffer.length;
        cleanup.releaseBuffer(usage.buffer);
        return false;
      }
      
      return true;
    });
    
    if (stillUseful.length === 0) {
      state.availableBuffers.delete(size);
    } else {
      state.availableBuffers.set(size, stillUseful);
    }
  }
  
  state.lastCleanup = now;
  
  if (freedBytes > 0) {
    debug.info(`Buffer cleanup: freed ${freedBytes} bytes`);
  }
}

/**
 * Configures the buffer pool
 */
export function configure(config: Partial<BufferPoolConfig>): void {
  Object.assign(state.config, config);
}

/**
 * Gets current buffer pool stats
 */
export function getStats(): Readonly<{
  totalAllocated: number;
  activeBuffers: number;
  availableBuffers: number;
  config: BufferPoolConfig;
}> {
  return {
    totalAllocated: state.totalAllocated,
    activeBuffers: state.activeBuffers.size,
    availableBuffers: Array.from(state.availableBuffers.values())
      .reduce((sum, arr) => sum + arr.length, 0),
    config: { ...state.config }
  };
}

/**
 * Performs a full cleanup of the buffer pool
 */
export function cleanupAll(): void {
  // Release all buffers
  for (const [buffer] of state.activeBuffers) {
    cleanup.releaseBuffer(buffer);
  }
  
  state.activeBuffers.clear();
  state.availableBuffers.clear();
  state.totalAllocated = 0;
  state.lastCleanup = performance.now();
  
  debug.info('Buffer pool cleaned up');
}

// Export buffer management system
export const buffers = {
  acquire: acquireBuffer,
  release: releaseBuffer,
  configure,
  getStats,
  cleanupAll
}; 