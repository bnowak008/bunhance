import type { RGB, AnimationEffectOptions, AnimationState, AnimationInstance } from "../types";
import { rgb, ANSI_CODES } from "../styles/ansi";
import { hslToRgb } from "../color";
import { debug } from '../utils/debug';
import { buffers } from '../core/buffer';
import { easingFunctions } from './easing';
import { updateMetrics } from '../performance';
import { emitAnimation as emit } from './events';

/**
 * Pre-allocated buffers using Bun's optimized allocation
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Use Bun's optimized buffer allocation
const colorBuffer = new Uint8Array(3);
const frameBuffer = new Uint8Array(1024); // Initial size

/**
 * Animation state management with performance tracking
 */
const state = {
  isRunning: false,
  frameId: null as number | ReturnType<typeof setTimeout> | null,
  activeAnimations: new Map<string, AnimationInstance>(),
  queue: [] as AnimationInstance[],
  maxConcurrent: 10,
  
  // Performance tracking
  lastFrameTime: 0,
  totalFrames: 0,
  frameTimeAccumulator: 0
};

/**
 * Creates a new animation instance
 */
function createAnimationInstance(
  id: string,
  text: string,
  color: RGB,
  options: Required<AnimationEffectOptions>,
  renderFrame: (progress: number, text: string, color: RGB, buffer: Uint8Array) => string,
  onComplete?: () => void
): AnimationInstance {
  const bufferSize = calculateBufferSize(text);
  const frameBuffer = buffers.acquire(bufferSize);
  
  // Pre-allocate color buffer for performance
  const colorBuffer = new Uint8Array(3);
  
  return {
    id,
    text,
    color,
    options,
    renderFrame: (progress: number, text: string, color: RGB, buffer: Uint8Array) => {
      // Optimize color calculations
      colorBuffer[0] = color.r;
      colorBuffer[1] = color.g;
      colorBuffer[2] = color.b;
      
      return renderFrame(progress, text, { 
        r: colorBuffer[0], 
        g: colorBuffer[1], 
        b: colorBuffer[2] 
      }, buffer);
    },
    onComplete: () => {
      buffers.release(frameBuffer);
      onComplete?.();
    },
    state: {
      id,
      isRunning: false,
      startTime: 0,
      currentFrame: 0,
      frameBuffer,
      state: 'pending'
    },
    startTime: 0,
    progress: 0,
    frameBuffer
  };
}

/**
 * Calculates required buffer size for animation
 */
function calculateBufferSize(text: string): number {
  // More precise buffer calculation based on ANSI codes and text length
  const baseSize = text.length * 12; // Base size for characters
  const ansiOverhead = 50; // Space for ANSI codes
  const safetyMargin = Math.ceil(baseSize * 0.2); // 20% safety margin
  
  return baseSize + ansiOverhead + safetyMargin;
}

/**
 * Updates animation frame with performance monitoring
 */
function updateAnimation(animation: AnimationInstance, currentTime: number): boolean {
  const startTime = performance.now();
  
  try {
    if (animation.state.state === 'paused') return true;
    
    const elapsed = currentTime - animation.startTime;
    
    if (elapsed < animation.options.delay) {
      return true;
    }

    const activeTime = elapsed - animation.options.delay;
    const iteration = Math.floor(activeTime / animation.options.duration);
    
    if (iteration >= animation.options.iterations && animation.options.iterations > 0) {
      completeAnimation(animation);
      return false;
    }

    // Optimize progress calculation
    const rawProgress = (activeTime % animation.options.duration) / animation.options.duration;
    animation.progress = animation.options.easing(
      Math.max(0, Math.min(1, rawProgress)) // Clamp progress between 0 and 1
    );
    
    const frame = animation.renderFrame(
      animation.progress,
      animation.text,
      animation.color,
      animation.frameBuffer
    );
    
    // Use Bun's optimized stdout with minimal allocations
    Bun.write(Bun.stdout, encoder.encode(`\r${frame}`));
    
    // Update performance metrics
    const frameTime = performance.now() - startTime;
    state.frameTimeAccumulator += frameTime;
    state.totalFrames++;
    
    if (state.totalFrames % 60 === 0) {
      updateMetrics({
        frameTime: state.frameTimeAccumulator / 60,
        bufferSize: animation.frameBuffer.length,
        currentAnimations: state.activeAnimations.size,
        queueSize: state.queue.length,
        fps: 60,
        droppedFrames: 0
      });
      state.frameTimeAccumulator = 0;
    }
    
    return true;
  } catch (error) {
    debug.error(`Animation frame error:`, error);
    return false;
  }
}

