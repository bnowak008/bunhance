export function validateRGB(r: number, g: number, b: number): void {
  if (!Number.isInteger(r) || !Number.isInteger(g) || !Number.isInteger(b) ||
      r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error('RGB values must be integers between 0 and 255');
  }
}

export function validate256Color(code: number): void {
  if (!Number.isInteger(code) || code < 0 || code > 255) {
    throw new Error('256 color code must be an integer between 0 and 255');
  }
}

export function validateHexColor(hex: string): void {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error('Invalid hex color format. Expected format: #RRGGBB');
  }
}

export function validateHSL(h: number, s: number, l: number): void {
  if (!Number.isFinite(h) || h < 0 || h >= 360) {
    throw new Error('Hue must be a number between 0 and 359');
  }
  if (!Number.isFinite(s) || s < 0 || s > 100) {
    throw new Error('Saturation must be a number between 0 and 100');
  }
  if (!Number.isFinite(l) || l < 0 || l > 100) {
    throw new Error('Lightness must be a number between 0 and 100');
  }
}

export function validateGradientColors(colors: ReadonlyArray<any>): void {
  if (!Array.isArray(colors) || colors.length < 2) {
    throw new Error('Gradient requires at least 2 colors');
  }
} 