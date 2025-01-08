import type { RGB } from './types';

interface Cell {
  char: string;
  fg?: RGB;
  bg?: RGB;
}

export class TerminalBuffer {
  private buffer: Cell[][];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.buffer = Array(height).fill(null).map(() =>
      Array(width).fill(null).map(() => ({ char: ' ' }))
    );
  }

  public setCell(x: number, y: number, cell: Cell) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.buffer[y][x] = { ...cell };
    }
  }

  public getCell(x: number, y: number): Cell | null {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return { ...this.buffer[y][x] };
    }
    return null;
  }

  public clear() {
    this.buffer = Array(this.height).fill(null).map(() =>
      Array(this.width).fill(null).map(() => ({ char: ' ' }))
    );
  }

  public clearRegion(x: number, y: number, width: number, height: number) {
    for (let cy = y; cy < Math.min(y + height, this.height); cy++) {
      for (let cx = x; cx < Math.min(x + width, this.width); cx++) {
        this.buffer[cy][cx] = { char: ' ' };
      }
    }
  }

  public getSize() {
    return { width: this.width, height: this.height };
  }

  private colorToAnsi(color: RGB): string {
    return `\x1b[38;2;${color.r};${color.g};${color.b}m`;
  }

  private bgColorToAnsi(color: RGB): string {
    return `\x1b[48;2;${color.r};${color.g};${color.b}m`;
  }

  public writeText(x: number, y: number, text: string, style: { fg?: RGB; bg?: RGB } = {}) {
    const chars = [...text];
    chars.forEach((char, i) => {
      if (x + i < this.width) {
        this.setCell(x + i, y, {
          char,
          fg: style.fg,
          bg: style.bg
        });
      }
    });
  }

  public renderRegion(x: number, y: number, width: number, height: number): string {
    let output = '';
    for (let cy = y; cy < Math.min(y + height, this.height); cy++) {
      for (let cx = x; cx < Math.min(x + width, this.width); cx++) {
        const cell = this.buffer[cy][cx];
        if (cell.fg) output += this.colorToAnsi(cell.fg);
        if (cell.bg) output += this.bgColorToAnsi(cell.bg);
        output += cell.char;
        if (cell.fg || cell.bg) output += '\x1b[0m';
      }
      output += '\n';
    }
    return output;
  }

  public render(): string {
    return this.renderRegion(0, 0, this.width, this.height);
  }
} 