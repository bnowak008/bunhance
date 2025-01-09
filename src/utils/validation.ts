/**
 * Validates RGB color values
 * 
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @throws Error if any value is invalid
 */
export function validateRGB(r: number, g: number, b: number): void {
  if (!Number.isInteger(r) || !Number.isInteger(g) || !Number.isInteger(b) ||
      r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    throw new Error('RGB values must be integers between 0 and 255');
  }
}

/**
 * Validates 256-color code
 * 
 * @param code - Color code (0-255)
 * @throws Error if code is invalid
 */
export function validate256Color(code: number): void {
  if (!Number.isInteger(code) || code < 0 || code > 255) {
    throw new Error('256 color code must be an integer between 0 and 255');
  }
}

/**
 * Validates dimensions for block creation
 * 
 * @param width - The width to validate
 * @param height - The height to validate
 * @throws Error if dimensions are invalid
 */
export function validateDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || width < 1) {
    throw new Error(`Width must be a positive integer, got: ${width}`);
  }
  if (!Number.isInteger(height) || height < 1) {
    throw new Error(`Height must be a positive integer, got: ${height}`);
  }
}

/**
 * Validates buffer allocation size against maximum limits
 * 
 * @param size - The requested buffer size
 * @param maxSize - The maximum allowed buffer size
 * @throws Error if size exceeds maximum
 */
export function validateBufferSize(size: number, maxSize: number): void {
  if (size > maxSize) {
    throw new Error(`Requested buffer size ${size} exceeds maximum allowed size ${maxSize}`);
  }
} 