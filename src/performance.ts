import type { AnimationMetrics } from "./types";
import { debug } from "./utils/debug";

/**
 * Performance configuration
 */
type PerformanceConfig = {
  bufferSize: number;
  targetFps: number;
  memoryLimit: number;
  optimizationEnabled: boolean;
};

/**
 * Performance state
 */
type PerformanceState = {
  config: PerformanceConfig;
  metrics: AnimationMetrics;
  lastUpdate: number;
};

// Initialize performance state
const state: PerformanceState = {
  config: {
    bufferSize: 1024,
    targetFps: 60,
    memoryLimit: 1024 * 1024 * 100, // 100MB
    optimizationEnabled: true
  },
  metrics: {
    frameTime: 0,
    bufferSize: 0,
    memoryUsage: 0,
    frameCount: 0,
    droppedFrames: 0,
    lastFrameTimestamp: globalThis.performance.now(),
    currentAnimations: 0,
    queueSize: 0,
    fps: 0
  },
  lastUpdate: globalThis.performance.now()
};

/**
 * Updates performance metrics
 */
export function updateMetrics(metrics: Partial<AnimationMetrics>): void {
  const now = globalThis.performance.now();
  const frameTime = now - (state.metrics.lastFrameTimestamp ?? now);

  state.metrics = {
    ...state.metrics,
    ...metrics,
    frameTime,
    frameCount: (state.metrics.frameCount ?? 0) + 1,
    lastFrameTimestamp: now
  };

  if (frameTime > 1000 / state.config.targetFps) {
    state.metrics.droppedFrames++;
  }

  // Log performance warnings
  if ((state.metrics.memoryUsage ?? 0) > state.config.memoryLimit) {
    debug.warn('Memory usage exceeded limit:', {
      current: state.metrics.memoryUsage,
      limit: state.config.memoryLimit
    });
  }

  if ((state.metrics.droppedFrames ?? 0) > 10) {
    debug.warn('High number of dropped frames:', {
      dropped: state.metrics.droppedFrames,
      total: state.metrics.frameCount
    });
  }
}

/**
 * Optimizes buffer allocation based on metrics
 */
export function optimizeBuffer(size: number): number {
  if (!state.config.optimizationEnabled) {
    return size;
  }

  // Round up to nearest power of 2 for better memory allocation
  const optimal = Math.pow(2, Math.ceil(Math.log2(size)));
  
  if (optimal > state.config.bufferSize) {
    debug.info('Increasing buffer size:', {
      from: state.config.bufferSize,
      to: optimal
    });
    state.config.bufferSize = optimal;
  }

  return optimal;
}

/**
 * Gets current performance metrics
 */
export function getMetrics(): Readonly<AnimationMetrics> {
  return { ...state.metrics };
}

/**
 * Updates performance configuration
 */
export function configure(config: Partial<PerformanceConfig>): void {
  state.config = { ...state.config, ...config };
}

/**
 * Resets performance metrics
 */
export function reset(): void {
  state.metrics = {
    frameTime: 0,
    bufferSize: 0,
    memoryUsage: 0,
    frameCount: 0,
    droppedFrames: 0,
    lastFrameTimestamp: globalThis.performance.now(),
    currentAnimations: 0,
    queueSize: 0,
    fps: 0
  };
  state.lastUpdate = globalThis.performance.now();
}

// Export performance monitoring utilities
export const performanceMonitor = {
  updateMetrics,
  optimizeBuffer,
  getMetrics,
  configure,
  reset
};
