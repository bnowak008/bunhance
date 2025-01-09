import type { RGB, HSL, ColorInput, GradientDirection } from '../types';

export type Point2D = {
  x: number;
  y: number;
};

export function calculateGradientPosition(
  direction: GradientDirection,
  current: Point2D,
  dimensions: Point2D
): number {
  switch (direction) {
    case 'horizontal':
      return current.x / (dimensions.x - 1);
    
    case 'vertical':
      return current.y / (dimensions.y - 1);
    
    case 'diagonal':
      return (current.x / dimensions.x + current.y / dimensions.y) / 2;
    
    case 'radial': {
      const center = {
        x: dimensions.x / 2,
        y: dimensions.y / 2
      };
      const maxDistance = Math.sqrt(
        Math.pow(center.x, 2) + Math.pow(center.y, 2)
      );
      const distance = Math.sqrt(
        Math.pow(current.x - center.x, 2) + 
        Math.pow(current.y - center.y, 2)
      );
      return distance / maxDistance;
    }
    
    case 'conic': {
      const center = {
        x: dimensions.x / 2,
        y: dimensions.y / 2
      };
      const angle = Math.atan2(
        current.y - center.y,
        current.x - center.x
      );
      return (angle + Math.PI) / (2 * Math.PI);
    }
    
    default:
      return current.x / (dimensions.x - 1);
  }
}

export function validateColor(color: ColorInput): void {
  if (typeof color === 'string') {
    if (!color.startsWith('#') || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error(`Invalid hex color: ${color}`);
    }
  } else if ('r' in color || 'g' in color || 'b' in color) {
    validateRGB(color as RGB);
  } else if ('h' in color || 's' in color || 'l' in color) {
    validateHSL(color as HSL);
  } else {
    throw new Error(`Invalid color format: ${JSON.stringify(color)}`);
  }
}

export function validateRGB({ r, g, b }: RGB): void {
  if (!Number.isInteger(r) || !Number.isInteger(g) || !Number.isInteger(b) ||
      r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error(`Invalid RGB values: r=${r}, g=${g}, b=${b}`);
  }
}

export function validateHSL({ h, s, l }: HSL): void {
  if (!Number.isFinite(h) || h < 0 || h >= 360) {
    throw new Error(`Invalid hue value: ${h}`);
  }
  if (!Number.isFinite(s) || s < 0 || s > 100) {
    throw new Error(`Invalid saturation value: ${s}`);
  }
  if (!Number.isFinite(l) || l < 0 || l > 100) {
    throw new Error(`Invalid lightness value: ${l}`);
  }
} 