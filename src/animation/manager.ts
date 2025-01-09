import { createTerminalBuffer, type TerminalBuffer } from '../core/terminal-buffer';
import type { AnimationMetrics } from '../types';
import { debug } from '../utils/debug';
import { metricsUtils } from './transitions';
import { cleanup } from '../utils/cleanup';

/**
 * Animation region configuration
 */
export type AnimationRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Animation configuration
 */
export type Animation = {
  id: string;
  region: AnimationRegion;
  render: (buffer: TerminalBuffer, frame: number) => void;
  fps: number;
  frame: number;
  lastFrameTime: number;
  metrics?: AnimationMetrics;
};

/**
 * Animation manager state
 */
type AnimationManagerState = {
  buffer: TerminalBuffer;
  uiBuffer: TerminalBuffer;
  animations: Map<string, Animation>;
  intervalId: ReturnType<typeof setInterval> | null;
  isRunning: boolean;
  metrics: AnimationMetrics;
};

/**
 * Creates an animation manager for coordinating multiple animations
 */
export function createAnimationManager(width: number, height: number) {
  const state: AnimationManagerState = {
    buffer: createTerminalBuffer(width, height),
    uiBuffer: createTerminalBuffer(width, height),
    animations: new Map(),
    intervalId: null,
    isRunning: false,
    metrics: {
      frameTime: 0,
      bufferSize: 0,
      memoryUsage: 0,
      frameCount: 0,
      droppedFrames: 0,
      lastFrameTimestamp: performance.now(),
      currentAnimations: 0,
      queueSize: 0,
      fps: 0
    }
  };

  /**
   * Starts the render loop
   */
  function startRenderLoop(): void {
    if (state.intervalId) return;

    const targetFrameTime = 1000 / 60; // 60fps
    let lastFrameTime = performance.now();

    state.intervalId = setInterval(() => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;

      try {
        // Clear previous frame
        state.buffer.clear();

        // Update and render animations
        for (const [id, animation] of state.animations) {
          const frameTime = currentTime - animation.lastFrameTime;
          const targetFrameTime = 1000 / animation.fps;

          if (frameTime >= targetFrameTime) {
            animation.frame++;
            animation.lastFrameTime = currentTime;

            try {
              animation.render(state.buffer, animation.frame);
              if (animation.metrics) {
                metricsUtils.updateMetrics(animation.metrics);
              }
            } catch (error) {
              debug.error(`Animation render error:`, error);
              removeAnimation(id);
            }
          }
        }

        // Render UI on top
        const output = state.buffer.render() + state.uiBuffer.render();
        process.stdout.write(`\x1B[H${output}`);

        // Update metrics
        metricsUtils.updateMetrics(state.metrics);

        if (deltaTime > targetFrameTime * 1.2) {
          debug.warn(`Frame time exceeded target: ${deltaTime.toFixed(2)}ms`);
          state.metrics.droppedFrames++;
        }

      } catch (error) {
        debug.error(`Render loop error:`, error);
        stop();
      }

      lastFrameTime = currentTime;
    }, targetFrameTime);
  }

  /**
   * Stops the animation manager
   */
  function stop(): void {
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.isRunning = false;

    // Show cursor
    process.stdout.write('\x1B[?25h');
  }

  /**
   * Removes an animation
   */
  function removeAnimation(id: string): void {
    const animation = state.animations.get(id);
    if (animation) {
      // Clear animation region
      state.buffer.clearRegion(
        animation.region.x,
        animation.region.y,
        animation.region.width,
        animation.region.height
      );

      state.animations.delete(id);

      if (state.animations.size === 0) {
        stop();
      }
    }
  }

  return {
    /**
     * Adds an animation
     */
    addAnimation(animation: Animation): void {
      state.animations.set(animation.id, {
        ...animation,
        metrics: metricsUtils.createMetrics()
      });

      if (state.isRunning && !state.intervalId) {
        startRenderLoop();
      }
    },

    /**
     * Removes an animation
     */
    removeAnimation,

    /**
     * Updates the UI buffer
     */
    updateUI(render: (buffer: TerminalBuffer) => void): void {
      render(state.uiBuffer);
    },

    /**
     * Starts the animation manager
     */
    start(): void {
      if (state.isRunning) return;

      state.isRunning = true;
      startRenderLoop();

      // Hide cursor
      process.stdout.write('\x1B[?25l');
    },

    /**
     * Stops the animation manager
     */
    stop,

    /**
     * Clears all animations and buffers
     */
    clear(): void {
      state.buffer.clear();
      state.uiBuffer.clear();
      state.animations.clear();
    },

    /**
     * Cleans up resources
     */
    cleanup(): void {
      stop();
      this.clear();
      state.buffer.cleanup();
      state.uiBuffer.cleanup();
      cleanup.cleanupAll();
    },

    /**
     * Gets performance metrics
     */
    getMetrics(): Readonly<AnimationMetrics> {
      return { ...state.metrics };
    }
  };
}

// Export types
export type AnimationManager = ReturnType<typeof createAnimationManager>; 