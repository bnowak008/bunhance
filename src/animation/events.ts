import type { AnimationMetrics } from '../types';
import { debug } from '../utils/debug';

export const monitoring = {
  createMetrics(): AnimationMetrics {
    return {
      frameTime: 0,
      droppedFrames: 0,
      bufferSize: 0,
      currentAnimations: 0,
      queueSize: 0,
      fps: 0,
      memoryUsage: 0,
      frameCount: 0,
      lastFrameTimestamp: performance.now()
    };
  },

  updateMetrics(metrics: AnimationMetrics): void {
    try {
      // Update global animation metrics
      if (metrics.frameTime > 16.67) { // Over 60fps threshold
        metrics.droppedFrames++;
      }
    } catch (error) {
      debug.error('Error updating metrics:', error);
    }
  }
};

/**
 * Animation event types
 */
export type AnimationEventType = 
  | 'start'
  | 'complete'
  | 'pause'
  | 'resume'
  | 'error'
  | 'frame'
  | 'progress'
  | 'buffer'
  | 'performance'
  | 'recovery'
  | 'sync'
  | 'sync-complete';

/**
 * Animation event detail
 */
export type AnimationEventDetail = {
  readonly id: string;
  readonly type: AnimationEventType;
  readonly timestamp: number;
  readonly data?: unknown;
  readonly groupId?: string;
};

/**
 * Event handler type
 */
type EventHandler = (detail: AnimationEventDetail) => void;

/**
 * Event system state
 */
type EventState = {
  readonly listeners: Map<AnimationEventType, Set<EventHandler>>;
  readonly eventQueue: AnimationEventDetail[];
  isProcessing: boolean;
  readonly batchSize: number;
  readonly processingInterval: number;
};

// Initialize event system state
const state: EventState = {
  listeners: new Map(),
  eventQueue: [],
  isProcessing: false,
  batchSize: 10,
  processingInterval: 16 // ~60fps
};

// Group management
const groups = new Map<string, { members: Set<string>, onComplete?: () => void }>();

export function createGroup(groupId: string, onComplete?: () => void): void {
  groups.set(groupId, { members: new Set(), onComplete });
}

export function addToGroup(groupId: string, id: string): void {
  const group = groups.get(groupId);
  if (group) {
    group.members.add(id);
  }
}

export function removeFromGroup(groupId: string, id: string): void {
  const group = groups.get(groupId);
  if (group) {
    group.members.delete(id);
    if (group.members.size === 0) {
      group.onComplete?.();
      groups.delete(groupId);
    }
  }
}

export function getGroupSize(groupId: string): number {
  return groups.get(groupId)?.members.size ?? 0;
}

/**
 * Subscribes to animation events
 */
export function on(type: AnimationEventType, handler: EventHandler): () => void {
  let handlers = state.listeners.get(type);
  if (!handlers) {
    handlers = new Set();
    state.listeners.set(type, handlers);
  }
  handlers.add(handler);

  // Return unsubscribe function
  return () => off(type, handler);
}

/**
 * Unsubscribes from animation events
 */
export function off(type: AnimationEventType, handler: EventHandler): void {
  const handlers = state.listeners.get(type);
  handlers?.delete(handler);
  if (handlers?.size === 0) {
    state.listeners.delete(type);
  }
}

/**
 * Emits an animation event
 */
export function emit(
  type: AnimationEventType, 
  detail: Omit<AnimationEventDetail, 'timestamp'>
): void {
  const event: AnimationEventDetail = {
    ...detail,
    timestamp: performance.now()
  };

  state.eventQueue.push(event);
  startProcessing();
}

/**
 * Starts event processing loop
 */
function startProcessing(): void {
  if (state.isProcessing) return;
  state.isProcessing = true;
  processEvents();
}

/**
 * Processes queued events in batches
 */
async function processEvents(): Promise<void> {
  while (state.eventQueue.length > 0) {
    const batch = state.eventQueue.splice(0, state.batchSize);
    
    for (const event of batch) {
      const handlers = state.listeners.get(event.type);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(event);
          } catch (error) {
            debug.error('Event handler error:', error);
          }
        }
      }
    }

    // Allow other tasks to run between batches
    await new Promise(resolve => setTimeout(resolve, state.processingInterval));
  }

  state.isProcessing = false;
}

/**
 * Creates a promise that resolves when an event occurs
 */
export function waitFor(
  type: AnimationEventType, 
  id?: string
): Promise<AnimationEventDetail> {
  return new Promise(resolve => {
    const handler = (detail: AnimationEventDetail) => {
      if (!id || detail.id === id) {
        off(type, handler);
        resolve(detail);
      }
    };
    on(type, handler);
  });
}

/**
 * Clears all event listeners and queued events
 */
export function clear(): void {
  state.listeners.clear();
  state.eventQueue.length = 0;
  state.isProcessing = false;
}

/**
 * Updates event processing configuration
 */
export function configure(config: { 
  readonly batchSize?: number; 
  readonly processingInterval?: number; 
}): void {
  Object.assign(state, config);
}

// Export event system utilities with more descriptive names
export {
  on as onAnimation,
  off as offAnimation,
  emit as emitAnimation,
  waitFor as waitForAnimation,
  clear as clearAnimationEvents,
  configure as configureAnimationEvents
}; 