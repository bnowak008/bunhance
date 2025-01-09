import { onAnimation as on, offAnimation as off, emitAnimation as emit } from "../animation/events";
import { debug } from "./debug";
import { buffers } from "../core/buffer";
import { performanceMonitor } from "../performance";

/**
 * Animation instance type
 */
type AnimationInstance = {
  id: string;
  frameBuffer?: Uint8Array;
};

/**
 * Resource cleanup state
 */
type CleanupState = {
  activeBuffers: Set<Uint8Array>;
  totalMemoryUsage: number;
  cleanupThreshold: number;
  isAutoCleanupEnabled: boolean;
};

// Initialize cleanup state
const state: CleanupState = {
  activeBuffers: new Set(),
  totalMemoryUsage: 0,
  cleanupThreshold: 1024 * 1024 * 50, // 50MB
  isAutoCleanupEnabled: true
};

/**
 * Registers a buffer for cleanup
 */
export function registerBuffer(buffer: Uint8Array): void {
  state.activeBuffers.add(buffer);
  state.totalMemoryUsage += buffer.byteLength;
  
  if (state.isAutoCleanupEnabled && state.totalMemoryUsage > state.cleanupThreshold) {
    debug.warn(`Memory usage exceeded threshold (${state.totalMemoryUsage} bytes). Running cleanup...`);
    cleanupUnusedBuffers();
  }
}

/**
 * Releases a buffer
 */
export function releaseBuffer(buffer: Uint8Array): void {
  if (state.activeBuffers.delete(buffer)) {
    state.totalMemoryUsage -= buffer.byteLength;
  }
}

/**
 * Cleans up unused buffers
 */
export function cleanupUnusedBuffers(): void {
  const initialSize = state.activeBuffers.size;
  const initialMemory = state.totalMemoryUsage;
  
  // Create a new Set for active buffers
  const newBuffers = new Set<Uint8Array>();
  let newMemoryUsage = 0;
  
  // Only keep buffers that are still referenced
  for (const buffer of state.activeBuffers) {
    if (isBufferInUse(buffer)) {
      newBuffers.add(buffer);
      newMemoryUsage += buffer.byteLength;
    }
  }
  
  // Update state
  state.activeBuffers = newBuffers;
  state.totalMemoryUsage = newMemoryUsage;
  
  debug.info(`Cleanup completed: Released ${initialSize - newBuffers.size} buffers, freed ${initialMemory - newMemoryUsage} bytes`);
}

/**
 * Checks if a buffer is still in use
 */
function isBufferInUse(buffer: Uint8Array): boolean {
  // Implementation depends on how buffers are used in the animation system
  // This is a simple example that always returns false
  return false;
}

/**
 * Cleans up animation resources
 */
export function cleanupAnimation(animation: AnimationInstance): void {
  try {
    // Release frame buffer
    if (animation.frameBuffer) {
      releaseBuffer(animation.frameBuffer);
    }
    
    // Emit buffer event for cleanup
    emit('buffer', {
      id: animation.id,
      type: 'buffer'
    });
    
    debug.info(`Cleaned up animation: ${animation.id}`);
  } catch (error) {
    debug.error(`Error cleaning up animation:`, error);
  }
}

/**
 * Configures cleanup behavior
 */
export function configure(config: Partial<CleanupState>): void {
  Object.assign(state, config);
}

/**
 * Gets current cleanup stats
 */
export function getStats(): Readonly<CleanupState> {
  return { ...state };
}

/**
 * Performs a full cleanup of all resources
 */
export function cleanupAll(): void {
  // Clean up animations
  cleanup.cleanupAll();
  
  // Clean up buffers
  buffers.cleanupAll();
  
  // Clean up performance metrics
  performanceMonitor.reset();
  
  // Clean up debug state
  debug.flush();
  
  debug.info('Full system cleanup completed');
}

// Export cleanup system
export const cleanup = {
  registerBuffer,
  releaseBuffer,
  cleanupUnusedBuffers,
  cleanupAnimation,
  configure,
  getStats,
  cleanupAll
}; 