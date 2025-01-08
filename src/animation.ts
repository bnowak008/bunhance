import type { RGB, AnimationOptions, Frame, SparkleConfig, AnimationEffectOptions } from './types';
import { hslToRgb } from './color';
import { Easing } from './easing';

// Terminal control helpers
const terminal = {
  save: '\x1B[s',
  restore: '\x1B[u',
  clear: '\x1B[2J',
  clearLine: '\x1B[2K',
  hideCursor: '\x1B[?25l',
  showCursor: '\x1B[?25h',
  moveTo: (x: number, y: number) => `\x1B[${y};${x}H`,
  up: (n: number) => `\x1B[${n}A`,
  reset: '\x1B[0m'
};

// Updated AnimationState type to match our implementation
interface AnimationState {
  frames: Frame[];
  currentFrame: number;
  isPlaying: boolean;
  lastFrameTime: number;
  fps: number;
  timer: typeof Bun.sleep | typeof setTimeout;
  buffer: Uint8Array;
  interval?: NodeJS.Timeout | null;
  options?: AnimationOptions;
  cleanup?: () => void;
}

// Pre-allocate buffers for animation frames
const frameBuffer = new Uint8Array(1024);

// Use Bun's native performance API
const now = () => performance.now();

function createAnimationState(options: AnimationOptions = {}): AnimationState {
  return {
    frames: [],
    currentFrame: 0,
    isPlaying: false,
    lastFrameTime: 0,
    fps: options.fps || 30,
    timer: typeof Bun !== 'undefined' ? Bun.sleep : setTimeout,
    buffer: frameBuffer,
    interval: null,
    options,
    cleanup: undefined
  };
}

export function start(state: AnimationState, onFrame?: (frame: Frame) => void) {
  if (state.isPlaying) return;
  state.isPlaying = true;
  state.lastFrameTime = now();

  const frameInterval = 1000 / state.fps;

  async function animate() {
    if (!state.isPlaying) return;

    const currentTime = now();
    const delta = currentTime - state.lastFrameTime;

    if (delta >= frameInterval) {
      const frame = state.frames[state.currentFrame];
      if (onFrame) onFrame(frame);

      state.currentFrame = (state.currentFrame + 1) % state.frames.length;
      state.lastFrameTime = currentTime;
    }

    // Use Bun.sleep for more precise timing
    if (typeof Bun !== 'undefined') {
      await Bun.sleep(Math.max(0, frameInterval - delta));
    } else {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, frameInterval - delta)));
    }

    if (state.isPlaying) {
      if (typeof window !== 'undefined') {
        requestAnimationFrame(animate);
      } else {
        animate();
      }
    }
  }

  animate();
}

function addFrame(state: AnimationState, text: string, color: RGB, duration: number = 1): void {
  state.frames.push({ text, color, duration });
}

function rainbow(text: string, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps });
  const { steps = 60 } = options;
  const saturation = 100;
  const lightness = 50;

  for (let i = 0; i <= steps; i++) {
    const hue = (i / steps) * 360;
    const rgb = hslToRgb(hue, saturation, lightness);
    const coloredText = `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m${text}\x1b[0m`;
    addFrame(state, coloredText, rgb);
  }

  return state;
}

function pulse(text: string, color: RGB, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps });
  const { steps = 20 } = options;
  const { minBrightness = 0.3, maxBrightness = 1.0 } = options.transform || {};

  // Pulse up
  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const brightness = minBrightness + (maxBrightness - minBrightness) * progress;
    const adjustedColor = {
      r: Math.round(color.r * brightness),
      g: Math.round(color.g * brightness),
      b: Math.round(color.b * brightness)
    };
    const coloredText = `\x1b[38;2;${adjustedColor.r};${adjustedColor.g};${adjustedColor.b}m${text}\x1b[0m`;
    addFrame(state, coloredText, adjustedColor);
  }

  // Pulse down
  for (let i = steps; i >= 0; i--) {
    const progress = i / steps;
    const brightness = minBrightness + (maxBrightness - minBrightness) * progress;
    const adjustedColor = {
      r: Math.round(color.r * brightness),
      g: Math.round(color.g * brightness),
      b: Math.round(color.b * brightness)
    };
    const coloredText = `\x1b[38;2;${adjustedColor.r};${adjustedColor.g};${adjustedColor.b}m${text}\x1b[0m`;
    addFrame(state, coloredText, adjustedColor);
  }

  return state;
}

function wave(text: string, color: RGB, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps });
  const { steps = 30, easing = Easing.easeInOutCubic } = options;
  const chars = text.split('');
  const delay = Math.floor(steps / chars.length);

  for (let step = 0; step < steps; step++) {
    let result = '';
    for (let i = 0; i < chars.length; i++) {
      const phase = ((step + (i * delay)) % steps) / steps;
      const brightness = easing(phase);
      const adjustedColor = {
        r: Math.round(color.r * brightness),
        g: Math.round(color.g * brightness),
        b: Math.round(color.b * brightness)
      };
      result += `\x1b[38;2;${adjustedColor.r};${adjustedColor.g};${adjustedColor.b}m${chars[i]}`;
    }
    addFrame(state, result + '\x1b[0m', color);
  }

  return state;
}

