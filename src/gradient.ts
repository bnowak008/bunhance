import type { GradientColor, RGB } from "./types";
import { hslToRgb } from "./color";

// Pre-allocate buffers for better performance
const colorBuffer = new Uint8Array(3);
const gradientCache = new Map<string, Uint8Array>();

export function generateGradient(colors: readonly GradientColor[], text: string): string {
  const cacheKey = `${colors.join(',')}-${text}`;
  const cached = gradientCache.get(cacheKey);
  
  if (cached) {
    return new TextDecoder().decode(cached);
  }

  const textLength = text.length;
  const colorStops = colors.length;
  
  // Pre-allocate result buffer
  const resultBuffer = new Uint8Array(textLength * 20); // Approximate size for ANSI codes
  let offset = 0;

  for (let i = 0; i < textLength; i++) {
    const percent = i / (textLength - 1);
    const index = Math.min(Math.floor(percent * (colorStops - 1)), colorStops - 2);
    const t = (percent - index / (colorStops - 1)) * (colorStops - 1);

    const color1 = parseColor(colors[index]);
    const color2 = parseColor(colors[index + 1]);

    // Interpolate colors using buffer
    colorBuffer[0] = Math.round(color1.r + (color2.r - color1.r) * t);
    colorBuffer[1] = Math.round(color1.g + (color2.g - color1.g) * t);
    colorBuffer[2] = Math.round(color1.b + (color2.b - color1.b) * t);

    // Write ANSI code to buffer
    const ansiCode = `\x1b[38;2;${colorBuffer[0]};${colorBuffer[1]};${colorBuffer[2]}m`;
    const ansiBytes = new TextEncoder().encode(ansiCode);
    resultBuffer.set(ansiBytes, offset);
    offset += ansiBytes.length;

    // Write character
    const charBytes = new TextEncoder().encode(text[i]);
    resultBuffer.set(charBytes, offset);
    offset += charBytes.length;
  }

  // Add reset code
  const resetBytes = new TextEncoder().encode('\x1b[0m');
  resultBuffer.set(resetBytes, offset);
  offset += resetBytes.length;

  const finalBuffer = resultBuffer.slice(0, offset);
  gradientCache.set(cacheKey, finalBuffer);

  return new TextDecoder().decode(finalBuffer);
}

// Helper function to parse different color formats
function parseColor(color: GradientColor): RGB {
  if (typeof color === 'string') {
    if (color.startsWith('#')) {
      return {
        r: parseInt(color.slice(1, 3), 16),
        g: parseInt(color.slice(3, 5), 16),
        b: parseInt(color.slice(5, 7), 16)
      };
    }
    // Handle named colors
    // ... (color name mapping implementation)
  }
  return color as RGB;
}
