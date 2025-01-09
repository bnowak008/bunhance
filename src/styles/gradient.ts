import type { RGB, GradientColor, GradientOptions } from '../types';
import { parseColor, interpolateRGB, interpolateHSL } from './color';
import { calculateGradientPosition, type Point2D } from '../utils/color-utils';

export function createGradient(
  text: string,
  colors: readonly GradientColor[],
  options: GradientOptions = {}
): string {
  const {
    direction = 'horizontal',
    interpolation = 'linear',
    colorSpace = 'rgb',
    stops
  } = options;

  const rgbColors = colors.map(parseColor);
  const normalizedStops = stops || colors.map((_, i) => i / (colors.length - 1));
  const interpolate = colorSpace === 'rgb' ? interpolateRGB : interpolateHSL;

  const lines = text.split('\n');
  const dimensions: Point2D = {
    x: Math.max(...lines.map(line => line.length)),
    y: lines.length
  };

  return lines.map((line, lineIndex) => {
    const chars = line.split('').map((char, charIndex) => {
      const current: Point2D = { x: charIndex, y: lineIndex };
      let t = calculateGradientPosition(direction, current, dimensions);

      if (interpolation === 'bezier') {
        t = bezierInterpolation(t);
      }

      const segmentIndex = normalizedStops.findIndex(stop => t <= stop) - 1;
      const startIndex = Math.max(0, segmentIndex);
      const endIndex = Math.min(startIndex + 1, colors.length - 1);
      
      const segmentT = (t - normalizedStops[startIndex]) / 
        (normalizedStops[endIndex] - normalizedStops[startIndex]);

      const color = interpolate(
        rgbColors[startIndex],
        rgbColors[endIndex],
        segmentT
      );

      return `\x1b[38;2;${color.r};${color.g};${color.b}m${char}`;
    }).join('');

    return `${chars}\x1b[0m`;
  }).join('\n');
}

function bezierInterpolation(t: number): number {
  return t * t * (3 - 2 * t);
}
