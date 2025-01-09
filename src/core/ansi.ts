// Color code ranges
const FG_START = 30;  // Foreground color starts at 30
const BG_START = 40;  // Background color starts at 40
const BRIGHT_FG_START = 90;  // Bright foreground starts at 90
const BRIGHT_BG_START = 100; // Bright background starts at 100

// Text modifiers
export const MODIFIERS = {
  reset: 0,
  bold: 1,
  dim: 2,
  italic: 3,
  underline: 4,
  blink: 5,
  inverse: 7,
  hidden: 8,
  strikethrough: 9,
} as const;

// Basic colors
export const COLORS = {
  black: 0,
  red: 1,
  green: 2,
  yellow: 3,
  blue: 4,
  magenta: 5,
  cyan: 6,
  white: 7,
} as const;

// Type definitions for better TypeScript support
export type ModifierName = keyof typeof MODIFIERS;
export type ColorName = keyof typeof COLORS;
export type StyleCode = number;

// Generate ANSI escape sequence
const esc = (code: number | string) => `\x1b[${code}m`;

// Generate all ANSI codes
export const ANSI_CODES = {
  // Modifiers
  ...Object.entries(MODIFIERS).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: esc(value),
  }), {} as Record<ModifierName, string>),

  // Standard foreground colors
  ...Object.entries(COLORS).reduce((acc, [key, value]) => ({
    ...acc,
    [key]: esc(FG_START + value),
  }), {} as Record<ColorName, string>),

  // Standard background colors
  ...Object.entries(COLORS).reduce((acc, [key, value]) => ({
    ...acc,
    [`bg${key.charAt(0).toUpperCase()}${key.slice(1)}`]: esc(BG_START + value),
  }), {} as Record<`bg${Capitalize<ColorName>}`, string>),

  // Bright foreground colors
  ...Object.entries(COLORS).reduce((acc, [key, value]) => ({
    ...acc,
    [`bright${key.charAt(0).toUpperCase()}${key.slice(1)}`]: esc(BRIGHT_FG_START + value),
  }), {} as Record<`bright${Capitalize<ColorName>}`, string>),

  // Bright background colors
  ...Object.entries(COLORS).reduce((acc, [key, value]) => ({
    ...acc,
    [`bgBright${key.charAt(0).toUpperCase()}${key.slice(1)}`]: esc(BRIGHT_BG_START + value),
  }), {} as Record<`bgBright${Capitalize<ColorName>}`, string>),
} as const;

// RGB color generators
export const rgb = (r: number, g: number, b: number) => esc(`38;2;${r};${g};${b}`);
export const bgRgb = (r: number, g: number, b: number) => esc(`48;2;${r};${g};${b}`);

// 256 color generators
export const color256 = (code: number) => esc(`38;5;${code}`);
export const bgColor256 = (code: number) => esc(`48;5;${code}`);
