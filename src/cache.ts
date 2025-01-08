import type { GradientColor } from './types';

const MAX_CACHE_SIZE = 1000;
const CACHE_PRUNE_SIZE = 100;  // Number of items to remove when cache is full

const gradientCache = new Map<string, string>();
const styleCache = new Map<string, string>();

function pruneCache(cache: Map<string, string>): void {
  const entries = Array.from(cache.keys());
  for (let i = 0; i < CACHE_PRUNE_SIZE && entries.length > 0; i++) {
    cache.delete(entries[i]);
  }
}

function generateKey(parts: unknown[]): string {
  return parts.map(part => 
    typeof part === 'object' ? JSON.stringify(part) : String(part)
  ).join('|');
}

export function getGradient(colors: readonly GradientColor[], text: string): string | undefined {
  return gradientCache.get(generateKey([colors, text]));
}

export function setGradient(colors: readonly GradientColor[], text: string, value: string): void {
  if (gradientCache.size >= MAX_CACHE_SIZE) {
    pruneCache(gradientCache);
  }
  gradientCache.set(generateKey([colors, text]), value);
}

export function getStyle(styles: readonly string[], text: string): string | undefined {
  return styleCache.get(generateKey([styles, text]));
}

export function setStyle(styles: readonly string[], text: string, value: string): void {
  if (styleCache.size >= MAX_CACHE_SIZE) {
    pruneCache(styleCache);
  }
  styleCache.set(generateKey([styles, text]), value);
}

export function clearCache(): void {
  gradientCache.clear();
  styleCache.clear();
} 