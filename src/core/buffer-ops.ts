import type {
  Cell,
  UnifiedBuffer,
  RawBuffer,
  CellBuffer,
  BufferManager,
  RawPoolItem,
  CellPoolItem,
  BufferType
} from './buffer';
import {
  BufferError,
  createRawBuffer,
  createCellBuffer,
  isRawBuffer,
  isCellBuffer,
  isRawPoolItem,
  isCellPoolItem,
  validateBufferDimensions,
  validateBufferAccess
} from './buffer';

/**
 * Type guard for valid cell data
 */
function isCellData(data: unknown): data is Cell {
  if (!data || typeof data !== 'object') return false;
  const cell = data as Partial<Cell>;
  return typeof cell.char === 'string';
}

/**
 * Type guard for valid raw buffer data
 */
function isRawData(data: unknown): data is Uint8Array {
  return ArrayBuffer.isView(data);
}

/**
 * Acquires a buffer of the specified type and dimensions from the buffer pool.
 * If no suitable buffer is available in the pool, creates a new one.
 */
export function acquireBuffer(
  manager: BufferManager,
  type: BufferType,
  width: number,
  height: number
): UnifiedBuffer {
  validateBufferDimensions(width, height);
  
  const size = width * height;
  
  try {
    if (type === 'raw') {
      // Find optimal size class
      const targetPool = manager.pool.raw;
      const sizeClass = targetPool.sizeClasses.find(sc => sc.size >= size);
      
      if (sizeClass && sizeClass.buffers.length > 0) {
        // Use buffer from size class
        const item = sizeClass.buffers.pop();
        if (item && isRawPoolItem(item)) {
          return createRawBuffer(item.buffer, width, height);
        }
      }
      
      // Check overflow pool
      const optimal = targetPool.overflow
        .filter(item => item.size >= size)
        .sort((a, b) => a.size - b.size)[0];

      if (optimal) {
        targetPool.overflow = targetPool.overflow.filter(item => item !== optimal);
        return createRawBuffer(optimal.buffer, width, height);
      }

      // Create new buffer with optimal size
      const bufferSize = manager.getOptimalBufferSize(size);
      return createRawBuffer(new Uint8Array(bufferSize), width, height);
    } else {
      // Find optimal size class
      const targetPool = manager.pool.cell;
      const sizeClass = targetPool.sizeClasses.find(sc => sc.size >= size);
      
      if (sizeClass && sizeClass.buffers.length > 0) {
        // Use buffer from size class
        const item = sizeClass.buffers.pop();
        if (item && isCellPoolItem(item)) {
          const buffer = createCellBuffer(width, height);
          buffer.data = item.buffer.map(row => [...row]);
          return buffer;
        }
      }
      
      // Check overflow pool
      const optimal = targetPool.overflow
        .filter(item => item.size >= size)
        .sort((a, b) => a.size - b.size)[0];

      if (optimal) {
        targetPool.overflow = targetPool.overflow.filter(item => item !== optimal);
        const buffer = createCellBuffer(width, height);
        buffer.data = optimal.buffer.map(row => [...row]);
        return buffer;
      }
      
      return createCellBuffer(width, height);
    }
  } catch (error) {
    throw new BufferError('Failed to acquire buffer', { cause: error });
  }
}

/**
 * Releases a buffer back to the pool for reuse.
 * Cleans up the buffer data before releasing.
 */
export function releaseBuffer(manager: BufferManager, buffer: UnifiedBuffer): void {
  if (!buffer.metadata.isPooled) return;

  const now = Date.now();
  const size = buffer.width * buffer.height;

  try {
    if (isRawBuffer(buffer)) {
      buffer.data.fill(0);
      
      // Find appropriate size class
      const targetPool = manager.pool.raw;
      const sizeClass = targetPool.sizeClasses.find(sc => sc.size >= size);
      
      if (sizeClass && targetPool.sizeClasses.reduce(
        (sum, sc) => sum + sc.buffers.length, 0
      ) < manager.config.maxPoolSize) {
        sizeClass.buffers.push({
          buffer: buffer.data,
          size,
          lastUsed: now
        });
      } else {
        // Add to overflow if within limits
        if (targetPool.overflow.length < manager.config.maxPoolSize / 2) {
          targetPool.overflow.push({
            buffer: buffer.data,
            size,
            lastUsed: now
          });
        }
      }
    } else if (isCellBuffer(buffer)) {
      buffer.data.forEach(row => row.fill({ char: ' ' }));
      
      // Find appropriate size class
      const targetPool = manager.pool.cell;
      const sizeClass = targetPool.sizeClasses.find(sc => sc.size >= size);
      
      if (sizeClass && targetPool.sizeClasses.reduce(
        (sum, sc) => sum + sc.buffers.length, 0
      ) < manager.config.maxPoolSize) {
        sizeClass.buffers.push({
          buffer: buffer.data.map(row => [...row]),
          size,
          lastUsed: now
        });
      } else {
        // Add to overflow if within limits
        if (targetPool.overflow.length < manager.config.maxPoolSize / 2) {
          targetPool.overflow.push({
            buffer: buffer.data.map(row => [...row]),
            size,
            lastUsed: now
          });
        }
      }
    }

    // Remove from active buffers if present
    for (const [key, val] of manager.active.entries()) {
      if (val === buffer) {
        manager.active.delete(key);
        break;
      }
    }
  } catch (error) {
    throw new BufferError('Failed to release buffer', { cause: error });
  }
}

/**
 * Writes data to a specific position in the buffer.
 * Validates buffer type and coordinates before writing.
 */
export function writeToBuffer(
  buffer: UnifiedBuffer,
  x: number,
  y: number,
  data: Cell | Uint8Array
): void {
  validateBufferAccess(buffer, x, y);

  try {
    if (isCellBuffer(buffer)) {
      if (!isCellData(data)) {
        throw new BufferError('Invalid cell data format');
      }
      buffer.data[y][x] = { ...data };
    } else if (isRawBuffer(buffer)) {
      if (!isRawData(data)) {
        throw new BufferError('Invalid raw data format');
      }
      const offset = (y * buffer.width + x) * data.length;
      buffer.data.set(data, offset);
    } else {
      throw new BufferError('Invalid buffer type');
    }
    
    buffer.metadata.lastUsed = Date.now();
  } catch (error) {
    if (error instanceof BufferError) {
      throw error;
    }
    throw new BufferError('Buffer write failed', { cause: error });
  }
}

/**
 * Reads data from a specific position in the buffer.
 * Returns null if the position is out of bounds.
 */
export function readFromBuffer(
  buffer: UnifiedBuffer,
  x: number,
  y: number
): Cell | Uint8Array | null {
  try {
    validateBufferAccess(buffer, x, y);
    
    let result: Cell | Uint8Array | null = null;
    
    if (isCellBuffer(buffer)) {
      result = { ...buffer.data[y][x] };
    } else if (isRawBuffer(buffer)) {
      const offset = (y * buffer.width + x);
      result = buffer.data.subarray(offset, offset + 1);
    }
    
    if (result) {
      buffer.metadata.lastUsed = Date.now();
    }
    
    return result;
  } catch (error) {
    if (error instanceof BufferError) {
      return null;
    }
    throw new BufferError('Buffer read failed', { cause: error });
  }
} 