/**
 * Stops the animation loop and cleans up
 */
function stopAnimationLoop(): void {
  if (state.frameId) {
    clearTimeout(state.frameId);
    state.frameId = null;
  }
  state.isRunning = false;
}

/**
 * Optimized animation loop using Bun's scheduler
 */
function startAnimationLoop(): void {
  if (state.isRunning) return;
  
  state.isRunning = true;
  let lastTime = performance.now();
  
  function loop() {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    try {
      processQueue();

      for (const [id, animation] of state.activeAnimations) {
        const isActive = updateAnimation(animation, currentTime);
        if (!isActive) {
          state.activeAnimations.delete(id);
          processQueue();
        }
      }

      if (state.activeAnimations.size > 0) {
        // Use Bun's scheduler for better timing
        state.frameId = setTimeout(loop, Math.max(0, 16 - deltaTime));
      } else {
        stopAnimationLoop();
      }
    } catch (error) {
      debug.error(`Animation loop error:`, error);
      stopAnimationLoop();
    }
  }

  loop();
}

/**
 * Queue management
 */
function processQueue(): void {
  while (
    state.queue.length > 0 && 
    state.activeAnimations.size < state.maxConcurrent
  ) {
    const next = state.queue.shift();
    if (next) {
      next.startTime = performance.now();
      next.state.state = 'running';
      state.activeAnimations.set(next.id, next);
    }
  }
}

/**
 * Animation lifecycle management
 */
function completeAnimation(animation: AnimationInstance): void {
  animation.state.state = 'completed';
  process.stdout.write('\r' + ' '.repeat(animation.text.length) + '\r');
  animation.onComplete?.();
}

/**
 * Creates and starts an animation
 */
function startAnimation(
  text: string,
  color: RGB,
  options: AnimationEffectOptions,
  renderFrame: (progress: number, text: string, color: RGB, buffer: Uint8Array) => string
): AnimationState {
  const id = Math.random().toString(36).slice(2);
  const fullOptions: Required<AnimationEffectOptions> = {
    fps: 60,
    duration: 3000,
    delay: 0,
    easing: easingFunctions.linear,
    iterations: Infinity,
    repeat: 0,
    yoyo: false,
    onStart: () => {},
    onComplete: () => {},
    onUpdate: () => {},
    steps: 30,
    transform: {
      direction: 'right',
      maxWidth: 100,
      minBrightness: 0,
      maxBrightness: 1
    },
    ...options
  };

  const animation = createAnimationInstance(
    id,
    text,
    color,
    fullOptions,
    renderFrame,
    () => {}
  );

  if (state.activeAnimations.size < state.maxConcurrent) {
    animation.startTime = performance.now();
    animation.state.state = 'running';
    state.activeAnimations.set(id, animation);
    startAnimationLoop();
  } else {
    state.queue.push(animation);
  }

  return animation.state;
}

/**
 * Animation control functions
 */
export function start(animState: AnimationState): void {
  const animation = Array.from(state.activeAnimations.values())
    .find(a => a.state.id === animState.id);
  
  if (animation) {
    animation.state.state = 'running';
    if (!state.isRunning) {
      startAnimationLoop();
    }
  }
}

export function stop(animState?: AnimationState): void {
  if (animState) {
    const animation = Array.from(state.activeAnimations.values())
      .find(a => a.state.id === animState.id);
    if (animation) {
      animation.state.state = 'completed';
      state.activeAnimations.delete(animation.id);
    }
  } else {
    state.queue = [];
    state.activeAnimations.clear();
    stopAnimationLoop();
  }
}

export function pause(id?: string): void {
  if (id) {
    const animation = state.activeAnimations.get(id);
    if (animation) animation.state.state = 'paused';
  } else {
    for (const animation of state.activeAnimations.values()) {
      animation.state.state = 'paused';
    }
  }
}

