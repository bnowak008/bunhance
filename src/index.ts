import { ANSI_CODES, rgb, bgRgb, color256, bgColor256 } from "./core/ansi";
import { createGradient } from "./styles/gradient";
import { getStyle, setStyle } from "./core/cache";
import { validateRGB, validate256Color } from "./core/validation";
import type { 
  StyleConfig, 
  StyleFunction, 
  ANSICode, 
  GradientColor, 
  RGB, 
  RGBTuple, 
  AnimationEffectOptions,
  GradientOptions,
} from "./types";
import { hslToRgb } from "./styles/color";
import { 
  rainbow, 
  pulse, 
  wave, 
  type, 
  glitch, 
  sparkle, 
  zoom, 
  rotate, 
  slide
} from "./animation/effects";
import { 
  createScreen, 
  startScreen, 
  stopScreen, 
  setCell 
} from './animation/manager';
import { 
  type UnifiedBuffer, 
  acquireBuffer, 
  releaseBuffer,
  createBufferManager
} from './core/buffer';
import {
  composeAnimations,
} from './animation/engine';
import {
  transition
} from './animation/effects';
import type { Animation } from './types/animation';

// Add new color handling functions
function handleRGBColor(state: StyleState, r: number, g: number, b: number, isBackground = false): void {
  validateRGB(r, g, b);
  state.styles.push(isBackground ? bgRgb(r, g, b) : rgb(r, g, b));
}

function handleHSLColor(state: StyleState, h: number, s: number, l: number, isBackground = false): void {
  const rgbColor = hslToRgb(h, s, l);
  handleRGBColor(state, rgbColor.r, rgbColor.g, rgbColor.b, isBackground);
}

// Add type for state to improve type safety
type StyleState = {
  styles: string[];
  gradientColors: readonly GradientColor[] | undefined;
  gradientOptions?: GradientOptions;
  buffer: UnifiedBuffer;
};

