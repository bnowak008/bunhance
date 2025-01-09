import type { StyleConfig, Theme } from '../types';
import { bunhance } from '../index';
import { ANSI_CODES } from '../core/ansi';
import { validateColor } from '../utils/color-utils';

export function createTheme(theme: Theme, baseTheme?: Theme) {
  const finalTheme = baseTheme ? { ...baseTheme, ...theme } : theme;
  
  // Validate theme
  Object.entries(finalTheme).forEach(([key, config]) => {
    // Validate basic colors
    if (config.color && !(config.color in ANSI_CODES)) {
      throw new Error(`Invalid color in theme "${key}": ${config.color}`);
    }
    
    // Validate RGB/HSL colors
    if (config.rgb) validateColor(config.rgb);
    if (config.hsl) validateColor(config.hsl);
    if (config.bgRgb) validateColor(config.bgRgb);
    if (config.bgHsl) validateColor(config.bgHsl);
    
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