/**
 * Maximum number of cached styles to prevent memory leaks
 */
const MAX_CACHE_SIZE = 1000;

/**
 * Cache for storing computed styles
 * Uses Map for better performance with string keys
 */
const styleCache = new Map<string, string>();

/**
 * Creates a cache key from styles and text
 * 
 * @param styles - Array of style codes
 * @param text - Text content
 * @returns Cache key string
 */
function createCacheKey(styles: readonly string[], text: string): string {
  return `${styles.join('')}:${text}`;
}

/**
 * Retrieves a cached style if available
 * 
 * @param styles - Array of style codes
 * @param text - Text content
 * @returns Cached style string or undefined if not found
 */
export function getStyle(styles: readonly string[], text: string): string | undefined {
  if (styles.length === 0) return text;
  return styleCache.get(createCacheKey(styles, text));
}

/**
 * Stores a style in the cache
 * Implements LRU-like behavior by clearing oldest entries when cache is full
 * 
 * @param styles - Array of style codes
 * @param text - Text content
 * @param result - Computed style string to cache
 */
export function setStyle(styles: readonly string[], text: string, result: string): void {
  if (styles.length === 0) return;
  
  // Clear oldest entries if cache is full
  if (styleCache.size >= MAX_CACHE_SIZE) {
    const entriesToDelete = Math.ceil(MAX_CACHE_SIZE * 0.2); // Remove 20% of entries
    const keys = Array.from(styleCache.keys()).slice(0, entriesToDelete);
    keys.forEach(key => styleCache.delete(key));
  }
  
  styleCache.set(createCacheKey(styles, text), result);
}

/**
 * Clears the style cache
 * Useful for memory management or testing
 */
export function clearCache(): void {
  styleCache.clear();
} 