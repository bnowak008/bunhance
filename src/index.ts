import { ANSI_CODES, rgb, bgRgb, color256, bgColor256 } from "./ansi";
import { generateGradient } from "./gradient";
import { getStyle, setStyle } from "./cache";
import { validateRGB, validate256Color } from "./validation";
import type { StyleConfig, StyleFunction, ANSICode, GradientColor, RGB, RGBTuple, AnimationEffectOptions } from "./types";
import { hslToRgb } from "./color";
import { rainbow, pulse, wave, typeAnim, glitch, sparkle, zoom, rotate, slide, start, stop } from "./animation";

function createStyleFunction(): StyleFunction {
  // Use static encoder/decoder for better performance
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  // Pre-allocate common buffers for better performance
  const resetBytes = encoder.encode(ANSI_CODES.reset);
  const spaceBytes = encoder.encode(' ');
  const blockBytes = encoder.encode('█');
  const newlineBytes = encoder.encode(Bun.env.OS === 'windows' ? '\r\n' : '\n');
  
  const state = {
    styles: [] as string[],
    gradientColors: undefined as readonly GradientColor[] | undefined,
    // Pre-allocate a buffer for string operations
    buffer: new Uint8Array(1024), // Initial size, will grow if needed
    bufferView: new DataView(new ArrayBuffer(1024))
  };

  // Helper function to ensure buffer size
  function ensureBufferSize(needed: number) {
    if (state.buffer.length < needed) {
      const newSize = Math.max(needed, state.buffer.length * 2);
      state.buffer = new Uint8Array(newSize);
      state.bufferView = new DataView(state.buffer.buffer);
    }
  }

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
      state.styles.push(ANSI_CODES[config.color]);
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
        state.styles.push(ANSI_CODES[key as ANSICode]);
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
    return typeAnim(text, color, options);
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
    const lineSize = blockBytes.length * width;
    const totalSize = lineSize * height + (height - 1) * newlineBytes.length;
    
    ensureBufferSize(totalSize);
    
    // Create first line
    for (let i = 0; i < width; i++) {
      state.buffer.set(blockBytes, i * blockBytes.length);
    }
    
    // Copy first line to other lines
    const firstLine = state.buffer.subarray(0, lineSize);
    let offset = lineSize;
    
    for (let i = 1; i < height; i++) {
      state.buffer.set(newlineBytes, offset);
      offset += newlineBytes.length;
      state.buffer.set(firstLine, offset);
      offset += lineSize;
    }
    
    return fn(decoder.decode(state.buffer.subarray(0, totalSize)));
  };

  fn.colorBlock = (color: RGBTuple, width: number = 1, height: number = 1) => {
    return fn.rgb(color[0], color[1], color[2]).block(width, height);
  };

  fn.bgBlock = (width: number = 1, height: number = 1) => {
    const lineSize = spaceBytes.length * width;
    const totalSize = lineSize * height + (height - 1) * newlineBytes.length;
    
    ensureBufferSize(totalSize);
    
    // Create first line
    for (let i = 0; i < width; i++) {
      state.buffer.set(spaceBytes, i * spaceBytes.length);
    }
    
    // Copy first line to other lines
    const firstLine = state.buffer.subarray(0, lineSize);
    let offset = lineSize;
    
    for (let i = 1; i < height; i++) {
      state.buffer.set(newlineBytes, offset);
      offset += newlineBytes.length;
      state.buffer.set(firstLine, offset);
      offset += lineSize;
    }
    
    return fn.bgRgb(0, 0, 0)(decoder.decode(state.buffer.subarray(0, totalSize)));
  };

  fn.bgColorBlock = (color: RGBTuple, width: number = 1, height: number = 1) => {
    const spaceBytes = encoder.encode(' ');
    const lineBytes = new Uint8Array(spaceBytes.length * width);
    
    for (let i = 0; i < width; i++) {
      lineBytes.set(spaceBytes, i * spaceBytes.length);
    }
    
    const line = decoder.decode(lineBytes);
    const lines = Array(height).fill(line);
    
    return fn.bgRgb(color[0], color[1], color[2])(lines.join(Bun.env.OS === 'windows' ? '\r\n' : '\n'));
  };

  fn.gradientBlock = (colors: GradientColor[], width: number = 1, height: number = 1) => {
    const blockChar = '█';
    const blockBytes = encoder.encode(blockChar);
    const lineBytes = new Uint8Array(blockBytes.length * width);
    
    for (let i = 0; i < width; i++) {
      lineBytes.set(blockBytes, i * blockBytes.length);
    }
    
    const line = decoder.decode(lineBytes);
    const lines = Array(height).fill(line);
    
    return fn.gradient(...colors)(lines.join(Bun.env.OS === 'windows' ? '\r\n' : '\n'));
  };

  return fn;
}

export const bunhance = createStyleFunction();
export type { StyleConfig, StyleFunction, ANSICode, GradientColor, RGB };
