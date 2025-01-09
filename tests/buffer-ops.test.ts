import { describe, expect, test, beforeEach } from "bun:test";
import {
  type BufferManager,
  type Cell,
  type RawBuffer,
  type CellBuffer,
  createBufferManager,
  acquireBuffer,
  releaseBuffer,
  writeToBuffer,
  readFromBuffer,
  BufferError,
  BufferValidationError,
  isRawBuffer
} from "../src/core/buffer";

describe("Buffer Operations", () => {
  let manager: BufferManager;

  beforeEach(() => {
    manager = createBufferManager({
      poolSize: 10,
      maxBufferSize: 1024 * 1024,
      cleanupInterval: 60000,
      initialBufferSize: 1024,
      poolStrategy: 'lru',
      maxPoolSize: 20,
      growthFactor: 1.5
    });
  });

  describe("acquireBuffer", () => {
    test("acquires buffer from appropriate size class", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      expect(buffer.type).toBe('raw');
      expect(buffer.width).toBe(32);
      expect(buffer.height).toBe(32);
      expect(buffer.data instanceof Uint8Array).toBe(true);
      expect(buffer.metadata.isPooled).toBe(true);
      
      // Size should be from appropriate size class
      const dataSize = buffer.data.length;
      const sizeClass = manager.pool.raw.sizeClasses.find(
        sc => sc.size >= 32 * 32
      );
      expect(sizeClass).toBeDefined();
      if (sizeClass) {
        expect(dataSize).toBeLessThanOrEqual(sizeClass.size);
      }
    });

    test("acquires buffer from overflow when size classes are full", () => {
      // Fill up size classes
      const buffers = Array(manager.config.maxPoolSize)
        .fill(null)
        .map(() => acquireBuffer(manager, 'raw', 32, 32));
      
      buffers.forEach(buffer => releaseBuffer(manager, buffer));
      
      // Create one more buffer
      const overflowBuffer = acquireBuffer(manager, 'raw', 32, 32);
      releaseBuffer(manager, overflowBuffer);
      
      // Verify it went to overflow
      expect(manager.pool.raw.overflow.length).toBeGreaterThan(0);
      
      // Acquire it back
      const newBuffer = acquireBuffer(manager, 'raw', 32, 32);
      expect(newBuffer.data).toBe(overflowBuffer.data);
    });

    test("creates new buffer when no suitable ones exist", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      const buffer2 = acquireBuffer(manager, 'raw', 32, 32);
      
      expect(buffer.data).not.toBe(buffer2.data);
    });

    test("throws on invalid dimensions", () => {
      expect(() => acquireBuffer(manager, 'raw', 0, 32)).toThrow(BufferValidationError);
      expect(() => acquireBuffer(manager, 'raw', 32, -1)).toThrow(BufferValidationError);
      expect(() => acquireBuffer(manager, 'cell', -5, 32)).toThrow(BufferValidationError);
      expect(() => acquireBuffer(manager, 'raw', 1.5, 32)).toThrow(BufferValidationError);
    });
  });

  describe("releaseBuffer", () => {
    test("releases to appropriate size class", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      releaseBuffer(manager, buffer);
      
      const sizeClass = manager.pool.raw.sizeClasses.find(
        sc => sc.size >= 32 * 32
      );
      expect(sizeClass).toBeDefined();
      if (sizeClass) {
        expect(sizeClass.buffers.length).toBe(1);
        expect(sizeClass.buffers[0].buffer).toBe(buffer.data);
      }
    });

    test("releases to overflow when size classes are full", () => {
      // Fill up size classes
      const buffers = Array(manager.config.maxPoolSize)
        .fill(null)
        .map(() => acquireBuffer(manager, 'raw', 32, 32));
      
      buffers.forEach(buffer => releaseBuffer(manager, buffer));
      
      // Release one more buffer
      const overflowBuffer = acquireBuffer(manager, 'raw', 32, 32) as RawBuffer;
      releaseBuffer(manager, overflowBuffer);
      
      expect(manager.pool.raw.overflow.length).toBeGreaterThan(0);
      const overflowItem = manager.pool.raw.overflow[0];
      expect(overflowItem.buffer).toBe(overflowBuffer.data);
    });

    test("cleans buffer data before release", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32) as RawBuffer;
      const data = new Uint8Array([1, 2, 3, 4]);
      writeToBuffer(buffer, 0, 0, data);
      releaseBuffer(manager, buffer);
      
      // Verify data is cleared
      expect(Array.from(buffer.data).every(val => val === 0)).toBe(true);
    });

    test("updates lastUsed timestamp", async () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      const originalTime = buffer.metadata.lastUsed;
      
      await new Promise(resolve => setTimeout(resolve, 1));
      releaseBuffer(manager, buffer);
      
      const sizeClass = manager.pool.raw.sizeClasses.find(
        sc => sc.size >= 32 * 32
      );
      if (sizeClass && sizeClass.buffers.length > 0) {
        expect(sizeClass.buffers[0].lastUsed).toBeGreaterThan(originalTime);
      }
    });
  });

  describe("writeToBuffer", () => {
    test("writes to raw buffer correctly", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      const data = new Uint8Array([1, 2, 3, 4]);
      writeToBuffer(buffer, 0, 0, data);
      const readData = readFromBuffer(buffer, 0, 0) as Uint8Array;
      expect(Array.from(readData)).toEqual(Array.from(data.subarray(0, 1)));
    });

    test("writes to cell buffer correctly", () => {
      const buffer = acquireBuffer(manager, 'cell', 32, 32);
      const cell: Cell = { char: 'X', fg: { r: 255, g: 0, b: 0 } };
      writeToBuffer(buffer, 2, 2, cell);
      const readCell = readFromBuffer(buffer, 2, 2) as Cell;
      expect(readCell).toEqual(cell);
    });

    test("throws on type mismatch", () => {
      const rawBuffer = acquireBuffer(manager, 'raw', 32, 32);
      const cellBuffer = acquireBuffer(manager, 'cell', 32, 32);
      const cell: Cell = { char: 'X' };
      const data = new Uint8Array([1]);
      
      expect(() => writeToBuffer(rawBuffer, 0, 0, cell)).toThrow(BufferError);
      expect(() => writeToBuffer(cellBuffer, 0, 0, data)).toThrow(BufferError);
    });

    test("throws on out of bounds access", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      const data = new Uint8Array([1]);
      expect(() => writeToBuffer(buffer, 32, 0, data)).toThrow(BufferValidationError);
      expect(() => writeToBuffer(buffer, -1, 0, data)).toThrow(BufferValidationError);
    });
  });

  describe("readFromBuffer", () => {
    test("reads from raw buffer correctly", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      const data = new Uint8Array([1, 2, 3, 4]);
      writeToBuffer(buffer, 0, 0, data);
      const readData = readFromBuffer(buffer, 0, 0) as Uint8Array;
      expect(Array.from(readData)).toEqual(Array.from(data.subarray(0, 1)));
    });

    test("reads from cell buffer correctly", () => {
      const buffer = acquireBuffer(manager, 'cell', 32, 32);
      const cell: Cell = { char: 'X', fg: { r: 255, g: 0, b: 0 } };
      writeToBuffer(buffer, 2, 2, cell);
      const readCell = readFromBuffer(buffer, 2, 2) as Cell;
      expect(readCell).toEqual(cell);
    });

    test("returns null for out of bounds access", () => {
      const buffer = acquireBuffer(manager, 'raw', 32, 32);
      expect(readFromBuffer(buffer, 32, 0)).toBeNull();
      expect(readFromBuffer(buffer, -1, 0)).toBeNull();
    });

    test("updates lastUsed timestamp on successful read", async () => {
      const buffer = acquireBuffer(manager, 'cell', 32, 32);
      const originalTimestamp = buffer.metadata.lastUsed;
      
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const cell: Cell = { char: 'X' };
      writeToBuffer(buffer, 2, 2, cell);
      readFromBuffer(buffer, 2, 2);
      
      expect(buffer.metadata.lastUsed).toBeGreaterThan(originalTimestamp);
    });
  });
}); 