const MAX_CACHE_SIZE = 10000;

type StyleCache = Map<string, Map<string, string>>;
type CacheKeys = Map<string, WeakRef<string[]>>;

const styleCache: StyleCache = new Map();
const cacheKeys: CacheKeys = new Map();

function setStyle(styles: string[], text: string, result: string): void {
  const styleKey = styles.join('');
  
  if (styleCache.size >= MAX_CACHE_SIZE) {
    const [firstKey] = styleCache.keys();
    styleCache.delete(firstKey);
    cacheKeys.delete(firstKey);
  }

  let textCache = styleCache.get(styleKey);
  if (!textCache) {
    textCache = new Map();
    styleCache.set(styleKey, textCache);
    cacheKeys.set(styleKey, new WeakRef(styles));
  }
  
  textCache.set(text, result);
}

function getStyle(styles: string[], text: string): string | undefined {
  const styleKey = styles.join('');
  return styleCache.get(styleKey)?.get(text);
}

function clearCache(): void {
  styleCache.clear();
  cacheKeys.clear();
}

// Use Bun's native scheduler for cleanup
if (typeof Bun !== 'undefined') {
  const cleanup = () => {
    for (const [styleKey, keyRef] of cacheKeys.entries()) {
      if (!keyRef.deref()) {
        styleCache.delete(styleKey);
        cacheKeys.delete(styleKey);
      }
    }
  };
  
  Bun.sleep(60000).then(cleanup);
}

export {
  type StyleCache,
  type CacheKeys,
  setStyle,
  getStyle,
  clearCache
}; 