import type { Animation, AnimationOptions, EasingFunction, Frame } from '../types/animation';
import { createAnimation, DEFAULT_DURATION } from './engine';
import { easeInOutQuad, easeInOutCubic, easeInElastic, defaultEasing } from './easing';
import { rgb } from '../core/ansi';
import { RGB } from '../types';

export function rainbow(text: string, options: AnimationOptions = {}): Animation {
  return createAnimation((t: number) => {
    const hue = (t * 360) % 360;
    return text.split('').map(char => {
      const r = Math.sin(0.024 * hue + 0) * 127 + 128;
      const g = Math.sin(0.024 * hue + 2) * 127 + 128;
      const b = Math.sin(0.024 * hue + 4) * 127 + 128;
      return rgb(r, g, b) + char;
    }).join('');
  }, { ...options, duration: options.duration ?? 2000 });
}

export function pulse(text: string, color: RGB, options: AnimationOptions = {}): Animation {
  return createAnimation((t: number) => {
    const intensity = easeInOutQuad(Math.sin(t * Math.PI * 2));
    const r = Math.round(color.r * intensity);
    const g = Math.round(color.g * intensity);
    const b = Math.round(color.b * intensity);
    return rgb(r, g, b) + text;
  }, { ...options, duration: options.duration ?? 1500 });
}

export function wave(text: string, color: RGB, options: AnimationOptions = {}): Animation {
  return createAnimation((t: number) => {
    return text.split('').map((char, i) => {
      const wave = Math.sin((t * Math.PI * 2) + (i * 0.3));
      const intensity = (wave + 1) / 2;
      const r = Math.round(color.r * intensity);
      const g = Math.round(color.g * intensity);
      const b = Math.round(color.b * intensity);
      return rgb(r, g, b) + char;
    }).join('');
  }, { ...options, duration: options.duration ?? 2000 });
}

export function type(text: string, color: RGB, options: AnimationOptions = {}): Animation {
  return createAnimation((t: number) => {
    const visibleLength = Math.floor(text.length * t);
    return text.split('').map((char, i) => {
      if (i <= visibleLength) {
        return rgb(color.r, color.g, color.b) + char;
      }
      return '';
    }).join('');
  }, { ...options, duration: options.duration ?? text.length * 100 });
}

export function glitch(text: string, color: RGB, intensity: number = 0.3, options: AnimationOptions = {}): Animation {
  return createAnimation((t: number) => {
    return text.split('').map(char => {
      if (Math.random() < intensity * Math.sin(t * Math.PI * 2)) {
        const glitchChar = String.fromCharCode(33 + Math.floor(Math.random() * 94));
        return rgb(color.r, color.g, color.b) + glitchChar;
      }
      return rgb(color.r, color.g, color.b) + char;
    }).join('');
  }, { ...options, duration: options.duration ?? 1000, easing: easeInElastic });
}

export function sparkle(text: string, color: RGB, options: AnimationOptions = {}): Animation {
  return createAnimation((t: number) => {
    return text.split('').map(char => {
      const sparkle = Math.random() > 0.8 ? 1.5 : 1;
      const r = Math.min(255, Math.round(color.r * sparkle));
      const g = Math.min(255, Math.round(color.g * sparkle));
      const b = Math.min(255, Math.round(color.b * sparkle));
      return rgb(r, g, b) + char;
    }).join('');
  }, { ...options, duration: options.duration ?? 1500 });
}

export function zoom(text: string, color: RGB, options: AnimationOptions = {}): Animation {
  return createAnimation((t: number) => {
    const scale = easeInOutCubic(t);
    const spaces = ' '.repeat(Math.floor((1 - scale) * text.length / 2));
    return rgb(color.r, color.g, color.b) + spaces + text + spaces;
  }, { ...options, duration: options.duration ?? 1000 });
}

export function rotate(text: string, color: RGB, options: AnimationOptions = {}): Animation {
  const chars = ['|', '/', '-', '\\'];
  return createAnimation((t: number) => {
    const rotationIndex = Math.floor(t * chars.length) % chars.length;
    return rgb(color.r, color.g, color.b) + chars[rotationIndex] + ' ' + text;
  }, { ...options, duration: options.duration ?? 1000 });
}

export function slide(text: string, color: RGB, options: AnimationOptions = {}): Animation {
  const width = process.stdout.columns || 80;
  return createAnimation((t: number) => {
    const position = Math.floor(t * width);
    const spaces = ' '.repeat(position);
    return rgb(color.r, color.g, color.b) + spaces + text;
  }, { ...options, duration: options.duration ?? 1500 });
}

export function transition(
  from: string,
  to: string,
  color: RGB,
  options: AnimationOptions = {}
): Animation {
  return createAnimation((t: number) => {
    const fromFrame: Frame = { content: from, timestamp: 0 };
    const toFrame: Frame = { content: to, timestamp: options.duration ?? DEFAULT_DURATION };
    const frame = interpolateFrames(
      fromFrame,
      toFrame,
      t,
      options.easing ?? defaultEasing
    );
    return frame.content;
  }, { ...options, duration: options.duration ?? 1000 });
}

function interpolateFrames(
  from: Frame,
  to: Frame,
  progress: number,
  easing: EasingFunction
): Frame {
  const t = easing(progress);
  
  // Interpolate content if they're color codes
  const fromContent = from.content;
  const toContent = to.content;
  
  // If content contains ANSI color codes, interpolate them
  if (fromContent.includes('\x1b[') && toContent.includes('\x1b[')) {
    const fromColors = extractColors(fromContent);
    const toColors = extractColors(toContent);
    
    return {
      content: interpolateColors(fromColors, toColors, t),
      timestamp: from.timestamp + (to.timestamp - from.timestamp) * t
    };
  }
  
  // Otherwise return discrete frames
  return progress < 0.5 ? from : to;
}

function extractColors(content: string): RGB[] {
  const colorRegex = /\x1b\[38;2;(\d+);(\d+);(\d+)m/g;
  const colors: RGB[] = [];
  let match;
  
  while ((match = colorRegex.exec(content)) !== null) {
    colors.push({
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10)
    });
  }
  
  return colors;
}

function interpolateColors(from: RGB[], to: RGB[], t: number): string {
  return from.map((fromColor, i) => {
    const toColor = to[i] || fromColor;
    const interpolated = {
      r: Math.round(fromColor.r + (toColor.r - fromColor.r) * t),
      g: Math.round(fromColor.g + (toColor.g - fromColor.g) * t),
      b: Math.round(fromColor.b + (toColor.b - fromColor.b) * t)
    };
    return `\x1b[38;2;${interpolated.r};${interpolated.g};${interpolated.b}m`;
  }).join('');
} 