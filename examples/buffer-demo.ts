import { createAnimationManager } from "../src/animation/manager";
import { hslToRgb } from "../src/color";
import { debug } from "../src/utils/debug";
import { monitoring } from "../src/animation/events";
import { cleanup } from "../src/utils/cleanup";

/**
 * Cell animation configuration
 */
type CellAnimation = {
  char: string;
  hue: number;
  brightness: number;
  phase: number;
  metrics?: ReturnType<typeof monitoring.createMetrics>;
};

async function demo() {
  // Configure debug output
  debug.configure({
    enabled: true,
    logLevel: 'info',
    logToFile: false,
    logFilePath: '',
    includeTimestamp: true,
    includeMemory: true
  });
  
  // Create animation manager with performance monitoring
  const manager = createAnimationManager(40, 20);
  const managerMetrics = monitoring.createMetrics();
  
  // Simple character set
  const chars = ['·', '○', '●'];
  
  // Create animation state with metrics
  const cells: CellAnimation[][] = Array(16).fill(null).map(() =>
    Array(40).fill(null).map(() => ({
      char: chars[0],
      hue: Math.random() * 360,
      brightness: 0.5,
      phase: Math.random() * Math.PI * 2,
      metrics: monitoring.createMetrics()
    }))
  );
  
  const state = {
    paused: false,
    mode: 0,  // 0: wave, 1: pulse
    speed: 1.0,
    showMetrics: false
  };
  
  // Setup static UI
  manager.updateUI(buffer => {
    // Top border
    buffer.writeText(0, 0, '╭' + '─'.repeat(38) + '╮', {
      fg: { r: 150, g: 150, b: 150 }
    });
    
    // Bottom border
    buffer.writeText(0, 18, '╰' + '─'.repeat(38) + '╯', {
      fg: { r: 150, g: 150, b: 150 }
    });
    
    // Controls
    buffer.writeText(2, 19, "Space: Pause | M: Mode | +/-: Speed | Tab: Stats", {
      fg: { r: 200, g: 200, b: 200 }
    });
  });
  
  // Function to update status line
  const updateStatus = () => {
    const modes = ['Wave', 'Pulse'];
    let status = ` Mode: ${modes[state.mode]} | Speed: ${state.speed.toFixed(1)}x `;
    
    if (state.showMetrics) {
      const metrics = manager.getMetrics();
      status += `| FPS: ${(1000 / metrics.frameTime).toFixed(1)} `;
      status += `| Dropped: ${metrics.droppedFrames} `;
      status += `| Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB `;
    }
    
    manager.updateUI(buffer => {
      buffer.writeText(2, 1, status.padEnd(36), {
        fg: { r: 255, g: 255, b: 255 }
      });
    });
  };
  
  // Handle keyboard input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', (key: string) => {
    if (key === '\u0003') { // Ctrl+C
      cleanup.cleanupAll();
      manager.cleanup();
      process.exit();
    }
    
    switch (key) {
      case ' ':
        state.paused = !state.paused;
        debug.info(`Animation ${state.paused ? 'paused' : 'resumed'}`);
        break;
      
      case 'm':
      case 'M':
        state.mode = (state.mode + 1) % 2;
        debug.info(`Mode changed to: ${state.mode === 0 ? 'Wave' : 'Pulse'}`);
        break;
      
      case '+':
        state.speed = Math.min(5.0, state.speed + 0.1);
        debug.info(`Speed increased to: ${state.speed.toFixed(1)}x`);
        break;
      
      case '-':
        state.speed = Math.max(0.1, state.speed - 0.1);
        debug.info(`Speed decreased to: ${state.speed.toFixed(1)}x`);
        break;
      
      case '\t':
        state.showMetrics = !state.showMetrics;
        debug.info(`Metrics display ${state.showMetrics ? 'enabled' : 'disabled'}`);
        break;
    }
    
    updateStatus();
  });
  
  // Create main animation
  const mainAnimation = {
    id: 'main',
    region: { x: 1, y: 2, width: 38, height: 16 },
    fps: 60,
    frame: 0,
    lastFrameTime: performance.now(),
    render: (buffer, frame) => {
      if (state.paused) return;
      
      const time = frame * 0.016 * state.speed; // ~60fps
      
      for (let y = 0; y < cells.length; y++) {
        for (let x = 0; x < cells[y].length; x++) {
          const cell = cells[y][x];
          
          try {
            // Update cell state
            if (state.mode === 0) { // Wave
              cell.brightness = Math.sin(time + cell.phase + x * 0.2 + y * 0.1) * 0.3 + 0.7;
            } else { // Pulse
              cell.brightness = Math.sin(time + cell.phase) * 0.3 + 0.7;
            }
            
            // Convert HSL to RGB
            const { r, g, b } = hslToRgb(cell.hue, 100, cell.brightness * 100);
            
            // Render cell
            buffer.setCell(x + 1, y + 2, {
              char: chars[Math.floor(cell.brightness * (chars.length - 0.01))],
              fg: { r, g, b }
            });
            
            // Update metrics
            if (cell.metrics) {
              monitoring.updateMetrics(cell.metrics);
            }
          } catch (error) {
            debug.error(`Cell render error at (${x}, ${y}):`, error);
          }
        }
      }
      
      // Update manager metrics
      monitoring.updateMetrics(managerMetrics);
    }
  };
  
  // Start animation
  manager.addAnimation(mainAnimation);
  manager.start();
  
  // Initial status update
  updateStatus();
  
  debug.info('Demo started');
}

// Run demo
demo().catch(error => {
  debug.error('Demo error:', error);
  process.exit(1);
}); 