import { TerminalBuffer } from './buffer';
import type { RGB } from './types';

interface AnimationRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Animation {
  id: string;
  region: AnimationRegion;
  render: (buffer: TerminalBuffer, frame: number) => void;
  fps: number;
  frame: number;
  lastFrameTime: number;
}

export class AnimationManager {
  private buffer: TerminalBuffer;
  private uiBuffer: TerminalBuffer;
  private animations: Map<string, Animation>;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  constructor(width: number = 5, height: number = 5) {
    this.buffer = new TerminalBuffer(width, height);
    this.uiBuffer = new TerminalBuffer(width, height);
    this.animations = new Map();
  }

  private setupBuffer() {
    // Hide cursor
    process.stdout.write('\x1B[?25l');
  }

  public updateUI(renderFn: (buffer: TerminalBuffer) => void) {
    renderFn(this.uiBuffer);
  }

  public addAnimation(
    id: string,
    region: AnimationRegion,
    renderFn: (buffer: TerminalBuffer, frame: number) => void,
    fps: number = 30
  ) {
    this.animations.set(id, {
      id,
      region,
      render: renderFn,
      fps,
      frame: 0,
      lastFrameTime: Date.now()
    });
  }

  public removeAnimation(id: string) {
    const animation = this.animations.get(id);
    if (animation) {
      this.buffer.clearRegion(
        animation.region.x,
        animation.region.y,
        animation.region.width,
        animation.region.height
      );
      this.animations.delete(id);
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.setupBuffer();

    const renderLoop = () => {
      // Clear animation buffer
      this.buffer.clear();

      // Render animations
      for (const animation of this.animations.values()) {
        const now = Date.now();
        const frameTime = 1000 / animation.fps;
        
        if (now - animation.lastFrameTime >= frameTime) {
          animation.render(this.buffer, animation.frame);
          animation.frame++;
          animation.lastFrameTime = now;
        }
      }

      // Combine buffers
      const combinedBuffer = new TerminalBuffer(this.buffer.getSize().width, this.buffer.getSize().height);
      
      // Copy animation buffer first
      for (let y = 0; y < this.buffer.getSize().height; y++) {
        for (let x = 0; x < this.buffer.getSize().width; x++) {
          const cell = this.buffer.getCell(x, y);
          if (cell) {
            combinedBuffer.setCell(x, y, cell);
          }
        }
      }

      // Overlay UI buffer on top
      for (let y = 0; y < this.uiBuffer.getSize().height; y++) {
        for (let x = 0; x < this.uiBuffer.getSize().width; x++) {
          const cell = this.uiBuffer.getCell(x, y);
          if (cell && cell.char !== ' ') {
            combinedBuffer.setCell(x, y, cell);
          }
        }
      }

      // Clear screen and render
      process.stdout.write('\x1B[2J');  // Clear entire screen
      process.stdout.write('\x1B[H');   // Move cursor to home position
      process.stdout.write(combinedBuffer.render());
    };

    this.intervalId = setInterval(renderLoop, 1000 / 60);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    
    // Show cursor
    process.stdout.write('\x1B[?25h');
  }

  public clear() {
    this.buffer.clear();
    this.uiBuffer.clear();
    this.animations.clear();
  }
} 