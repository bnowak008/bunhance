import type { 
  Animation, 
  AnimationState, 
  AnimationOptions,
  CompositeAnimation
} from '../types/animation';
import { defaultEasing } from './easing';

export const DEFAULT_FPS = 60;
export const DEFAULT_DURATION = 1000;

export type CompositionType = 'sequence' | 'parallel';

function createAnimationState(options: AnimationOptions = {}): AnimationState {
  return {
    frames: [],
    currentFrame: 0,
    isPlaying: false,
    isPaused: false,
    metrics: {
      frameCount: 0,
      frameTime: 0,
      frameDrops: 0,
      lastFrameTime: 0,
      totalDuration: options.duration ?? DEFAULT_DURATION,
      currentTime: 0,
      progress: 0
    },
    loop: options.loop ?? false,
    direction: options.direction ?? 'forward',
    easing: options.easing ?? defaultEasing,
    onComplete: options.onComplete,
    onFrame: options.onFrame,
    cleanup: () => {
      // Implemented by each animation type
    }
  };
}

function createAnimation(
  frameGenerator: (t: number) => string,
  options: AnimationOptions = {}
): Animation {
  const state = createAnimationState(options);
  let animationFrameId: number | null = null;

  function generateFrames() {
    const frameCount = Math.ceil((state.metrics.totalDuration / 1000) * DEFAULT_FPS);
    state.frames = Array.from({ length: frameCount }, (_, i) => {
      const t = state.easing(i / (frameCount - 1));
      return {
        content: frameGenerator(t),
        timestamp: (i / (frameCount - 1)) * state.metrics.totalDuration
      };
    });
  }

  function update(timestamp: number) {
    if (!state.isPlaying || state.isPaused) return;

    if (!state.metrics.lastFrameTime) {
      state.metrics.lastFrameTime = timestamp;
    }

    const deltaTime = timestamp - state.metrics.lastFrameTime;
    const frameTime = 1000 / DEFAULT_FPS;

    if (deltaTime >= frameTime) {
      const frame = state.frames[state.currentFrame];
      state.onFrame?.(frame);

      if (state.direction === 'forward' || 
         (state.direction === 'alternate' && state.currentFrame % state.frames.length < state.frames.length / 2)) {
        state.currentFrame++;
      } else {
        state.currentFrame--;
      }

      if (state.currentFrame >= state.frames.length || state.currentFrame < 0) {
        if (state.loop) {
          state.currentFrame = state.currentFrame >= state.frames.length ? 0 : state.frames.length - 1;
        } else {
          stop();
          state.onComplete?.();
          return;
        }
      }

      state.metrics.lastFrameTime = timestamp;
    }

    animationFrameId = requestAnimationFrame(update);
  }

  function start() {
    if (state.frames.length === 0) {
      generateFrames();
    }
    state.isPlaying = true;
    state.isPaused = false;
    state.currentFrame = state.direction === 'reverse' ? state.frames.length - 1 : 0;
    state.metrics.lastFrameTime = 0;
    animationFrameId = requestAnimationFrame(update);
  }

  function stop() {
    state.isPlaying = false;
    state.isPaused = false;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    state.cleanup();
  }

  function pause() {
    state.isPaused = true;
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function resume() {
    if (state.isPlaying && state.isPaused) {
      state.isPaused = false;
      state.metrics.lastFrameTime = 0;
      animationFrameId = requestAnimationFrame(update);
    }
  }

  function reset() {
    state.currentFrame = state.direction === 'reverse' ? state.frames.length - 1 : 0;
    state.metrics.lastFrameTime = 0;
  }

  return {
    state,
    start,
    stop,
    pause,
    resume,
    reset
  };
}

export function composeAnimations(
  animations: Animation[],
  type: CompositionType,
  options: AnimationOptions = {}
): CompositeAnimation {
  const state = createAnimationState({
    ...options,
    duration: type === 'sequence' 
      ? animations.reduce((sum, anim) => sum + anim.state.metrics.totalDuration, 0)
      : Math.max(...animations.map(anim => anim.state.metrics.totalDuration))
  });

  function start() {
    state.isPlaying = true;
    if (type === 'sequence') {
      startSequence(animations, state);
    } else {
      startParallel(animations, state);
    }
  }

  function stop() {
    state.isPlaying = false;
    animations.forEach(anim => anim.stop());
  }

  function pause() {
    state.isPaused = true;
    animations.forEach(anim => anim.pause());
  }

  function resume() {
    if (state.isPlaying && state.isPaused) {
      state.isPaused = false;
      animations.forEach(anim => anim.resume());
    }
  }

  return {
    state,
    animations,
    type,
    start,
    stop,
    pause,
    resume,
    reset: () => animations.forEach(anim => anim.reset())
  };
}

export async function startSequence(animations: Animation[], state: AnimationState) {
  for (const anim of animations) {
    if (!state.isPlaying) break;
    anim.start();
    await new Promise(resolve => {
      const complete = () => {
        anim.stop();
        resolve(null);
      };
      anim.state.onComplete = complete;
    });
  }
  state.onComplete?.();
}

export function startParallel(animations: Animation[], state: AnimationState) {
  let completed = 0;
  animations.forEach(anim => {
    anim.state.onComplete = () => {
      completed++;
      if (completed === animations.length) {
        state.onComplete?.();
      }
    };
    anim.start();
  });
}

export { createAnimation, createAnimationState };