export function resume(id?: string): void {
  if (id) {
    const animation = state.activeAnimations.get(id);
    if (animation && animation.state.state === 'paused') {
      animation.state.state = 'running';
    }
  } else {
    for (const animation of state.activeAnimations.values()) {
      if (animation.state.state === 'paused') {
        animation.state.state = 'running';
      }
    }
  }
  
  if (!state.isRunning) {
    startAnimationLoop();
  }
}

/**
 * Animation Effects Implementation
 */

/**
 * Rainbow animation effect
 * Creates a moving rainbow pattern across the text
 */
export function rainbow(text: string, options?: AnimationEffectOptions): AnimationState {
  return startAnimation(text, { r: 0, g: 0, b: 0 }, options ?? {}, (progress, text, _, buffer) => {
    let offset = 0;
    const baseHue = progress * 360;
    
    for (let i = 0; i < text.length; i++) {
      const hue = (baseHue + (i * 30)) % 360;
      const { r, g, b } = hslToRgb(hue, 100, 50);
      
      const colorCode = rgb(r, g, b);
      const colorBytes = encoder.encode(colorCode);
      buffer.set(colorBytes, offset);
      offset += colorBytes.length;
      
      const charBytes = encoder.encode(text[i]);
      buffer.set(charBytes, offset);
      offset += charBytes.length;
    }
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Pulse animation effect
 * Creates a pulsing effect by varying the brightness of the text color
 */
export function pulse(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState {
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    const pulseIntensity = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
    
    // Calculate pulsed color
    const r = Math.floor(color.r * pulseIntensity);
    const g = Math.floor(color.g * pulseIntensity);
    const b = Math.floor(color.b * pulseIntensity);
    
    // Apply color to entire text
    const colorCode = rgb(r, g, b);
    const colorBytes = encoder.encode(colorCode);
    buffer.set(colorBytes, offset);
    offset += colorBytes.length;
    
    // Write text
    const textBytes = encoder.encode(text);
    buffer.set(textBytes, offset);
    offset += textBytes.length;
    
    // Reset color
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Glitch animation effect
 * Creates a glitchy text effect with random character replacements
 */
export function glitch(
  text: string, 
  color: RGB, 
  intensity: number = 0.3,
  options?: AnimationEffectOptions
): AnimationState {
  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    const glitchProbability = Math.sin(progress * Math.PI * 2) * intensity;
    
    const colorCode = rgb(color.r, color.g, color.b);
    const colorBytes = encoder.encode(colorCode);
    buffer.set(colorBytes, offset);
    offset += colorBytes.length;
    
    for (let i = 0; i < text.length; i++) {
      const char = Math.random() < glitchProbability
        ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
        : text[i];
        
      const charBytes = encoder.encode(char);
      buffer.set(charBytes, offset);
      offset += charBytes.length;
    }
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Sparkle animation effect
 * Creates a sparkling effect with random characters lighting up
 */
export function sparkle(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState {
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    const sparkleIntensity = Math.sin(progress * Math.PI * 2) * 0.5 + 0.5;
    
    for (let i = 0; i < text.length; i++) {
      const shouldSparkle = Math.random() < sparkleIntensity * 0.3;
      
      if (shouldSparkle) {
        const brightness = Math.min(255, color.r + 100);
        const sparkleCode = rgb(brightness, brightness, brightness);
        const sparkleBytes = encoder.encode(sparkleCode);
        buffer.set(sparkleBytes, offset);
        offset += sparkleBytes.length;
      } else {
        const colorCode = rgb(color.r, color.g, color.b);
        const colorBytes = encoder.encode(colorCode);
        buffer.set(colorBytes, offset);
        offset += colorBytes.length;
      }
      
      const charBytes = encoder.encode(text[i]);
      buffer.set(charBytes, offset);
      offset += charBytes.length;
    }
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Type animation effect
 * Creates a typewriter-style animation
 */
export function type(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState {
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    const visibleLength = Math.floor(text.length * progress);
    
    const colorCode = rgb(color.r, color.g, color.b);
    const colorBytes = encoder.encode(colorCode);
    buffer.set(colorBytes, offset);
    offset += colorBytes.length;
    
    // Visible characters
    const visibleText = text.slice(0, visibleLength);
    const visibleBytes = encoder.encode(visibleText);
    buffer.set(visibleBytes, offset);
    offset += visibleBytes.length;
    
    // Cursor effect
    if (visibleLength < text.length) {
      const cursorBytes = encoder.encode('▎');
      buffer.set(cursorBytes, offset);
      offset += cursorBytes.length;
    }
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Zoom animation effect
 * Creates a scaling effect using different Unicode block characters
 */
export function zoom(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState {
  const zoomChars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    const zoomIndex = Math.floor(progress * (zoomChars.length - 1));
    const zoomChar = zoomChars[zoomIndex];
    
    const colorCode = rgb(color.r, color.g, color.b);
    const colorBytes = encoder.encode(colorCode);
    buffer.set(colorBytes, offset);
    offset += colorBytes.length;
    
    for (const char of text) {
      const charBytes = encoder.encode(char === ' ' ? char : zoomChar);
      buffer.set(charBytes, offset);
      offset += charBytes.length;
    }
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Slide animation effect
 * Creates a sliding text effect
 */
export function slide(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState {
  const padding = ' '.repeat(text.length);
  
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    const position = Math.floor((1 - progress) * text.length);
    
    const colorCode = rgb(color.r, color.g, color.b);
    const colorBytes = encoder.encode(colorCode);
    buffer.set(colorBytes, offset);
    offset += colorBytes.length;
    
    // Left padding
    const leftPadBytes = encoder.encode(padding.slice(0, position));
    buffer.set(leftPadBytes, offset);
    offset += leftPadBytes.length;
    
    // Text
    const textBytes = encoder.encode(text);
    buffer.set(textBytes, offset);
    offset += textBytes.length;
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Rotate animation effect
 * Creates a rotating text effect using Unicode box-drawing characters
 */
export function rotate(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState {
  const rotationChars = ['┃', '┏', '━', '┓', '┃', '┛', '━', '┗'];
  
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    const rotationIndex = Math.floor(progress * rotationChars.length) % rotationChars.length;
    
    const colorCode = rgb(color.r, color.g, color.b);
    const colorBytes = encoder.encode(colorCode);
    buffer.set(colorBytes, offset);
    offset += colorBytes.length;
    
    for (const char of text) {
      const rotChar = char === ' ' ? char : rotationChars[rotationIndex];
      const charBytes = encoder.encode(rotChar);
      buffer.set(charBytes, offset);
      offset += charBytes.length;
    }
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

/**
 * Wave animation effect
 * Creates a wave-like movement through the text
 */
export function wave(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState {
  return startAnimation(text, color, options ?? {}, (progress, text, color, buffer) => {
    let offset = 0;
    
    for (let i = 0; i < text.length; i++) {
      const waveOffset = Math.sin((progress * Math.PI * 2) + (i * 0.3)) * 0.5 + 0.5;
      const intensity = Math.floor(waveOffset * 255);
      
      const r = Math.min(255, Math.floor(color.r * (0.5 + waveOffset * 0.5)));
      const g = Math.min(255, Math.floor(color.g * (0.5 + waveOffset * 0.5)));
      const b = Math.min(255, Math.floor(color.b * (0.5 + waveOffset * 0.5)));
      
      const colorCode = rgb(r, g, b);
      const colorBytes = encoder.encode(colorCode);
      buffer.set(colorBytes, offset);
      offset += colorBytes.length;
      
      const charBytes = encoder.encode(text[i]);
      buffer.set(charBytes, offset);
      offset += charBytes.length;
    }
    
    const resetBytes = encoder.encode(ANSI_CODES.reset);
    buffer.set(resetBytes, offset);
    offset += resetBytes.length;
    
    return decoder.decode(buffer.subarray(0, offset));
  });
}

// Add synchronization support
export function sync(groupId: string, ...animations: Promise<void>[]): Promise<void> {
  const id = Math.random().toString(36).slice(2);
  animations.forEach(anim => {
    emit('sync', { groupId, id, type: 'sync' });
  });
  
  return Promise.all(animations)
    .then(() => void 0)
    .finally(() => {
      emit('sync-complete', { groupId, id, type: 'sync-complete' });
    });
}

// Add cleanup function
export function cleanup(): void {
  stop();
  buffers.cleanupAll();
}