import { rgb, ANSI_CODES } from "./ansi";
import { getGradient, setGradient } from "./cache";
import { hslToRgb } from "./color";
import type { RGB, GradientColor, HexColor } from "./types";

const HEX_COLOR_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const NAMED_COLORS: Record<string, RGB> = {
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 255, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 }
};

function hexToRgb(hex: string): RGB {
  const result = HEX_COLOR_REGEX.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

function colorToRgb(color: GradientColor): RGB {
  if (typeof color === 'string') {
    return color.startsWith('#') ? 
      hexToRgb(color as HexColor) : 
      NAMED_COLORS[color.toLowerCase()] || hexToRgb(color);
  }
  if (Array.isArray(color)) {
    return { r: color[0], g: color[1], b: color[2] };
  }
  if ('h' in color) {
    return hslToRgb(color.h, color.s, color.l);
  }
  return color as RGB;
}

function interpolateColor(color1: RGB, color2: RGB, factor: number): RGB {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * factor),
    g: Math.round(color1.g + (color2.g - color1.g) * factor),
    b: Math.round(color1.b + (color2.b - color1.b) * factor)
  };
}

export function generateGradient(colors: readonly GradientColor[], text: string): string {
  if (colors.length < 2) {
    throw new Error('Gradient requires at least 2 colors');
  }

  const cached = getGradient(colors, text);
  if (cached) return cached;

  try {
    const rgbColors = colors.map(colorToRgb);
    const result: string[] = [];
    const textLength = text.length;
    const segments = rgbColors.length - 1;
    
    for (let i = 0; i < textLength; i++) {
      const segmentIndex = (i / textLength) * segments;
      const colorIndex = Math.floor(segmentIndex);
      const factor = segmentIndex - colorIndex;
      
      const color1 = rgbColors[colorIndex];
      const color2 = rgbColors[Math.min(colorIndex + 1, rgbColors.length - 1)];
      
      const interpolated = interpolateColor(color1, color2, factor);
      result.push(rgb(interpolated.r, interpolated.g, interpolated.b) + text[i]);
    }

    const finalResult = result.join('') + ANSI_CODES.reset;
    setGradient(colors, text, finalResult);
    return finalResult;
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to generate gradient: ${error}`);
  }
}
