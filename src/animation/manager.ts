import type { RGB, Position } from '../types';
import { 
  type UnifiedBuffer, 
  type Cell,
  acquireBuffer, 
  releaseBuffer, 
  writeToBuffer,
  readFromBuffer,
  isCellBuffer,
  createBufferManager
} from '../core/buffer';
import { type Animation, type CompositeAnimation } from '../types/animation';

type AnimationState = {
  isPlaying: boolean;
  isPaused: boolean;
  startTime: number;
  pauseTime?: number;
  frameCount: number;
  lastFrameTime: number;
  currentFps: number;
  cursorPosition: Position;
};

type ScreenState = {
  buffer: UnifiedBuffer;
  dimensions: {
    width: number;
    height: number;
    viewport: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  state: AnimationState;
  options: {
    fps: number;
    clearOnExit: boolean;
    preserveCursor: boolean;
    maxFrameSkip: number;
    vsyncEnabled: boolean;
  };
  cleanup: () => void;
  activeAnimations: Set<Animation | CompositeAnimation>;
};

const bufferManager = createBufferManager();

function createScreen(options: Partial<ScreenState['options']> & {
  width: number;
  height: number;
}): ScreenState {
  if (options.width <= 0 || options.height <= 0) {
    throw new Error('Screen dimensions must be positive');
  }

  const buffer = acquireBuffer(bufferManager, 'cell', options.width, options.height);
  
  const state: ScreenState = {
    buffer,
    dimensions: {
      width: options.width,
      height: options.height,
      viewport: {
        x: 0,
        y: 0,
        width: options.width,
        height: options.height
      }
    },
    state: {
      isPlaying: false,
      isPaused: false,
      startTime: 0,
      frameCount: 0,
      lastFrameTime: 0,
      currentFps: 0,
      cursorPosition: { x: 0, y: 0 }
    },
    options: {
      fps: options.fps || 60,
      clearOnExit: options.clearOnExit ?? true,
      preserveCursor: options.preserveCursor ?? false,
      maxFrameSkip: options.maxFrameSkip ?? 5,
      vsyncEnabled: options.vsyncEnabled ?? true
    },
    cleanup: () => {
      try {
        state.state.isPlaying = false;
        state.state.isPaused = false;
        
        // Clear any ongoing animations
        if (state.options.clearOnExit) {
          process.stdout.write('\x1B[2J\x1B[H');
        }
        
        // Restore cursor
        if (!state.options.preserveCursor) {
          process.stdout.write('\x1b[?25h');
        }
        
        // Reset terminal state
        process.stdout.write('\x1B[0m');
        
        // Properly dispose of buffer
        if (state.buffer) {
          releaseBuffer(bufferManager, state.buffer);
        }
        
        // Clean up buffer manager
        if (bufferManager) {
          bufferManager.dispose();
        }
        
        // Reset animation state
        state.state = {
          isPlaying: false,
          isPaused: false,
          startTime: 0,
          frameCount: 0,
          lastFrameTime: 0,
          currentFps: 0,
          cursorPosition: { x: 0, y: 0 }
        };
      } catch (error) {
        console.error('Screen cleanup failed:', error);
        // Attempt emergency cleanup
        try {
          process.stdout.write('\x1B[0m\x1B[?25h\x1B[2J\x1B[H');
        } catch {
          // If even emergency cleanup fails, we can't do much more
        }
      }
    },
    activeAnimations: new Set()
  };

  return state;
}

function setCell(state: ScreenState, x: number, y: number, cell: Cell): void {
  if (!isCellBuffer(state.buffer)) {
    throw new Error('Invalid buffer type for cell operations');
  }
  writeToBuffer(state.buffer, x, y, cell);
}

function render(state: ScreenState): void {
  process.stdout.write(`\x1B[${state.dimensions.viewport.y + 1};${state.dimensions.viewport.x + 1}H`);
  
  for (let y = 0; y < state.dimensions.viewport.height; y++) {
    process.stdout.write('\x1B[2K');
    for (let x = 0; x < state.dimensions.viewport.width; x++) {
      const cell = readFromBuffer(state.buffer, x, y) as Cell;
      if (cell) {
        if (cell.fg) {
          process.stdout.write(`\x1B[38;2;${cell.fg.r};${cell.fg.g};${cell.fg.b}m`);
        }
        process.stdout.write(cell.char);
        if (cell.fg) {
          process.stdout.write('\x1B[0m');
        }
      }
    }
    if (y < state.dimensions.viewport.height - 1) {
      process.stdout.write('\n');
    }
  }
}

async function startScreen(state: ScreenState): Promise<void> {
  if (state.state.isPlaying) return;
  
  process.stdout.write('\x1b[?25l');
  state.state.isPlaying = true;
  state.state.startTime = Date.now();
  state.state.lastFrameTime = state.state.startTime;
  
  const frameTime = 1000 / state.options.fps;
  let frameSkipCount = 0;
  
  while (state.state.isPlaying) {
    if (state.state.isPaused) {
      await Bun.sleep(100); // Reduced CPU usage while paused
      continue;
    }

    const now = Date.now();
    const delta = now - state.state.lastFrameTime;

    if (delta >= frameTime) {
      // Update FPS calculation
      state.state.frameCount++;
      state.state.currentFps = 1000 / delta;

      // Check if we need to skip frames
      frameSkipCount = Math.min(
        Math.floor(delta / frameTime) - 1,
        state.options.maxFrameSkip
      );

      // Render frame
      render(state);

      state.state.lastFrameTime = now - (delta % frameTime);
    } else if (state.options.vsyncEnabled) {
      // If vsync is enabled, we wait for the next frame
      await Bun.sleep(frameTime - delta);
    }
  }
}

function pauseScreen(state: ScreenState): void {
  if (!state.state.isPlaying || state.state.isPaused) return;
  state.state.isPaused = true;
  state.state.pauseTime = Date.now();
}

function resumeScreen(state: ScreenState): void {
  if (!state.state.isPlaying || !state.state.isPaused) return;
  state.state.isPaused = false;
  if (state.state.pauseTime) {
    const pauseDuration = Date.now() - state.state.pauseTime;
    state.state.startTime += pauseDuration;
    state.state.lastFrameTime += pauseDuration;
  }
}

function stopScreen(state: ScreenState): void {
  state.cleanup();
}

function setPosition(state: ScreenState, position: Position): void {
  state.state.cursorPosition = position;
}

function clearScreen(state: ScreenState): void {
  if (!isCellBuffer(state.buffer)) {
    throw new Error('Invalid buffer type for screen');
  }

  for (let y = 0; y < state.dimensions.height; y++) {
    for (let x = 0; x < state.dimensions.width; x++) {
      writeToBuffer(state.buffer, x, y, { char: ' ' });
    }
  }
}

function createCleanupHandler(state: ScreenState): () => void {
  const cleanupTasks: (() => void)[] = [];
  let isCleanedUp = false;

  return () => {
    if (isCleanedUp) return;
    isCleanedUp = true;

    // Execute all cleanup tasks
    cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Cleanup task failed:', error);
      }
    });

    // Reset terminal state
    try {
      if (state.options.clearOnExit) {
        process.stdout.write('\x1B[2J\x1B[H');
      }
      if (!state.options.preserveCursor) {
        process.stdout.write('\x1b[?25h');
      }
      process.stdout.write('\x1B[0m');
    } catch (error) {
      console.error('Terminal cleanup failed:', error);
    }

    // Release resources
    try {
      if (state.buffer) {
        releaseBuffer(bufferManager, state.buffer);
      }
      bufferManager.dispose();
    } catch (error) {
      console.error('Buffer cleanup failed:', error);
    }
  };
}

function addAnimation(state: ScreenState, animation: Animation | CompositeAnimation): void {
  state.activeAnimations.add(animation);
  if (!state.state.isPlaying) {
    startScreen(state);
  }
}

function removeAnimation(state: ScreenState, animation: Animation | CompositeAnimation): void {
  state.activeAnimations.delete(animation);
  animation.stop();
  
  if (state.activeAnimations.size === 0 && state.state.isPlaying) {
    stopScreen(state);
  }
}

export { 
  type ScreenState,
  createScreen, 
  startScreen, 
  stopScreen,
  pauseScreen,
  resumeScreen,
  setCell,
  setPosition,
  clearScreen,
  addAnimation,
  removeAnimation 
}; 