function createStyleFunction(): StyleFunction {
  // Use static encoder/decoder for better performance
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const bufferManager = createBufferManager();
  const state: StyleState = {
    styles: [],
    gradientColors: undefined,
    buffer: acquireBuffer(bufferManager, 'raw', 1024, 1)
  };

  // Update cleanup
  const cleanup = () => {
    releaseBuffer(bufferManager, state.buffer);
    bufferManager.dispose();
  };

  // Add cleanup to window unload
  if (typeof window !== 'undefined') {
    window.addEventListener('unload', cleanup);
  }

  // Pre-allocate common buffers for better performance
  const resetBytes = encoder.encode(ANSI_CODES.reset);
  const spaceBytes = encoder.encode(' ');
  const blockBytes = encoder.encode('█');
  const newlineBytes = encoder.encode(Bun.env.OS === 'windows' ? '\r\n' : '\n');
  
  // Helper function to ensure buffer size
  function ensureBufferSize(needed: number) {
    if ((state.buffer.data as Uint8Array).length < needed) {
      releaseBuffer(bufferManager, state.buffer);
      state.buffer = acquireBuffer(bufferManager, 'raw', needed, 1);
    }
  }

  function apply(text: string): string {
    if (state.gradientColors) {
      const result = createGradient(text, state.gradientColors);
      state.gradientColors = undefined;
      state.styles = [];
      return result;
    }

    const cached = getStyle(state.styles, text);
    if (cached) {
      state.styles = [];
      return cached;
    }

    // Use Bun's optimized string concatenation
    const styleString = state.styles.join('');
    const styleBytes = encoder.encode(styleString);
    const textBytes = encoder.encode(text);
    
    // Calculate total size needed
    const totalSize = styleBytes.length + textBytes.length + resetBytes.length;
    ensureBufferSize(totalSize);
    
    // Copy bytes efficiently
    const rawBuffer = state.buffer.data as Uint8Array;
    rawBuffer.set(styleBytes, 0);
    rawBuffer.set(textBytes, styleBytes.length);
    rawBuffer.set(resetBytes, styleBytes.length + textBytes.length);
    
    // Use subarray for exact size
    const result = decoder.decode(rawBuffer.subarray(0, totalSize));
    
    setStyle(state.styles, text, result);
    state.styles = [];
    return result;
  }

  const fn = function(input: string | StyleConfig): string {
    if (typeof input === 'string') {
      return apply(input);
    }
    return applyConfig(input);
  } as StyleFunction;

  function applyConfig(config: StyleConfig): string {
    state.styles = [];
    state.gradientColors = undefined;

    if (config.color && config.color in ANSI_CODES) {
      state.styles.push(ANSI_CODES[config.color as keyof typeof ANSI_CODES]);
    }
    if (config.rgb) {
      handleRGBColor(state, config.rgb[0], config.rgb[1], config.rgb[2]);
    }
    if (config.bgRgb) {
      handleRGBColor(state, config.bgRgb[0], config.bgRgb[1], config.bgRgb[2], true);
    }
    if (config.hsl) {
      handleHSLColor(state, config.hsl[0], config.hsl[1], config.hsl[2]);
    }
    if (config.bgHsl) {
      handleHSLColor(state, config.bgHsl[0], config.bgHsl[1], config.bgHsl[2], true);
    }
    if (config.color256 !== undefined) {
      state.styles.push(color256(config.color256));
    }
    if (config.bgColor256 !== undefined) {
      state.styles.push(bgColor256(config.bgColor256));
    }

    // Modifiers
    if (config.bold) state.styles.push(ANSI_CODES.bold);
    if (config.italic) state.styles.push(ANSI_CODES.italic);
    if (config.underline) state.styles.push(ANSI_CODES.underline);
    if (config.dim) state.styles.push(ANSI_CODES.dim);
    if (config.blink) state.styles.push(ANSI_CODES.blink);
    if (config.inverse) state.styles.push(ANSI_CODES.inverse);
    if (config.hidden) state.styles.push(ANSI_CODES.hidden);
    if (config.strikethrough) state.styles.push(ANSI_CODES.strikethrough);

    return apply(config.text);
  }

  // Style methods
  Object.keys(ANSI_CODES).forEach(key => {
    Object.defineProperty(fn, key, {
      get() {
        if (key === 'reset') {
          state.styles = [];
          state.gradientColors = undefined;
          return fn;
        }
        state.styles.push(ANSI_CODES[key as keyof typeof ANSI_CODES]);
        return fn;
      }
    });
  });

  // Color methods
  fn.rgb = (r: number, g: number, b: number) => {
    handleRGBColor(state, r, g, b);
    return fn;
  };

  fn.bgRgb = (r: number, g: number, b: number) => {
    handleRGBColor(state, r, g, b, true);
    return fn;
  };

  fn.hsl = (h: number, s: number, l: number) => {
    handleHSLColor(state, h, s, l);
    return fn;
  };

  fn.bgHsl = (h: number, s: number, l: number) => {
    handleHSLColor(state, h, s, l, true);
    return fn;
  };

  fn.color256 = (code: number) => {
    validate256Color(code);
    state.styles.push(color256(code));
    return fn;
  };

  fn.bgColor256 = (code: number) => {
    validate256Color(code);
    state.styles.push(bgColor256(code));
    return fn;
  };

  fn.gradient = (colors: GradientColor[], options?: GradientOptions) => {
    state.gradientColors = colors;
    state.gradientOptions = options;
    return fn;
  };

  // Animation methods
  fn.rainbow = (text: string, options?: AnimationEffectOptions) => {
    return rainbow(text, options);
  };

  fn.pulse = (text: string, color: RGB, options?: AnimationEffectOptions) => {
    return pulse(text, color, options);
  };

  fn.wave = (text: string, color: RGB, options?: AnimationEffectOptions) => {
    return wave(text, color, options);
  };

  fn.type = (text: string, color: RGB, options?: AnimationEffectOptions) => {
    return type(text, color, options);
  };

  fn.glitch = (text: string, color: RGB, intensity?: number, options?: AnimationEffectOptions) => {
    return glitch(text, color, intensity, options);
  };

  fn.sparkle = (text: string, color: RGB, options?: AnimationEffectOptions) => {
    return sparkle(text, color, options);
  };

  fn.zoom = (text: string, color: RGB, options?: AnimationEffectOptions) => {
    return zoom(text, color, options);
  };

  fn.rotate = (text: string, color: RGB, options?: AnimationEffectOptions) => {
    return rotate(text, color, options);
  };

  fn.slide = (text: string, color: RGB, options?: AnimationEffectOptions) => {
    return slide(text, color, options);
  };

  // Block creation methods
  fn.block = (width: number = 1, height: number = 1) => {
    const buffer = acquireBuffer(bufferManager, 'raw', width * blockBytes.length + (height - 1), height);
    const rawBuffer = buffer.data as Uint8Array;
    
    try {
      // Create first line
      for (let i = 0; i < width; i++) {
        rawBuffer.set(blockBytes, i * blockBytes.length);
      }
      
      // Copy first line to other lines
      const firstLine = rawBuffer.subarray(0, width * blockBytes.length);
      let offset = width * blockBytes.length;
      
      for (let i = 1; i < height; i++) {
        rawBuffer.set(newlineBytes, offset);
        offset += newlineBytes.length;
        rawBuffer.set(firstLine, offset);
        offset += firstLine.length;
      }
      
      const result = decoder.decode(rawBuffer.subarray(0, offset));
      releaseBuffer(bufferManager, buffer);
      return fn(result);
    } catch (error) {
      releaseBuffer(bufferManager, buffer);
      throw error;
    }
  };

  fn.colorBlock = (color: RGBTuple, width: number = 1, height: number = 1) => {
    return fn.rgb(color[0], color[1], color[2]).block(width, height);
  };

  fn.bgBlock = (width: number = 1, height: number = 1) => {
    const buffer = acquireBuffer(bufferManager, 'raw', width * spaceBytes.length + (height - 1), height);
    const rawBuffer = buffer.data as Uint8Array;
    
    try {
      // Create first line
      for (let i = 0; i < width; i++) {
        rawBuffer.set(spaceBytes, i * spaceBytes.length);
      }
      
      // Copy first line to other lines
      const firstLine = rawBuffer.subarray(0, width * spaceBytes.length);
      let offset = width * spaceBytes.length;
      
      for (let i = 1; i < height; i++) {
        rawBuffer.set(newlineBytes, offset);
        offset += newlineBytes.length;
        rawBuffer.set(firstLine, offset);
        offset += firstLine.length;
      }
      
      const result = decoder.decode(rawBuffer.subarray(0, offset));
      releaseBuffer(bufferManager, buffer);
      return fn.bgRgb(0, 0, 0)(result);
    } catch (error) {
      releaseBuffer(bufferManager, buffer);
      throw error;
    }
  };

  fn.bgColorBlock = (color: RGBTuple, width: number = 1, height: number = 1) => {
    const buffer = acquireBuffer(bufferManager, 'raw', width * spaceBytes.length + (height - 1), height);
    const rawBuffer = buffer.data as Uint8Array;
    
    try {
      // Create first line
      for (let i = 0; i < width; i++) {
        rawBuffer.set(spaceBytes, i * spaceBytes.length);
      }
      
      const line = decoder.decode(rawBuffer.subarray(0, width * spaceBytes.length));
      const lines = Array(height).fill(line);
      
      releaseBuffer(bufferManager, buffer);
      return fn.bgRgb(color[0], color[1], color[2])(lines.join(Bun.env.OS === 'windows' ? '\r\n' : '\n'));
    } catch (error) {
      releaseBuffer(bufferManager, buffer);
      throw error;
    }
  };

  fn.gradientBlock = (
    colors: GradientColor[], 
    width: number = 1, 
    height: number = 1,
    options?: GradientOptions
  ) => {
    const blockChar = '█';
    const line = blockChar.repeat(width);
    const lines = Array(height).fill(line);
    
    return fn.gradient(colors, {
      direction: 'horizontal',
      ...options
    })(lines.join(Bun.env.OS === 'windows' ? '\r\n' : '\n'));
  };

  // Export animation functions and manager
  fn.animations = {
    create: (width?: number, height?: number) => createScreen({ width: width || 80, height: height || 24 }),
    start: startScreen,
    stop: stopScreen,
    setCell
  };

  fn.compose = (animations: Animation[], type: 'sequence' | 'parallel') => 
    composeAnimations(animations, type);
    
  fn.transition = (from: string, to: string, color: RGB) => 
    transition(from, to, color);

  return fn;
}

export const bunhance = createStyleFunction();
export type { StyleConfig, StyleFunction, ANSICode, GradientColor, RGB };
export { composeAnimations } from './animation/engine';
export { transition } from './animation/effects';
export type { AnimationStateMetrics } from './types/animation';
