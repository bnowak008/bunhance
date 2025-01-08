import { ANSI_CODES } from './ansi';
import type { EasingFunction } from './easing';

// Core types
export type ANSICode = keyof typeof ANSI_CODES;
export type Modifier = 'bold' | 'italic' | 'underline' | 'dim' | 'blink' | 'inverse' | 'hidden' | 'strikethrough';

export interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export type RGBTuple = readonly [number, number, number];
export type GradientColor = HexColor | NamedColor | RGB | HSL | HSLTuple | RGBTuple;

// Configuration types
export interface StyleConfig {
  text: string;
  color?: ANSICode;
  rgb?: RGBTuple;
  hsl?: HSLTuple;
  bgHsl?: HSLTuple;
  bgRgb?: RGBTuple;
  color256?: number;
  bgColor256?: number;
  gradient?: readonly ColorInput[];
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  dim?: boolean;
  blink?: boolean;
  inverse?: boolean;
  hidden?: boolean;
  strikethrough?: boolean;
}

// Function types
export interface StyleFunction {
  (text: string): string;
  (config: StyleConfig): string;
  rgb(r: number, g: number, b: number): StyleFunction;
  hsl(h: number, s: number, l: number): StyleFunction;
  bgHsl(h: number, s: number, l: number): StyleFunction;
  bgRgb(r: number, g: number, b: number): StyleFunction;
  color256(code: number): StyleFunction;
  bgColor256(code: number): StyleFunction;
  gradient(...colors: ColorInput[]): StyleFunction;
  apply(text: string): string;
  [key: string]: StyleFunction | any;
}

export type HexColor = `#${string}`;
export type NamedColor = keyof typeof ANSI_CODES;
export type ColorValue = HexColor | NamedColor | RGB;

export interface ThemeConfig extends Omit<StyleConfig, 'text'> {
  extends?: string;
}

export interface Theme {
  [key: string]: ThemeConfig;
}

// Add these new types
export interface HSL {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

export type HSLTuple = readonly [number, number, number];
export type ColorInput = HexColor | NamedColor | RGB | HSL | HSLTuple | RGBTuple;

export interface Frame {
  text: string;
  color: RGB;
  duration?: number;
}

export interface AnimationOptions {
  fps?: number;
  loop?: boolean;
  autoplay?: boolean;
}

export interface ColorTransition {
  from: RGB;
  to: RGB;
  steps?: number;
}

// Add these new types for complex animations
export interface MatrixConfig {
  chars?: string[];
  speed?: number;
  density?: number;
  fadeLength?: number;
  fps?: number;
}

export interface SparkleConfig {
  chars?: string[];
  frequency?: number;
  duration?: number;
  fps?: number;
}

export type TransformConfig = {
  direction?: 'left' | 'right';
  scale?: number;
  maxWidth?: number;
  minBrightness?: number;
  maxBrightness?: number;
};

// Update AnimationEffectOptions
export interface AnimationEffectOptions {
  duration?: number;
  easing?: EasingFunction;
  steps?: number;
  transform?: TransformConfig;
  matrix?: MatrixConfig;
  sparkle?: SparkleConfig;
  fps?: number;
}