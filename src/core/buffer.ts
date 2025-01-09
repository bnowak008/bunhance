import type { RGB } from '../types';

// Error types for better error handling
class BufferError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BufferError';
  }
}

class BufferValidationError extends BufferError {
  constructor(message: string) {
    super(`Buffer validation failed: ${message}`);
    this.name = 'BufferValidationError';
  }
}

// Basic types with strict validation
type Cell = {
  readonly char: string;
  readonly fg?: Readonly<RGB>;
  readonly bg?: Readonly<RGB>;
};

type BufferType = 'raw' | 'cell';

type BufferMetadata = {
  readonly isPooled: boolean;
  readonly poolIndex?: number;
  lastUsed: number;
  readonly createdAt: number;
};

type RawBuffer = {
  readonly type: 'raw';
  readonly width: number;
  readonly height: number;
  data: Uint8Array;
  metadata: BufferMetadata;
};

type CellBuffer = {
  readonly type: 'cell';
  readonly width: number;
  readonly height: number;
  data: Cell[][];
  metadata: BufferMetadata;
};

type UnifiedBuffer = RawBuffer | CellBuffer;

// Pool types with proper readonly fields
type RawPoolItem = {
  readonly buffer: Uint8Array;
  readonly size: number;
  lastUsed: number;
};

type CellPoolItem = {
  readonly buffer: Cell[][];
  readonly size: number;
  lastUsed: number;
};

// Add size class management
type SizeClass = {
  readonly size: number;
  buffers: (RawPoolItem | CellPoolItem)[];
};

type BufferPool = {
  raw: {
    sizeClasses: SizeClass[];
    overflow: RawPoolItem[];
  };
  cell: {
    sizeClasses: SizeClass[];
    overflow: CellPoolItem[];
  };
};

type BufferManagerConfig = {
  readonly poolSize: number;
  readonly maxBufferSize: number;
  readonly cleanupInterval: number;
  readonly initialBufferSize: number;
  readonly poolStrategy: 'fifo' | 'lru';
  readonly maxPoolSize: number;
  readonly growthFactor: number;
};

// Define BufferManager type with cleanup interval
type BufferManager = {
  pool: BufferPool;
  active: Map<string, UnifiedBuffer>;
  config: BufferManagerConfig;
  resizePool(type: BufferType, newSize: number): void;
  cleanup(): void;
  getOptimalBufferSize(requested: number): number;
  dispose(): void;
};

const DEFAULT_CONFIG: BufferManagerConfig = {
  poolSize: 10,
  maxBufferSize: 1024 * 1024,
  cleanupInterval: 60000,
  initialBufferSize: 1024,
  poolStrategy: 'lru',
  maxPoolSize: 20,
  growthFactor: 1.5
} as const;

// Enhanced validation functions
function validateBufferDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new BufferValidationError('Buffer dimensions must be integers');
  }
  if (width <= 0 || height <= 0) {
    throw new BufferValidationError('Buffer dimensions must be positive');
  }
  if (width > Number.MAX_SAFE_INTEGER || height > Number.MAX_SAFE_INTEGER) {
    throw new BufferValidationError('Buffer dimensions exceed maximum safe integer');
  }
}

function validateBufferAccess(buffer: UnifiedBuffer, x: number, y: number): void {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new BufferValidationError('Buffer access coordinates must be integers');
  }
  if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) {
    throw new BufferValidationError('Buffer access out of bounds');
  }
}

// Type guards with complete type checking
function isUnifiedBuffer(value: unknown): value is UnifiedBuffer {
  if (!value || typeof value !== 'object') return false;
  
  const buffer = value as Partial<UnifiedBuffer>;
  return (
    ('type' in buffer) &&
    ('width' in buffer) &&
    ('height' in buffer) &&
    ('data' in buffer) &&
    ('metadata' in buffer) &&
    (buffer.type === 'raw' || buffer.type === 'cell') &&
    typeof buffer.width === 'number' &&
    typeof buffer.height === 'number' &&
    (
      (buffer.type === 'raw' && buffer.data instanceof Uint8Array) ||
      (buffer.type === 'cell' && Array.isArray(buffer.data))
    )
  );
}

function isRawBuffer(buffer: UnifiedBuffer): buffer is RawBuffer {
  return buffer.type === 'raw' && buffer.data instanceof Uint8Array;
}

