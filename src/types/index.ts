import { ANSI_CODES } from '../core/ansi';
import type { EasingFunction } from './animation';
import type { UnifiedBuffer } from '../core/buffer';

// Core types
export type ANSICode = keyof typeof ANSI_CODES;
export type Modifier = 'bold' | 'italic' | 'underline' | 'dim' | 'blink' | 'inverse' | 'hidden' | 'strikethrough';

export type RGB = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
};

export type RGBTuple = readonly [number, number, number];
export type HSLTuple = readonly [number, number, number];
export type HexColor = `#${string}`;
export type NamedColor = keyof typeof ANSI_CODES;
export type ColorInput = RGB | HSL | `#${string}` | RGBTuple | HSLTuple;
export type GradientColor = ColorInput;

export type HSL = {
  readonly h: number;
  readonly s: number;
  readonly l: number;
};

// Configuration types
export type StyleConfig = {
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
};

export type ThemeConfig = Omit<StyleConfig, 'text'> & {
  extends?: string;
};

export type Theme = {
  [key: string]: ThemeConfig;
};

// Animation types
export type AnimationState = {
  frames: Frame[];
  currentFrame: number;
  isPlaying: boolean;
  lastFrameTime: number;
  fps: number;
  timer: (ms: number) => Promise<void>;
  buffer: UnifiedBuffer;
  interval: NodeJS.Timeout | null;
  options: AnimationOptions;
  cleanup?: () => void;
  position?: Position;
};

export type Frame = {
  text: string;
  color: RGB;
  duration?: number;
};

export type AnimationOptions = {
  fps?: number;
  loop?: boolean;
  autoplay?: boolean;
};

export type TransformConfig = {
  direction?: 'left' | 'right';
  scale?: number;
  maxWidth?: number;
  minBrightness?: number;
  maxBrightness?: number;
};

export type AnimationEffectOptions = {
  duration?: number;
  easing?: EasingFunction;
  steps?: number;
  transform?: TransformConfig;
  fps?: number;
  cleanup?: () => void;
};

export type Position = {
  x: number;
  y: number;
};

// Function types
export type StyleFunction = {
  (text: string): string;
  (config: StyleConfig): string;
  rgb: (r: number, g: number, b: number) => StyleFunction;
  hsl: (h: number, s: number, l: number) => StyleFunction;
  bgHsl: (h: number, s: number, l: number) => StyleFunction;
  bgRgb: (r: number, g: number, b: number) => StyleFunction;
  color256: (code: number) => StyleFunction;
  bgColor256: (code: number) => StyleFunction;
  gradient: (colors: GradientColor[], options?: GradientOptions) => StyleFunction;
  apply: (text: string) => string;
  [key: string]: StyleFunction | any;
};

// Add new types for queue system
export type AnimationQueue = {
  animations: AnimationState[];
  currentIndex: number;
  isPlaying: boolean;
};

// Add RenderOptions type here since it's used in multiple places
export type RenderOptions = {
  position?: Position;
  buffer?: UnifiedBuffer;
  viewport?: {
    width: number;
    height: number;
  };
};

// Missing types for advanced gradient features
// Missing animation composition types

export type GradientDirection = 
  | 'horizontal'
  | 'vertical'
  | 'diagonal'
  | 'radial'
  | 'conic';

export type ColorSpace = 'rgb' | 'hsl';
export type InterpolationType = 'linear' | 'bezier';

export type GradientOptions = {
  readonly direction?: GradientDirection;
  readonly interpolation?: InterpolationType;
  readonly colorSpace?: ColorSpace;
  readonly stops?: readonly number[];
};

export type GradientConfig = {
  colors: readonly GradientColor[];
  options?: GradientOptions;
};