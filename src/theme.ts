import type { StyleConfig, Theme, ThemeConfig } from './types';
import { bunhance } from './index';
import { ANSI_CODES } from './ansi';

export function createTheme(theme: Theme, baseTheme?: Theme) {
  const finalTheme = baseTheme ? { ...baseTheme, ...theme } : theme;
  
  // Validate theme
  Object.entries(finalTheme).forEach(([key, config]) => {
    if (config.color && !(config.color in ANSI_CODES)) {
      throw new Error(`Invalid color in theme "${key}": ${config.color}`);
    }
    
    // Handle theme extension
    if (config.extends && !finalTheme[config.extends]) {
      throw new Error(`Theme "${key}" extends non-existent theme "${config.extends}"`);
    }
  });

  return Object.entries(finalTheme).reduce((acc, [key, config]) => {
    const baseConfig = config.extends ? finalTheme[config.extends] : {};
    const mergedConfig = { ...baseConfig, ...config };
    delete mergedConfig.extends;
    
    acc[key] = (text: string) => bunhance({ ...mergedConfig, text });
    return acc;
  }, {} as Record<string, (text: string) => string>);
} 