function isCellBuffer(buffer: UnifiedBuffer): buffer is CellBuffer {
  return buffer.type === 'cell' && Array.isArray(buffer.data);
}

// Type guard for pool items
function isRawPoolItem(item: RawPoolItem | CellPoolItem): item is RawPoolItem {
  return 'buffer' in item && item.buffer instanceof Uint8Array;
}

function isCellPoolItem(item: RawPoolItem | CellPoolItem): item is CellPoolItem {
  return 'buffer' in item && Array.isArray(item.buffer);
}

// Enhanced buffer cleanup
function disposeBuffer(buffer: UnifiedBuffer): void {
  if (isRawBuffer(buffer)) {
    buffer.data.fill(0);
  } else {
    buffer.data.forEach(row => row.fill({ char: ' ' }));
  }
  buffer.metadata.lastUsed = 0;
}

// Enhanced buffer manager
function createBufferManager(config: Partial<BufferManagerConfig> = {}): BufferManager {
  const finalConfig = { ...DEFAULT_CONFIG, ...config } as const;
  let cleanupIntervalId: ReturnType<typeof setInterval> | undefined;
  
  // Initialize size classes - powers of 2 up to maxBufferSize
  const createSizeClasses = () => {
    const classes: SizeClass[] = [];
    let size = finalConfig.initialBufferSize;
    while (size <= finalConfig.maxBufferSize) {
      classes.push({ size, buffers: [] });
      size *= 2;
    }
    return classes;
  };
  
  const pool: BufferPool = {
    raw: {
      sizeClasses: createSizeClasses(),
      overflow: []
    },
    cell: {
      sizeClasses: createSizeClasses(),
      overflow: []
    }
  };

  // Helper to find the appropriate size class
  const findSizeClass = (classes: SizeClass[], required: number): SizeClass | undefined => {
    return classes.find(c => c.size >= required);
  };

  // Helper to manage buffer eviction
  const evictBuffer = (
    sizeClasses: SizeClass[],
    overflow: (RawPoolItem | CellPoolItem)[],
    required: number
  ): void => {
    const now = Date.now();
    let oldestTime = now;
    let oldestBuffer: RawPoolItem | CellPoolItem | undefined;
    let oldestClass: SizeClass | undefined;

    // Check size classes
    for (const sizeClass of sizeClasses) {
      for (const buffer of sizeClass.buffers) {
        if (buffer.lastUsed < oldestTime) {
          oldestTime = buffer.lastUsed;
          oldestBuffer = buffer;
          oldestClass = sizeClass;
        }
      }
    }

    // Check overflow
    for (const buffer of overflow) {
      if (buffer.lastUsed < oldestTime) {
        oldestTime = buffer.lastUsed;
        oldestBuffer = buffer;
        oldestClass = undefined;
      }
    }

    if (oldestBuffer) {
      if (oldestClass) {
        oldestClass.buffers = oldestClass.buffers.filter(b => b !== oldestBuffer);
      } else {
        overflow = overflow.filter(b => b !== oldestBuffer);
      }
    }
  };

  const manager: BufferManager = {
    pool,
    active: new Map(),
    config: finalConfig,
    
    resizePool(type: BufferType, newSize: number) {
      if (newSize > this.config.maxPoolSize) {
        throw new BufferValidationError(`Pool size cannot exceed ${this.config.maxPoolSize}`);
      }
      
      const targetPool = type === 'raw' ? this.pool.raw : this.pool.cell;
      const totalBuffers = targetPool.sizeClasses.reduce(
        (sum, sc) => sum + sc.buffers.length,
        0
      ) + targetPool.overflow.length;

      while (totalBuffers > newSize) {
        evictBuffer(
          targetPool.sizeClasses,
          targetPool.overflow,
          this.config.initialBufferSize
        );
      }
    },

    cleanup() {
      const now = Date.now();
      const isExpired = (lastUsed: number) => now - lastUsed >= this.config.cleanupInterval;
      
      // Cleanup function for a pool
      const cleanupPool = (
        sizeClasses: SizeClass[],
        overflow: (RawPoolItem | CellPoolItem)[]
      ) => {
        // Cleanup size classes
        for (const sizeClass of sizeClasses) {
          sizeClass.buffers = sizeClass.buffers.filter(item => {
            if (isExpired(item.lastUsed)) {
              if (isRawPoolItem(item)) {
                item.buffer.fill(0);
              } else if (isCellPoolItem(item)) {
                item.buffer.forEach(row => row.fill({ char: ' ' }));
              }
              return false;
            }
            return true;
          });
        }

        // Cleanup overflow
        overflow = overflow.filter(item => {
          if (isExpired(item.lastUsed)) {
            if (isRawPoolItem(item)) {
              item.buffer.fill(0);
            } else if (isCellPoolItem(item)) {
              item.buffer.forEach(row => row.fill({ char: ' ' }));
            }
            return false;
          }
          return true;
        });
      };

      // Clean both pools
      cleanupPool(this.pool.raw.sizeClasses, this.pool.raw.overflow);
      cleanupPool(this.pool.cell.sizeClasses, this.pool.cell.overflow);

      // Cleanup active buffers
      for (const [key, buffer] of this.active.entries()) {
        if (isExpired(buffer.metadata.lastUsed)) {
          disposeBuffer(buffer);
          this.active.delete(key);
        }
      }
    },

    getOptimalBufferSize(requested: number): number {
      // Find the smallest size class that can accommodate the request
      const sizeClass = findSizeClass(
        this.pool.raw.sizeClasses,
        requested
      );
      return sizeClass ? sizeClass.size : this.config.maxBufferSize;
    },

    dispose() {
      if (cleanupIntervalId !== undefined) {
        clearInterval(cleanupIntervalId);
        cleanupIntervalId = undefined;
      }
      
      // Clean up all buffers
      const cleanupPool = (
        sizeClasses: SizeClass[],
        overflow: (RawPoolItem | CellPoolItem)[]
      ) => {
        for (const sizeClass of sizeClasses) {
          sizeClass.buffers.forEach(item => {
            if (isRawPoolItem(item)) {
              item.buffer.fill(0);
            } else if (isCellPoolItem(item)) {
              item.buffer.forEach(row => row.fill({ char: ' ' }));
            }
          });
          sizeClass.buffers = [];
        }
        
        overflow.forEach(item => {
          if (isRawPoolItem(item)) {
            item.buffer.fill(0);
          } else if (isCellPoolItem(item)) {
            item.buffer.forEach(row => row.fill({ char: ' ' }));
          }
        });
        overflow = [];
      };

      cleanupPool(this.pool.raw.sizeClasses, this.pool.raw.overflow);
      cleanupPool(this.pool.cell.sizeClasses, this.pool.cell.overflow);
      this.active.clear();
    }
  };

  // Start cleanup interval
  cleanupIntervalId = setInterval(() => {
    manager.cleanup();
  }, finalConfig.cleanupInterval);

  // Ensure cleanup interval is cleared when process exits
  if (typeof process !== 'undefined') {
    process.on('exit', () => {
      manager.dispose();
    });
  }

  return manager;
}