function type(text: string, color: RGB, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps ?? 20 });
  const { steps = text.length, easing = Easing.linear } = options;
  const chars = text.split('');

  // Save cursor position at start
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(terminal.save + terminal.hideCursor);
  }

  state.cleanup = () => {
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(terminal.showCursor + terminal.restore);
      process.stdout.write(terminal.clearLine);
      process.stdout.write(terminal.reset);
    }
  };

  for (let i = 0; i <= chars.length; i++) {
    const progress = easing(i / chars.length);
    const visibleChars = Math.floor(chars.length * progress);
    const currentText = chars.slice(0, visibleChars).join('');
    // Clear previous line and write new text
    const frame = terminal.clearLine + 
                 `\x1b[38;2;${color.r};${color.g};${color.b}m${currentText}${terminal.reset}`;
    addFrame(state, frame, color);
  }

  return state;
}

function glitch(text: string, color: RGB, intensity: number = 1, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps });
  const { steps = 30 } = options;
  const chars = text.split('');

  for (let i = 0; i < steps; i++) {
    let glitchedText = '';
    for (let j = 0; j < chars.length; j++) {
      if (Math.random() < 0.1 * intensity) {
        const glitchChar = String.fromCharCode(33 + Math.floor(Math.random() * 94));
        glitchedText += glitchChar;
      } else {
        glitchedText += chars[j];
      }
    }
    const coloredText = `\x1b[38;2;${color.r};${color.g};${color.b}m${glitchedText}\x1b[0m`;
    addFrame(state, coloredText, color);
  }

  return state;
}

function sparkle(text: string, color: RGB, config: SparkleConfig = {}): AnimationState {
  const state = createAnimationState({ fps: config.fps ?? 12 });
  const {
    chars = ['*'],
    frequency = 0.08,
    duration = 30
  } = config;

  const textChars = text.split('');
  const sparkleStates = Array(textChars.length).fill(0);
  
  for (let step = 0; step < duration; step++) {
    let result = '';
    
    for (let i = 0; i < textChars.length; i++) {
      if (Math.random() < frequency && sparkleStates[i] === 0) {
        sparkleStates[i] = 2;
      }

      if (sparkleStates[i] > 0) {
        result += `\x1b[38;2;255;255;255m${chars[0]}`;
        sparkleStates[i]--;
      } else {
        result += `\x1b[38;2;${color.r};${color.g};${color.b}m${textChars[i]}`;
      }
    }
    result += '\x1b[0m';
    addFrame(state, result, color);
  }

  return state;
}

function zoom(text: string, color: RGB, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps });
  const { steps = 30, easing = Easing.easeOutElastic } = options;
  const { scale = 2 } = options.transform || {};

  for (let i = 0; i <= steps; i++) {
    const progress = easing(i / steps);
    const currentScale = 1 + (scale - 1) * progress;
    const spaces = ' '.repeat(Math.floor((currentScale - 1) * text.length / 2));
    const scaledText = spaces + text + spaces;
    const coloredText = `\x1b[38;2;${color.r};${color.g};${color.b}m${scaledText}\x1b[0m`;
    addFrame(state, coloredText, color);
  }

  return state;
}

function rotate(text: string, color: RGB, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps });
  const { steps = 30, easing = Easing.easeOutElastic } = options;
  const chars = ['/', '─', '\\', '|'];

  for (let i = 0; i <= steps; i++) {
    const progress = easing(i / steps);
    const rotationIndex = Math.floor(progress * chars.length) % chars.length;
    const rotatedText = text + ' ' + chars[rotationIndex];
    const coloredText = `\x1b[38;2;${color.r};${color.g};${color.b}m${rotatedText}\x1b[0m`;
    addFrame(state, coloredText, color);
  }

  return state;
}

function slide(text: string, color: RGB, options: AnimationEffectOptions = {}): AnimationState {
  const state = createAnimationState({ fps: options.fps });
  const { steps = 30, easing = Easing.easeOutCubic } = options;
  const { direction = 'left', maxWidth = 40 } = options.transform || {};

  // Calculate the maximum offset to prevent wrapping
  const maxOffset = Math.min(maxWidth - text.length, maxWidth);

  for (let i = 0; i <= steps; i++) {
    const progress = easing(i / steps);
    let offset: number;

    switch (direction) {
      case 'right':
        offset = Math.floor(progress * maxOffset);
        break;
      case 'left':
        offset = Math.floor((1 - progress) * maxOffset);
        break;
      default:
        offset = 0;
    }

    const spaces = ' '.repeat(Math.max(0, offset));
    const coloredText = `\x1b[38;2;${color.r};${color.g};${color.b}m${spaces}${text}\x1b[0m`;
    addFrame(state, coloredText, color);
  }

  return state;
}

let currentAnimation: AnimationState | null = null;

function stop(state: AnimationState): void {
  state.isPlaying = false;
  
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
  
  if (currentAnimation === state) {
    if (state.cleanup) {
      state.cleanup();
    } else {
      const lastFrame = state.frames[state.frames.length - 1];
      process.stdout.write(terminal.restore + lastFrame.text + terminal.reset);
      process.stdout.write(terminal.showCursor);
    }
    currentAnimation = null;
  }
}

function chain(states: AnimationState[]): AnimationState {
  if (!states.length) {
    return createAnimationState({});
  }

  const firstState = states[0];
  const combinedState = createAnimationState({
    ...firstState.options,
    fps: firstState.fps
  });
  
  states.forEach(state => {
    state.frames.forEach(frame => {
      addFrame(combinedState, frame.text, frame.color, frame.duration);
    });
  });

  // Combine cleanup functions
  combinedState.cleanup = () => {
    states.forEach(state => state.cleanup?.());
  };

  return combinedState;
}

export {
  rainbow,
  pulse,
  wave,
  type as typeAnim,
  glitch,
  sparkle,
  zoom,
  rotate,
  slide,
  stop,
  chain,
  createAnimationState
};