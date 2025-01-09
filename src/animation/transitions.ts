import { type RGB, type AnimationMetrics, type AnimationRecoveryOptions } from '../types';
import { easingFunctions } from './easing';
import { monitoring } from './events';
import { debug } from '../utils/debug';

/**
 * Transition timing configuration
 */
export type TransitionTiming = {
  readonly duration: number;
  readonly easing: (t: number) => number;
  readonly steps?: number;
};

/**
 * Transition state with metrics
 */
export type TransitionState = {
  readonly from: number;
  readonly to: number;
  readonly progress: number;
  readonly metrics?: AnimationMetrics;
};

/**
 * Color transition state with metrics
 */
export type ColorTransitionState = {
  readonly from: RGB;
  readonly to: RGB;
  readonly progress: number;
  readonly metrics?: AnimationMetrics;
};

/**
 * Transition error handler
 */
function handleTransitionError(
  error: Error,
  options: AnimationRecoveryOptions,
  retryCount: number = 0
): Promise<void> {
  if (retryCount < options.maxRetries) {
    return new Promise(resolve => {
      setTimeout(() => {
        debug.info(`Retrying transition (attempt ${retryCount + 1}/${options.maxRetries})`);
        resolve();
      }, options.retryDelay);
    });
  }
  
  options.onError?.(error);
  if (options.fallbackAnimation) {
    return Promise.resolve();
  }
  
  return Promise.reject(error);
}

/**
 * Performance monitoring for transitions
 */
function createMetrics(): AnimationMetrics {
  return {
    frameTime: 0,
    bufferSize: 0,
    memoryUsage: 0,
    frameCount: 0,
    droppedFrames: 0,
    lastFrameTimestamp: performance.now(),
    currentAnimations: 0,
    queueSize: 0,
    fps: 0
  };
}

function updateMetrics(metrics: AnimationMetrics): void {
  const now = performance.now();
  const frameTime = now - (metrics.lastFrameTimestamp ?? now);
  
  metrics.frameTime = frameTime;
  metrics.frameCount = (metrics.frameCount ?? 0) + 1;
  metrics.lastFrameTimestamp = now;
  
  if (frameTime > 16.67) { // 60fps threshold
    metrics.droppedFrames++;
  }
  
  metrics.memoryUsage = process.memoryUsage().heapUsed;
}

/**
 * Creates a transition function with error recovery and performance monitoring
 */
export function createTransition(
  from: number,
  to: number,
  duration: number,
  easing: (t: number) => number = easingFunctions.linear
): (t: number) => number {
  const range = to - from;
  const durationInv = 1 / duration;
  const metrics = monitoring.createMetrics();
  
  return (t: number) => {
    try {
      const startTime = performance.now();
      
      // Clamp time to duration
      const clampedTime = Math.min(t, duration);
      
      // Calculate progress with minimal operations
      const progress = clampedTime * durationInv;
      const easedProgress = easing(progress);
      
      // Update metrics
      metrics.frameTime = performance.now() - startTime;
      monitoring.updateMetrics(metrics);
      
      // Interpolate with minimal operations
      return from + range * easedProgress;
    } catch (error) {
      debug.error('Transition error:', error);
      return from;
    }
  };
}

/**
 * Creates a color transition function with error recovery and performance monitoring
 */
export function createColorTransition(
  from: RGB,
  to: RGB,
  duration: number,
  easing: (t: number) => number = easingFunctions.linear
): (t: number) => RGB {
  // Pre-calculate color differences
  const dr = to.r - from.r;
  const dg = to.g - from.g;
  const db = to.b - from.b;
  
  // Pre-calculate constants
  const durationInv = 1 / duration;
  
  // Reuse color object to minimize allocations
  const color: RGB = { r: 0, g: 0, b: 0 };
  const metrics = monitoring.createMetrics();
  
  return (t: number) => {
    try {
      const startTime = performance.now();
      
      // Clamp time to duration
      const clampedTime = Math.min(t, duration);
      
      // Calculate progress with minimal operations
      const progress = clampedTime * durationInv;
      const easedProgress = easing(progress);
      
      // Update color values in place
      color.r = Math.round(from.r + dr * easedProgress);
      color.g = Math.round(from.g + dg * easedProgress);
      color.b = Math.round(from.b + db * easedProgress);
      
      // Update metrics
      metrics.frameTime = performance.now() - startTime;
      monitoring.updateMetrics(metrics);
      
      return color;
    } catch (error) {
      debug.error('Color transition error:', error);
      return from;
    }
  };
}

/**
 * Creates a multi-color transition function with error recovery and performance monitoring
 */