// Create raw buffer with proper metadata
function createRawBuffer(data: Uint8Array, width: number, height: number): RawBuffer {
  return {
    type: 'raw',
    width,
    height,
    data,
    metadata: {
      isPooled: true,
      lastUsed: Date.now(),
      createdAt: Date.now()
    }
  };
}

// Create cell buffer with proper metadata
function createCellBuffer(width: number, height: number): CellBuffer {
  const data = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ char: ' ' }))
  );
  
  return {
    type: 'cell',
    width,
    height,
    data,
    metadata: {
      isPooled: true,
      lastUsed: Date.now(),
      createdAt: Date.now()
    }
  };
}

// Export all necessary types and functions
export type {
  Cell,
  BufferType,
  RawBuffer,
  CellBuffer,
  UnifiedBuffer,
  BufferManager,
  BufferManagerConfig,
  RawPoolItem,
  CellPoolItem
};

export {
  BufferError,
  BufferValidationError,
  createBufferManager,
  createRawBuffer,
  createCellBuffer,
  isRawBuffer,
  isCellBuffer,
  isUnifiedBuffer,
  isRawPoolItem,
  isCellPoolItem,
  validateBufferDimensions,
  validateBufferAccess,
  disposeBuffer
};

// Re-export buffer operations
export {
  acquireBuffer,
  releaseBuffer,
  writeToBuffer,
  readFromBuffer
} from './buffer-ops'; 