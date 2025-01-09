import { start, stop } from '../animation';

/**
 * RGB color type
 */
export type RGB = {
  r: number;
  g: number;
  b: number;
};

/**
 * Gradient color type
 */
export type GradientColor = RGB | string | number;

/**
 * Style configuration type
 */
export type StyleConfig = {
  text: string;
  color?: string;
  bgColor?: string;
  rgb?: [number, number, number];
  bgRgb?: [number, number, number];
  color256?: number;
  bgColor256?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  hidden?: boolean;
  reverse?: boolean;
  blink?: boolean;
  strikethrough?: boolean;
};

/**
 * Animation effect options
 */
export type AnimationEffectOptions = {
  fps?: number;
  duration?: number;
  delay?: number;
  iterations?: number;
  easing?: (t: number) => number;
  repeat?: number;
  yoyo?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
};

export type StyleFunction = {
  (text: string): string;
  (config: StyleConfig): string;
  
  // Style modifiers
  dim: StyleFunction;
  bold: StyleFunction;
  italic: StyleFunction;
  underline: StyleFunction;
  blink: StyleFunction;
  inverse: StyleFunction;
  hidden: StyleFunction;
  strikethrough: StyleFunction;
  
  // Color methods
  rgb(r: number, g: number, b: number): StyleFunction;
  bgRgb(r: number, g: number, b: number): StyleFunction;
  hsl(h: number, s: number, l: number): StyleFunction;
  bgHsl(h: number, s: number, l: number): StyleFunction;
  color256(code: number): StyleFunction;
  bgColor256(code: number): StyleFunction;
  gradient(...colors: GradientColor[]): StyleFunction;
  
  // Basic colors
  black: StyleFunction;
  red: StyleFunction;
  green: StyleFunction;
  yellow: StyleFunction;
  blue: StyleFunction;
  magenta: StyleFunction;
  cyan: StyleFunction;
  white: StyleFunction;
  
  // Basic background colors
  bgBlack: StyleFunction;
  bgRed: StyleFunction;
  bgGreen: StyleFunction;
  bgYellow: StyleFunction;
  bgBlue: StyleFunction;
  bgMagenta: StyleFunction;
  bgCyan: StyleFunction;
  bgWhite: StyleFunction;
  
  // Animation methods
  rainbow(text: string, options?: AnimationEffectOptions): Promise<void>;
  pulse(text: string, color: RGB, options?: AnimationEffectOptions): Promise<void>;
  wave(text: string, color: RGB, options?: AnimationEffectOptions): Promise<void>;
  type(text: string, color: RGB, options?: AnimationEffectOptions): Promise<void>;
  glitch(text: string, color: RGB, intensity?: number, options?: AnimationEffectOptions): Promise<void>;
  sparkle(text: string, color: RGB, options?: AnimationEffectOptions): Promise<void>;
  zoom(text: string, color: RGB, options?: AnimationEffectOptions): Promise<void>;
  rotate(text: string, color: RGB, options?: AnimationEffectOptions): Promise<void>;
  slide(text: string, color: RGB, options?: AnimationEffectOptions): Promise<void>;
  
  // Block methods
  block(width?: number, height?: number): string;
  colorBlock(color: [number, number, number], width?: number, height?: number): string;
  bgBlock(width?: number, height?: number): string;
  bgColorBlock(color: [number, number, number], width?: number, height?: number): string;
  gradientBlock(colors: GradientColor[], width?: number, height?: number): string;
  
  // Control methods
  start: typeof start;
  stop: typeof stop;
  cleanup(): void;
}; 