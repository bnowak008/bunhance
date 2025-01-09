import type { RGB } from '../types';
import { buffers } from './buffer';
import { debug } from '../utils/debug';

/**
 * Terminal cell configuration
 */
type Cell = {
  char: string;
  fg?: RGB;
  bg?: RGB;
};

/**
 * Terminal buffer state
 */
type TerminalBufferState = {
  buffer: Cell[][];
  width: number;
  height: number;
  renderBuffer: Uint8Array;
};

/**
 * Creates a terminal buffer for efficient text rendering
 */
export function createTerminalBuffer(width: number, height: number) {
  const state: TerminalBufferState = {
    width,
    height,
    buffer: Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({ char: ' ' }))
    ),
    renderBuffer: buffers.acquire(width * height * 20) // Account for ANSI codes
  };

  /**
   * Checks if a position is valid
   */
  function isValidPosition(x: number, y: number): boolean {
    return x >= 0 && x < state.width && y >= 0 && y < state.height;
  }

  /**
   * Converts RGB to ANSI foreground color code
   */
  function colorToAnsi(color: RGB): string {
    return `\x1b[38;2;${color.r};${color.g};${color.b}m`;
  }

  /**
   * Converts RGB to ANSI background color code
   */
  function bgColorToAnsi(color: RGB): string {
    return `\x1b[48;2;${color.r};${color.g};${color.b}m`;
  }

  return {
    /**
     * Sets a cell in the buffer
     */
    setCell(x: number, y: number, cell: Cell): void {
      if (isValidPosition(x, y)) {
        state.buffer[y][x] = { ...cell };
      } else {
        debug.warn(`Invalid cell position: (${x}, ${y})`);
      }
    },

    /**
     * Gets a cell from the buffer
     */
    getCell(x: number, y: number): Cell | null {
      if (isValidPosition(x, y)) {
        return { ...state.buffer[y][x] };
      }
      return null;
    },

    /**
     * Clears the entire buffer
     */
    clear(): void {
      state.buffer = Array(state.height).fill(null).map(() =>
        Array(state.width).fill(null).map(() => ({ char: ' ' }))
      );
    },

    /**
     * Clears a region of the buffer
     */
    clearRegion(x: number, y: number, width: number, height: number): void {
      const startX = Math.max(0, x);
      const startY = Math.max(0, y);
      const endX = Math.min(x + width, state.width);
      const endY = Math.min(y + height, state.height);

      for (let cy = startY; cy < endY; cy++) {
        for (let cx = startX; cx < endX; cx++) {
          state.buffer[cy][cx] = { char: ' ' };
        }
      }
    },

    /**
     * Gets the buffer size
     */
    getSize(): { width: number; height: number } {
      return { width: state.width, height: state.height };
    },

    /**
     * Writes text to the buffer
     */
    writeText(
      x: number,
      y: number,
      text: string,
      style: { fg?: RGB; bg?: RGB } = {}
    ): void {
      if (!isValidPosition(x, y)) {
        debug.warn(`Invalid text position: (${x}, ${y})`);
        return;
      }

      const chars = [...text];
      chars.forEach((char, i) => {
        if (isValidPosition(x + i, y)) {
          this.setCell(x + i, y, {
            char,
            fg: style.fg,
            bg: style.bg
          });
        }
      });
    },

    /**
     * Renders a region of the buffer
     */
    renderRegion(
      x: number,
      y: number,
      width: number,
      height: number
    ): string {
      const startX = Math.max(0, x);
      const startY = Math.max(0, y);
      const endX = Math.min(x + width, state.width);
      const endY = Math.min(y + height, state.height);

      let offset = 0;
      const encoder = new TextEncoder();

      for (let cy = startY; cy < endY; cy++) {
        for (let cx = startX; cx < endX; cx++) {
          const cell = state.buffer[cy][cx];

          // Add color codes
          if (cell.fg) {
            const fgCode = colorToAnsi(cell.fg);
            const fgBytes = encoder.encode(fgCode);
            state.renderBuffer.set(fgBytes, offset);
            offset += fgBytes.length;
          }

          if (cell.bg) {
            const bgCode = bgColorToAnsi(cell.bg);
            const bgBytes = encoder.encode(bgCode);
            state.renderBuffer.set(bgBytes, offset);
            offset += bgBytes.length;
          }

          // Add character
          const charBytes = encoder.encode(cell.char);
          state.renderBuffer.set(charBytes, offset);
          offset += charBytes.length;

          // Reset colors if needed
          if (cell.fg || cell.bg) {
            const resetBytes = encoder.encode('\x1b[0m');
            state.renderBuffer.set(resetBytes, offset);
            offset += resetBytes.length;
          }
        }

        // Add newline
        const newlineBytes = encoder.encode('\n');
        state.renderBuffer.set(newlineBytes, offset);
        offset += newlineBytes.length;
      }

      return new TextDecoder().decode(state.renderBuffer.subarray(0, offset));
    },

    /**
     * Renders the entire buffer
     */
    render(): string {
      return this.renderRegion(0, 0, state.width, state.height);
    },

    /**
     * Cleans up resources
     */
    cleanup(): void {
      buffers.release(state.renderBuffer);
    }
  };
}

// Export types
export type TerminalBuffer = ReturnType<typeof createTerminalBuffer>; 