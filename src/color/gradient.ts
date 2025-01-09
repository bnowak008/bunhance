import { ANSI_CODES } from "../styles/ansi";
import type { GradientColor } from "../types";

/**
 * Pre-allocated buffer for color calculations to reduce memory allocations
 */
const colorBuffer = new Uint8Array(3);

/**
 * Converts a GradientColor to RGB array
 */
function toRGBArray(color: GradientColor): [number, number, number] {
  if (typeof color === 'number') {
    return [(color >> 16) & 0xFF, (color >> 8) & 0xFF, color & 0xFF];
  }
  if (typeof color === 'string') {
    const hex = color.replace('#', '');
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    ];
  }
  if (Array.isArray(color)) {
    return color;
  }
  return [color.r, color.g, color.b];
}

/**
 * Generates a gradient effect across the input text using the provided colors.
 * Uses optimized buffer operations and pre-allocated memory for better performance.
 * 
 * @param colors - Array of RGB color tuples defining the gradient
 * @param text - Text to apply the gradient to
 * @returns Text with ANSI color codes applied to create gradient effect
 */
export function generateGradient(colors: readonly GradientColor[], text: string): string {
  const textLength = text.length;
  if (textLength === 0) return '';
  if (colors.length < 2) return text;
  
  // Pre-allocate result array for better performance
  const result = new Array<string>(textLength);
  
  // Pre-calculate color steps
  const colorSegments = colors.length - 1;
  const stepSize = textLength / colorSegments;
  
  // Convert all colors to RGB arrays first
  const rgbColors = colors.map(toRGBArray);
  
  // Split text into lines for proper block handling
  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    if (!line) return '';
    
    const lineResult = new Array<string>(line.length);
    for (let i = 0; i < line.length; i++) {
      const segment = Math.min(Math.floor(i / stepSize), colorSegments - 1);
      const progress = (i % stepSize) / stepSize;
      
      const start = rgbColors[segment];
      const end = rgbColors[segment + 1];
      
      // Optimized color interpolation using pre-allocated buffer
      for (let j = 0; j < 3; j++) {
        colorBuffer[j] = Math.round(start[j] + (end[j] - start[j]) * progress);
      }
      
      lineResult[i] = `\x1b[38;2;${colorBuffer[0]};${colorBuffer[1]};${colorBuffer[2]}m${line[i]}`;
    }
    return lineResult.join('');
  });
  
  return processedLines.join('\n') + ANSI_CODES.reset;
}
