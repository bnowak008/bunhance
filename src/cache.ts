import type { GradientColor } from './types';

const MAX_CACHE_SIZE = 1000;
const CACHE_PRUNE_SIZE = 100;

const gradientCache = new Map<string, string>();
const styleCache = new Map<string, Map<string, string>>();

// Use WeakRef for better memory management
const cacheKeys = new Map<string, WeakRef<string[]>>();

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

export function getStyle(styles: string[], text: string): string | undefined {
  const styleKey = styles.join('');
  const textCache = styleCache.get(styleKey);
  return textCache?.get(text);
}

export function setStyle(styles: string[], text: string, result: string): void {
  const styleKey = styles.join('');
  
  // Manage cache size
  if (styleCache.size >= MAX_CACHE_SIZE) {
    // Clear oldest entries
    const [firstKey] = styleCache.keys();
    styleCache.delete(firstKey);
  }

  let textCache = styleCache.get(styleKey);
  if (!textCache) {
    textCache = new Map();
    styleCache.set(styleKey, textCache);
    cacheKeys.set(styleKey, new WeakRef(styles));
  }
  
  textCache.set(text, result);
}

export function clearCache(): void {
  gradientCache.clear();
  styleCache.clear();
  cacheKeys.clear();
}

// Periodic cleanup of unused cache entries
if (typeof Bun !== 'undefined') {
  const cleanup = () => {
    for (const [styleKey, keyRef] of cacheKeys.entries()) {
      const styles = keyRef.deref();
      if (!styles) {
        styleCache.delete(styleKey);
        cacheKeys.delete(styleKey);
      }
    }
  };
  
  // Use Bun's native scheduler
  setInterval(cleanup, 60000);
} 