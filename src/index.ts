import { ANSI_CODES, rgb, bgRgb, color256, bgColor256 } from "./styles/ansi";
import { generateGradient } from "./color/gradient";
import { getStyle, setStyle } from "./core/cache";
import { validateRGB, validate256Color, validateBufferSize } from "./utils/validation";
import type { StyleConfig, StyleFunction, GradientColor, RGB, RGBTuple, AnimationEffectOptions } from "./types";
import { hslToRgb } from "./color";
import { rainbow, pulse, wave, type, glitch, sparkle, zoom, rotate, slide, start, stop } from "./animation";
import { createBlock, createBgBlock, createBgColorBlock, createGradientBlock } from "./styles/blocks";

/**
 * Constants for buffer management
 */
const INITIAL_BUFFER_SIZE = 1024;
const MAX_BUFFER_SIZE = 1024 * 1024 * 10; // 10MB maximum buffer size

/**
 * Creates a style function with internal state management and buffer optimization.
 * The returned function can be used to apply ANSI styles to text strings.
 * 
 * @returns A StyleFunction that can be used to apply various text styles
 */
function createStyleFunction(): StyleFunction {
  // Pre-allocate encoders and buffers for performance
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const resetBytes = encoder.encode(ANSI_CODES.reset);
  
  /**
   * Internal state management for styles and buffer allocation
   */
  const state = {
    styles: [] as string[],
    gradientColors: undefined as readonly GradientColor[] | undefined,
    buffer: new Uint8Array(INITIAL_BUFFER_SIZE),
    bufferView: new DataView(new ArrayBuffer(INITIAL_BUFFER_SIZE))
  };

  /**
   * Ensures the internal buffer has sufficient capacity.
   * Grows the buffer if needed, with size limits and validation.
   * 
   * @param needed - The required buffer size in bytes
   * @throws Error if buffer allocation would exceed maximum size
   */
  function ensureBufferSize(needed: number) {
    if (state.buffer.length < needed) {
      const newSize = Math.max(needed, state.buffer.length * 2);
      validateBufferSize(newSize, MAX_BUFFER_SIZE);
      
      try {
        state.buffer = new Uint8Array(newSize);
        state.bufferView = new DataView(state.buffer.buffer);
      } catch (error: any) {
        throw new Error(`Failed to allocate buffer of size ${newSize}: ${error.message}`);
      }
    }
  }

  /**
   * Releases the current buffer and allocates a new minimum-sized buffer.
   * Useful for freeing memory after large operations.
   */
  function releaseBuffer(): void {
    state.buffer = new Uint8Array(INITIAL_BUFFER_SIZE);
    state.bufferView = new DataView(state.buffer.buffer);
  }

  /**
   * Applies the current styles to the input text.
   * Handles gradients, caching, and efficient byte operations.
   * 
   * @param text - The text to style
   * @returns The styled text string
   */
  function apply(text: string): string {
    if (state.gradientColors) {
      const result = generateGradient(state.gradientColors, text);
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
    state.buffer.set(styleBytes, 0);
    state.buffer.set(textBytes, styleBytes.length);
    state.buffer.set(resetBytes, styleBytes.length + textBytes.length);
    
    // Use subarray for exact size
    const result = decoder.decode(state.buffer.subarray(0, totalSize));
    
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
      state.styles.push(rgb(config.rgb[0], config.rgb[1], config.rgb[2]));
    }
    if (config.bgRgb) {
      state.styles.push(bgRgb(config.bgRgb[0], config.bgRgb[1], config.bgRgb[2]));
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
    if (config.reverse) state.styles.push(ANSI_CODES.inverse);
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
    validateRGB(r, g, b);
    state.styles.push(rgb(r, g, b));
    return fn;
  };

  fn.bgRgb = (r: number, g: number, b: number) => {
    validateRGB(r, g, b);
    state.styles.push(bgRgb(r, g, b));
    return fn;
  };

  fn.hsl = (h: number, s: number, l: number) => {
    const rgbColor = hslToRgb(h, s, l);
    state.styles.push(rgb(rgbColor.r, rgbColor.g, rgbColor.b));
    return fn;
  };

  fn.bgHsl = (h: number, s: number, l: number) => {
    const rgbColor = hslToRgb(h, s, l);
    state.styles.push(bgRgb(rgbColor.r, rgbColor.g, rgbColor.b));
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

  fn.gradient = (...colors: GradientColor[]) => {
    state.gradientColors = colors;
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

  // Animation control methods
  fn.start = start;
  fn.stop = stop;

  // Block creation methods
  fn.block = (width: number = 1, height: number = 1) => {
    try {
      return fn(createBlock(width, height, state.buffer));
    } catch (error) {
      releaseBuffer(); // Reset buffer on error
      throw error;
    }
  };

  fn.colorBlock = (color: RGBTuple, width: number = 1, height: number = 1) => {
    return fn.rgb(color[0], color[1], color[2]).block(width, height);
  };

  fn.bgBlock = (width: number = 1, height: number = 1) => {
    try {
      return fn.bgRgb(0, 0, 0)(createBgBlock(width, height, state.buffer));
    } catch (error) {
      releaseBuffer(); // Reset buffer on error
      throw error;
    }
  };

  fn.bgColorBlock = (color: RGBTuple, width: number = 1, height: number = 1) => {
    return fn.bgRgb(color[0], color[1], color[2])(createBgColorBlock(color, width, height));
  };

  fn.gradientBlock = (colors: GradientColor[], width: number = 1, height: number = 1) => {
    return fn.gradient(...colors)(createGradientBlock(width, height));
  };

  // Add cleanup method to the style function
  fn.cleanup = releaseBuffer;

  return fn;
}

export const bunhance = createStyleFunction();
export type { StyleConfig, StyleFunction, GradientColor, RGB };
