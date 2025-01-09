import { ANSI_CODES } from './styles/ansi';
import { start, stop } from './animation';

export type ANSICode = keyof typeof ANSI_CODES;

/**
 * RGB color type
 */
export type RGB = {
  r: number;
  g: number;
  b: number;
};

// Add RGBTuple type
export type RGBTuple = [number, number, number];

/**
 * Animation effect options
 */
export type AnimationEffectOptions = {
  fps?: number;
  duration?: number;
  delay?: number;
  iterations?: number;
  repeat?: number;
  yoyo?: boolean;
  easing?: (t: number) => number;
  onStart?: () => void;
  onComplete?: () => void;
  onUpdate?: () => void;
  steps?: number;
  transform?: {
    direction?: 'left' | 'right';
    maxWidth?: number;
    minBrightness?: number;
    maxBrightness?: number;
  };
};

/**
 * Animation recovery options
 */
export type AnimationRecoveryOptions = {
  maxRetries: number;
  retryDelay: number;
  onError?: (error: Error) => void;
  fallbackAnimation?: () => Promise<void>;
};

/**
 * Animation state
 */
export type AnimationState = {
  id: string;
  isRunning: boolean;
  startTime: number;
  currentFrame: number;
  frameBuffer?: Uint8Array;
  metrics?: AnimationMetrics;
  state: 'pending' | 'running' | 'paused' | 'completed';
};

/**
 * Animation instance
 */
export type AnimationInstance = {
  id: string;
  text: string;
  color: RGB;
  options: Required<AnimationEffectOptions>;
  renderFrame: (progress: number, text: string, color: RGB, buffer: Uint8Array) => string;
  onComplete?: () => void;
  state: AnimationState;
  startTime: number;
  progress: number;
  frameBuffer: Uint8Array;
};

/**
 * Animation metrics
 */
export type AnimationMetrics = {
  droppedFrames: number;
  frameTime: number;
  bufferSize: number;
  currentAnimations: number;
  queueSize: number;
  fps: number;
  memoryUsage: number;
  frameCount: number;
  lastFrameTimestamp: number;
};

/**
 * Style configuration
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
 * Gradient color type
 */
export type GradientColor = RGB | RGBTuple | string | number;

/**
 * Style function type
 */
export type StyleFunction = {
  (text: string): string;
  (config: StyleConfig): string;
  
  // Color methods
  rgb(r: number, g: number, b: number): StyleFunction;
  bgRgb(r: number, g: number, b: number): StyleFunction;
  hsl(h: number, s: number, l: number): StyleFunction;
  bgHsl(h: number, s: number, l: number): StyleFunction;
  color256(code: number): StyleFunction;
  bgColor256(code: number): StyleFunction;
  gradient(...colors: GradientColor[]): StyleFunction;
  
  // Basic colors
  red: StyleFunction;
  green: StyleFunction;
  blue: StyleFunction;
  yellow: StyleFunction;
  magenta: StyleFunction;
  cyan: StyleFunction;
  white: StyleFunction;
  black: StyleFunction;
  
  // Style modifiers
  bold: StyleFunction;
  dim: StyleFunction;
  italic: StyleFunction;
  underline: StyleFunction;
  blink: StyleFunction;
  inverse: StyleFunction;
  hidden: StyleFunction;
  strikethrough: StyleFunction;
  
  // Animation methods
  rainbow(text: string, options?: AnimationEffectOptions): AnimationState;
  pulse(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState;
  wave(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState;
  type(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState;
  glitch(text: string, color: RGB, intensity?: number, options?: AnimationEffectOptions): AnimationState;
  sparkle(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState;
  zoom(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState;
  rotate(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState;
  slide(text: string, color: RGB, options?: AnimationEffectOptions): AnimationState;
  
  // Animation control
  start(state: AnimationState): void;
  stop(state: AnimationState): void;
  
  // Block methods
  block(width?: number, height?: number): string;
  colorBlock(color: RGBTuple, width?: number, height?: number): string;
  bgBlock(width?: number, height?: number): string;
  bgColorBlock(color: RGBTuple, width?: number, height?: number): string;
  gradientBlock(colors: GradientColor[], width?: number, height?: number): string;
  
  // Cleanup
  cleanup(): void;
};

/**
 * Theme configuration
 */
export type ThemeConfig = StyleConfig & {
  extends?: string;
};

/**
 * Theme type
 */
export type Theme = Record<string, ThemeConfig>; 