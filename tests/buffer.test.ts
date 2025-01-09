import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  type Cell,
  type RawBuffer,
  type CellBuffer,
  type BufferManager,
  createBufferManager,
  acquireBuffer,
  releaseBuffer,
  writeToBuffer,
  readFromBuffer,
  isRawBuffer,
  isCellBuffer
} from "../src/core/buffer";

describe("Buffer System", () => {
  let manager: BufferManager;
  
  beforeEach(() => {
    manager = createBufferManager({
      poolSize: 10,
      maxBufferSize: 1024 * 1024,
      initialBufferSize: 1024,
      poolStrategy: 'lru' as const,
      maxPoolSize: 20,
      growthFactor: 1.5
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe("Size Class Management", () => {
    test("creates appropriate size classes", () => {
      expect(manager.pool.raw.sizeClasses.length).toBeGreaterThan(0);
      expect(manager.pool.cell.sizeClasses.length).toBeGreaterThan(0);
      
      // Verify size classes are powers of 2
      manager.pool.raw.sizeClasses.forEach((sc, i) => {
        if (i > 0) {
          const prevSize = manager.pool.raw.sizeClasses[i - 1].size;
          expect(sc.size).toBe(prevSize * 2);
        }
      });
    });

    test("allocates buffers to correct size classes", () => {
      const buffer1 = acquireBuffer(manager, 'raw', 32, 32);
      releaseBuffer(manager, buffer1);
      
      // Find the appropriate size class
      const sizeClass = manager.pool.raw.sizeClasses.find(
        sc => sc.size >= 32 * 32
      );
      expect(sizeClass).toBeDefined();
      if (sizeClass) {
        expect(sizeClass.buffers.length).toBe(1);
      }
    });

    test("handles overflow correctly", () => {
      // Fill up a size class
      const buffers = Array(manager.config.maxPoolSize + 1)
        .fill(null)
        .map(() => acquireBuffer(manager, 'raw', 32, 32));
      
      // Release all buffers
      buffers.forEach(buffer => releaseBuffer(manager, buffer));
      
      // Check that overflow is used
      const sizeClass = manager.pool.raw.sizeClasses.find(
        sc => sc.size >= 32 * 32
      );
      expect(sizeClass).toBeDefined();
      if (sizeClass) {
        expect(sizeClass.buffers.length).toBeLessThanOrEqual(manager.config.maxPoolSize);
        expect(manager.pool.raw.overflow.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Buffer Pool Management", () => {
    test("reuses buffers from size classes", () => {
      const buffer1 = acquireBuffer(manager, 'raw', 32, 32);
      const originalData = buffer1.data;
      releaseBuffer(manager, buffer1);
      
      const buffer2 = acquireBuffer(manager, 'raw', 32, 32);
      expect(buffer2.data).toBe(originalData);
    });

    test("reuses buffers from overflow", () => {
      // Fill up size classes first
      const buffers = Array(manager.config.maxPoolSize)
        .fill(null)
        .map(() => acquireBuffer(manager, 'raw', 32, 32));
      
      // Create one more buffer that should go to overflow
      const overflowBuffer = acquireBuffer(manager, 'raw', 32, 32);
      const originalData = overflowBuffer.data;
      
      // Release all buffers
      buffers.forEach(buffer => releaseBuffer(manager, buffer));
      releaseBuffer(manager, overflowBuffer);
      
      // Acquire a new buffer - should get one from overflow
      const newBuffer = acquireBuffer(manager, 'raw', 32, 32);
      expect(newBuffer.data).toBe(originalData);
    });

    test("evicts oldest buffers when pool is full", () => {
      // Fill up the pool
      const buffers = Array(manager.config.maxPoolSize)
        .fill(null)
        .map(() => acquireBuffer(manager, 'raw', 32, 32));
      
      buffers.forEach(buffer => releaseBuffer(manager, buffer));
      
      // Create a new buffer to force eviction
      const newBuffer = acquireBuffer(manager, 'raw', 32, 32);
      releaseBuffer(manager, newBuffer);
      
      // Total buffers should not exceed maxPoolSize
      const totalBuffers = manager.pool.raw.sizeClasses.reduce(
        (sum, sc) => sum + sc.buffers.length,
        0
      ) + manager.pool.raw.overflow.length;
      
      expect(totalBuffers).toBeLessThanOrEqual(manager.config.maxPoolSize);
    });
  });

  describe("Buffer Operations", () => {
    test("writes and reads raw buffer correctly", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      const testData = new Uint8Array([1, 2, 3, 4]);
      writeToBuffer(buffer, 0, 0, testData);
      const readData = readFromBuffer(buffer, 0, 0) as Uint8Array;
      expect(Array.from(readData)).toEqual(Array.from(testData.subarray(0, 1)));
    });

    test("writes and reads cell buffer correctly", () => {
      const buffer = acquireBuffer(manager, 'cell', 32, 32);
      const testCell: Cell = { 
        char: 'X',
        fg: { r: 255, g: 0, b: 0 },
        bg: { r: 0, g: 0, b: 0 }
      };
      writeToBuffer(buffer, 2, 2, testCell);
      const readCell = readFromBuffer(buffer, 2, 2) as Cell;
      expect(readCell).toEqual(testCell);
    });

    test("updates lastUsed timestamp on operations", async () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      const originalTimestamp = buffer.metadata.lastUsed;
      
      // Wait a small amount to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 1));
      
      writeToBuffer(buffer, 0, 0, new Uint8Array([1]));
      expect(buffer.metadata.lastUsed).toBeGreaterThan(originalTimestamp);
      
      const readTimestamp = buffer.metadata.lastUsed;
      await new Promise(resolve => setTimeout(resolve, 1));
      
      readFromBuffer(buffer, 0, 0);
      expect(buffer.metadata.lastUsed).toBeGreaterThan(readTimestamp);
    });
  });

  describe("Cleanup and Disposal", () => {
    test("cleans up expired buffers", async () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      buffer.metadata.lastUsed = Date.now() - manager.config.cleanupInterval - 1000;
      releaseBuffer(manager, buffer);
      
      manager.cleanup();
      
      const totalBuffers = manager.pool.raw.sizeClasses.reduce(
        (sum, sc) => sum + sc.buffers.length,
        0
      ) + manager.pool.raw.overflow.length;
      
      expect(totalBuffers).toBe(0);
    });

    test("properly disposes all resources", () => {
      const buffers = Array(5)
        .fill(null)
        .map(() => acquireBuffer(manager, 'raw', 32, 32));
      
      buffers.forEach(buffer => releaseBuffer(manager, buffer));
      
      manager.dispose();
      
      expect(manager.active.size).toBe(0);
      expect(manager.pool.raw.overflow.length).toBe(0);
      expect(manager.pool.cell.overflow.length).toBe(0);
      manager.pool.raw.sizeClasses.forEach(sc => {
        expect(sc.buffers.length).toBe(0);
      });
      manager.pool.cell.sizeClasses.forEach(sc => {
        expect(sc.buffers.length).toBe(0);
      });
    });
  });
}); 