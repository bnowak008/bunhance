import { ANSI_CODES, rgb, bgRgb, color256, bgColor256 } from "./ansi";
import { generateGradient } from "./gradient";
import { getStyle, setStyle } from "./cache";
import { validateRGB, validate256Color } from "./validation";
import type { StyleConfig, StyleFunction, ANSICode, GradientColor, RGB, AnimationEffectOptions, MatrixConfig } from "./types";
import { hslToRgb } from "./color";
import { rainbow, pulse, wave, type as typeAnim, glitch, sparkle, zoom, rotate, slide, start, stop } from "./animation";

function createStyleFunction(): StyleFunction {
  const state = {
    styles: [] as string[],
    gradientColors: undefined as readonly GradientColor[] | undefined
  };

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

    const result = `${state.styles.join('')}${text}${ANSI_CODES.reset}`;
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

  return fn;
}

export const bunhance = createStyleFunction();
export type { StyleConfig, StyleFunction, ANSICode, GradientColor, RGB };
