import type { StyleConfig, Theme, ThemeConfig } from '../types';
import { bunhance } from '../index';
import { ANSI_CODES } from '../styles/ansi';

export function createTheme(theme: Theme, baseTheme?: Theme): Record<string, (text: string) => string> {
  const finalTheme = baseTheme ? { ...baseTheme, ...theme } : theme;
  
  // Validate theme
  Object.entries(finalTheme).forEach(([key, config]: [string, ThemeConfig]) => {
    if (config.color && !(config.color in ANSI_CODES)) {
      throw new Error(`Invalid color in theme "${key}": ${config.color}`);
    }
    
    // Handle theme extension
    if (config.extends && !finalTheme[config.extends]) {
      throw new Error(`Theme "${key}" extends non-existent theme "${config.extends}"`);
    }
  });

  return Object.entries(finalTheme).reduce<Record<string, (text: string) => string>>((acc, [key, config]) => {
    const baseConfig = config.extends ? finalTheme[config.extends] : {} as ThemeConfig;
    const mergedConfig: ThemeConfig = { ...baseConfig, ...config };
    delete mergedConfig.extends;
    
    acc[key] = (text: string) => bunhance({ ...mergedConfig, text });
    return acc;
  }, {});
} 