export function createMultiColorTransition(
  colors: RGB[],
  duration: number,
  easing: (t: number) => number = easingFunctions.linear
): (t: number) => RGB {
  if (colors.length < 2) {
    throw new Error('At least 2 colors are required for multi-color transition');
  }
  
  // Pre-calculate segment duration
  const segmentDuration = duration / (colors.length - 1);
  const segmentDurationInv = 1 / segmentDuration;
  
  // Reuse color object to minimize allocations
  const color: RGB = { r: 0, g: 0, b: 0 };
  const metrics = monitoring.createMetrics();
  
  return (t: number) => {
    try {
      const startTime = performance.now();
      
      // Clamp time to duration
      const clampedTime = Math.min(t, duration);
      
      // Find current segment
      const segment = Math.min(
        Math.floor(clampedTime / segmentDuration),
        colors.length - 2
      );
      
      const from = colors[segment];
      const to = colors[segment + 1];
      
      // Calculate segment progress
      const segmentTime = clampedTime - segment * segmentDuration;
      const progress = segmentTime * segmentDurationInv;
      const easedProgress = easing(progress);
      
      // Update color values in place
      color.r = Math.round(from.r + (to.r - from.r) * easedProgress);
      color.g = Math.round(from.g + (to.g - from.g) * easedProgress);
      color.b = Math.round(from.b + (to.b - from.b) * easedProgress);
      
      // Update metrics
      metrics.frameTime = performance.now() - startTime;
      monitoring.updateMetrics(metrics);
      
      return color;
    } catch (error) {
      debug.error('Multi-color transition error:', error);
      return colors[0];
    }
  };
}

/**
 * Standard easing functions
 */
export const easings = {
  linear: (t: number): number => t,
  
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => 
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => --t * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInElastic: (t: number): number =>
    t === 0 ? 0 : t === 1 ? 1 : 
    -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3)),
  
  easeOutElastic: (t: number): number =>
    t === 0 ? 0 : t === 1 ? 1 :
    Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1
} as const;

/**
 * Creates a stepped transition with error recovery
 */
export function createSteppedTransition(
  steps: number,
  timing: TransitionTiming,
  recovery?: AnimationRecoveryOptions
): (progress: number) => number {
  const transition = createTransition(0, 1, timing.duration, timing.easing);
  return transition;
}

/**
 * Creates a spring transition with error recovery
 */
export function createSpringTransition(
  config: { stiffness: number; damping: number; mass: number },
  recovery?: AnimationRecoveryOptions
): (progress: number) => number {
  const { stiffness: k, damping: c, mass: m } = config;
  const metrics = createMetrics();
  
  return (progress: number): number => {
    try {
      const omega = Math.sqrt(k / m);
      const zeta = c / (2 * Math.sqrt(k * m));
      
      let result: number;
      
      if (zeta < 1) {
        const omega_d = omega * Math.sqrt(1 - zeta * zeta);
        result = 1 - Math.exp(-zeta * omega * progress) * 
          (Math.cos(omega_d * progress) + 
           (zeta * omega / omega_d) * Math.sin(omega_d * progress));
      } else {
        result = 1 - (1 + omega * progress) * Math.exp(-omega * progress);
      }
      
      updateMetrics(metrics);
      return result;
    } catch (error) {
      if (recovery) {
        handleTransitionError(error as Error, recovery);
      }
      return progress;
    }
  };
}

// Export common timing configurations with recovery options
export const timings = {
  default: { 
    duration: 300, 
    easing: easings.easeOutQuad,
    recovery: {
      maxRetries: 3,
      retryDelay: 100,
      onError: (error: Error) => debug.error('Transition error:', error)
    }
  },
  slow: { 
    duration: 600, 
    easing: easings.easeInOutQuad,
    recovery: {
      maxRetries: 3,
      retryDelay: 200
    }
  },
  fast: { 
    duration: 150, 
    easing: easings.easeOutQuad,
    recovery: {
      maxRetries: 2,
      retryDelay: 50
    }
  },
  spring: { 
    duration: 500, 
    easing: createSpringTransition({ 
      stiffness: 100, 
      damping: 10, 
      mass: 1 
    }),
    recovery: {
      maxRetries: 3,
      retryDelay: 150
    }
  },
  bounce: { 
    duration: 800, 
    easing: easings.easeOutElastic,
    recovery: {
      maxRetries: 3,
      retryDelay: 200
    }
  }
} as const;

// Export performance monitoring utilities
export const metricsUtils = {
  createMetrics,
  updateMetrics
};
