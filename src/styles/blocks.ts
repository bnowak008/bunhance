import type { RGBTuple } from "../types";
import { validateDimensions } from "../utils/validation";

/**
 * Pre-allocated buffers and constants for text encoding/decoding.
 * Using Bun's native I/O operations for optimal performance.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Use Bun's platform-specific newline detection
const newline = Bun.env.OS === 'windows' ? '\r\n' : '\n';
const newlineBytes = encoder.encode(newline);

// Pre-encode common characters for reuse
const spaceBytes = encoder.encode(' ');
const blockBytes = encoder.encode('█');

/**
 * Creates a line buffer using Bun's optimized memory operations.
 * 
 * @param char - The character bytes to repeat
 * @param width - Number of repetitions
 * @returns Optimized Uint8Array containing the repeated characters
 */
function createLine(char: Uint8Array, width: number): Uint8Array {
  // Use a single allocation for better performance
  const lineBytes = new Uint8Array(char.length * width);
  
  // Copy first character
  lineBytes.set(char, 0);
  
  // Double the content repeatedly to fill the buffer
  let filled = char.length;
  while (filled < lineBytes.length) {
    const toCopy = Math.min(filled, lineBytes.length - filled);
    lineBytes.set(lineBytes.subarray(0, toCopy), filled);
    filled += toCopy;
  }
  
  return lineBytes;
}

/**
 * Validates that a buffer has sufficient size for the required operation.
 * 
 * @param buffer - The buffer to validate
 * @param needed - The required size in bytes
 * @throws Error if the buffer is too small
 */
function validateBuffer(buffer: Uint8Array, needed: number): void {
  if (buffer.length < needed) {
    throw new Error(`Buffer size ${buffer.length} is too small for required size ${needed}`);
  }
}

/**
 * Creates a block using the provided buffer and character bytes.
 * Internal helper function to reduce code duplication.
 */
function createBufferedBlock(
  charBytes: Uint8Array,
  width: number,
  height: number,
  buffer: Uint8Array
): string {
  validateDimensions(width, height);
  
  const lineSize = charBytes.length * width;
  const totalSize = lineSize * height + (height - 1) * newlineBytes.length;
  
  validateBuffer(buffer, totalSize);
  
  const firstLine = createLine(charBytes, width);
  buffer.set(firstLine, 0);
  
  let offset = lineSize;
  for (let i = 1; i < height; i++) {
    buffer.set(newlineBytes, offset);
    offset += newlineBytes.length;
    buffer.set(firstLine, offset);
    offset += lineSize;
  }
  
  return decoder.decode(buffer.subarray(0, totalSize));
}

// Export existing functions with added validation
export function createBlock(width: number = 1, height: number = 1, buffer: Uint8Array): string {
  return createBufferedBlock(blockBytes, width, height, buffer);
}

export function createBgBlock(width: number = 1, height: number = 1, buffer: Uint8Array): string {
  return createBufferedBlock(spaceBytes, width, height, buffer);
}

export function createBgColorBlock(color: RGBTuple, width: number = 1, height: number = 1): string {
  validateDimensions(width, height);
  const line = decoder.decode(createLine(spaceBytes, width));
  return Array(height).fill(line).join(newline);
}

/**
 * Creates a block template for gradient application.
 * Each character will be individually colorable by the gradient system.
 */
export function createGradientBlock(width: number = 1, height: number = 1): string {
  validateDimensions(width, height);
  
  // Create a block character for each position to allow individual coloring
  const blockChar = '█';
  const lines: string[] = [];
  
  for (let y = 0; y < height; y++) {
    const chars: string[] = [];
    for (let x = 0; x < width; x++) {
      chars.push(blockChar);
    }
    lines.push(chars.join(''));
  }
  
  return lines.join(newline);
} 