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