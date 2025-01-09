import type { AnimationInstance } from "./types";
import { debug } from "./utils/debug";
import { emit } from "./animation/events";

/**
 * Error recovery configuration
 */
type RecoveryConfig = {
  maxRetries: number;
  retryDelay: number;
  fallbackMode: boolean;
};

/**
 * Recovery state
 */
type RecoveryState = {
  config: RecoveryConfig;
  retryCount: Map<string, number>;
  failedAnimations: Set<string>;
};

// Initialize recovery state
const state: RecoveryState = {
  config: {
    maxRetries: 3,
    retryDelay: 100,
    fallbackMode: false
  },
  retryCount: new Map(),
  failedAnimations: new Set()
};

/**
 * Handles animation errors with recovery attempts
 */
export async function handleError(
  error: unknown,
  animation: AnimationInstance,
  retry: () => Promise<void>
): Promise<boolean> {
  const retries = state.retryCount.get(animation.id) || 0;
  
  debug.error(`Animation error (${animation.id}):`, error);
  
  if (retries >= state.config.maxRetries) {
    state.failedAnimations.add(animation.id);
    emit('error', {
      id: animation.id,
      type: 'error',
      data: { error, retries }
    });
    return false;
  }

  state.retryCount.set(animation.id, retries + 1);
  
  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, state.config.retryDelay));
  
  try {
    if (state.config.fallbackMode) {
      // Use simplified rendering in fallback mode
      animation.renderFrame = createFallbackRenderer(animation);
    }
    
    await retry();
    state.retryCount.delete(animation.id);
    return true;
  } catch (retryError) {
    return handleError(retryError, animation, retry);
  }
}

/**
 * Creates a simplified fallback renderer
 */
function createFallbackRenderer(
  animation: AnimationInstance
): AnimationInstance['renderFrame'] {
  return (progress, text, color, buffer) => {
    // Simple static rendering without effects
    const encoder = new TextEncoder();
    let offset = 0;
    
    const colorBytes = encoder.encode(`\x1b[38;2;${color.r};${color.g};${color.b}m`);
    buffer.set(colorBytes, offset);
    offset += colorBytes.length;
    
    const textBytes = encoder.encode(text);
    buffer.set(textBytes, offset);
    offset += textBytes.length;
    
    const resetBytes = encoder.encode('\x1b[0m');
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return new TextDecoder().decode(buffer.subarray(0, offset));
  };
}

/**
 * Checks if an animation is in fallback mode
 */
export function isInFallbackMode(animationId: string): boolean {
  return state.failedAnimations.has(animationId);
}

/**
 * Resets error recovery state
 */
export function reset(): void {
  state.retryCount.clear();
  state.failedAnimations.clear();
  state.config.fallbackMode = false;
}

/**
 * Updates recovery configuration
 */
export function configure(config: Partial<RecoveryConfig>): void {
  state.config = { ...state.config, ...config };
}

// Export recovery utilities
export const recovery = {
  handleError,
  isInFallbackMode,
  reset,
  configure
};
