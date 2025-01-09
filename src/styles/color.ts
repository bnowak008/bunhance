import type { RGB, HSL, ColorInput, GradientColor } from '../types';

// Pre-compute common color values
const colorCache = new Map<string, RGB>();

// Use TypedArrays for better performance
const hueCache = new Float64Array(361); // 0-360 degrees
const rgbBuffer = new Uint8Array(3);

export function hslToRgb(h: number, s: number, l: number): RGB {
  // Normalize and cache key
  h = Math.round(h % 360);
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  
  const cacheKey = `${h},${s},${l}`;
  const cached = colorCache.get(cacheKey);
  if (cached) return cached;

  // Optimized HSL to RGB conversion using pre-computed values
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  rgbBuffer[0] = Math.round((r + m) * 255);
  rgbBuffer[1] = Math.round((g + m) * 255);
  rgbBuffer[2] = Math.round((b + m) * 255);

  const result = { r: rgbBuffer[0], g: rgbBuffer[1], b: rgbBuffer[2] };
  colorCache.set(cacheKey, result);
  
  return result;
}

export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
} 

/**
 * Blend two colors together with a given ratio
 */
export function mix(color1: RGB, color2: RGB, ratio: number = 0.5): RGB {
  return {
    r: Math.round(color1.r * (1 - ratio) + color2.r * ratio),
    g: Math.round(color1.g * (1 - ratio) + color2.g * ratio),
    b: Math.round(color1.b * (1 - ratio) + color2.b * ratio)
  };
}

/**
 * Lighten a color by a percentage (0-100)
 */
export function lighten(color: RGB, amount: number): RGB {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  return hslToRgb(
    hsl.h,
    hsl.s,
    Math.min(100, hsl.l + amount)
  );
}

/**
 * Darken a color by a percentage (0-100)
 */
export function darken(color: RGB, amount: number): RGB {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  return hslToRgb(
    hsl.h,
    hsl.s,
    Math.max(0, hsl.l - amount)
  );
}

/**
 * Saturate a color by a percentage (0-100)
 */
export function saturate(color: RGB, amount: number): RGB {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  return hslToRgb(
    hsl.h,
    Math.min(100, hsl.s + amount),
    hsl.l
  );
}

/**
 * Desaturate a color by a percentage (0-100)
 */
export function desaturate(color: RGB, amount: number): RGB {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  return hslToRgb(
    hsl.h,
    Math.max(0, hsl.s - amount),
    hsl.l
  );
}

/**
 * Invert a color
 */
export function invert(color: RGB): RGB {
  return {
    r: 255 - color.r,
    g: 255 - color.g,
    b: 255 - color.b
  };
}

/**
 * Adjust color opacity (alpha) - returns ANSI compatible RGB
 * Note: This simulates alpha by blending with black or white
 */
export function alpha(color: RGB, amount: number, background: 'light' | 'dark' = 'dark'): RGB {
  const bgColor: RGB = background === 'light' ? 
    { r: 255, g: 255, b: 255 } : 
    { r: 0, g: 0, b: 0 };
  return mix(color, bgColor, 1 - amount);
}

/**
 * Create a complementary color
 */
export function complement(color: RGB): RGB {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  return hslToRgb(
    (hsl.h + 180) % 360,
    hsl.s,
    hsl.l
  );
}

/**
 * Create an analogous color palette
 */
export function analogous(color: RGB, results: number = 3): RGB[] {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const step = 30;
  const colors: RGB[] = [];

  for (let i = 0; i < results; i++) {
    const newHue = (hsl.h + step * (i - Math.floor(results / 2))) % 360;
    colors.push(hslToRgb(newHue < 0 ? newHue + 360 : newHue, hsl.s, hsl.l));
  }

  return colors;
}

/**
 * Create a triadic color palette
 */
export function triadic(color: RGB): [RGB, RGB, RGB] {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  return [
    color,
    hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)
  ];
}

/**
 * Create a split complementary color palette
 */
export function splitComplement(color: RGB): [RGB, RGB, RGB] {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  return [
    color,
    hslToRgb((hsl.h + 150) % 360, hsl.s, hsl.l),
    hslToRgb((hsl.h + 210) % 360, hsl.s, hsl.l)
  ];
}

/**
 * Adjust color temperature
 * @param color The color to adjust
 * @param amount Amount to adjust (-100 to 100, negative for cooler, positive for warmer)
 */
export function temperature(color: RGB, amount: number): RGB {
  const hsl = rgbToHsl(color.r, color.g, color.b);
  const adjustment = amount * 3.6; // Convert percentage to degrees (360 * 0.01)
  return hslToRgb(
    (hsl.h + adjustment + 360) % 360,
    hsl.s,
    hsl.l
  );
}

export function parseColor(color: GradientColor): RGB {
  if (typeof color === 'object') {
    if ('r' in color && 'g' in color && 'b' in color) {
      return color as RGB;
    }
    if ('h' in color && 's' in color && 'l' in color) {
      return hslToRgb(color.h, color.s, color.l);
    }
  }
  if (typeof color === 'string' && color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return { r, g, b };
  }
  throw new Error('Invalid color format');
}

export function interpolateRGB(color1: RGB, color2: RGB, t: number): RGB {
  return {
    r: Math.round(color1.r + (color2.r - color1.r) * t),
    g: Math.round(color1.g + (color2.g - color1.g) * t),
    b: Math.round(color1.b + (color2.b - color1.b) * t)
  };
}

export function interpolateHSL(color1: RGB, color2: RGB, t: number): RGB {
  const hsl1 = rgbToHsl(color1.r, color1.g, color1.b);
  const hsl2 = rgbToHsl(color2.r, color2.g, color2.b);
  
  return hslToRgb(
    hsl1.h + (hsl2.h - hsl1.h) * t,
    hsl1.s + (hsl2.s - hsl1.s) * t,
    hsl1.l + (hsl2.l - hsl1.l) * t
  );
} 