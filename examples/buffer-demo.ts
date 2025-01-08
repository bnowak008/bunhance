import { AnimationManager } from "../src/animation-manager";
import { hslToRgb } from "../src/color";

interface CellAnimation {
  char: string;
  hue: number;
  brightness: number;
  phase: number;
}

async function demo() {
  // Smaller buffer size
  const manager = new AnimationManager(40, 20);
  manager.start();

  // Simple character set
  const chars = ['·', '○', '●'];

  // Create a smaller animation state
  const cells: CellAnimation[][] = Array(16).fill(null).map(() =>
    Array(40).fill(null).map(() => ({
      char: chars[0],
      hue: Math.random() * 360,
      brightness: 0.5,
      phase: Math.random() * Math.PI * 2
    }))
  );

  const state = {
    paused: false,
    mode: 0,  // 0: wave, 1: pulse
    speed: 1.0
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
    buffer.writeText(2, 19, "Space: Pause | M: Mode | +/-: Speed", {
      fg: { r: 200, g: 200, b: 200 }
    });
  });

  // Function to update status line
  const updateStatus = () => {
    const modes = ['Wave', 'Pulse'];
    const status = ` Mode: ${modes[state.mode]} | Speed: ${state.speed.toFixed(1)}x `;
    
    manager.updateUI(buffer => {
      buffer.writeText(2, 1, status, {
        fg: { r: 255, g: 255, b: 255 }
      });
    });
  };

  // Initial status
  updateStatus();

  // Handle input
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key: Buffer | string) => {
    const keyStr = key.toString();

    if (keyStr === '\u0003') {
      manager.stop();
      process.exit();
    }

    let changed = false;

    switch (keyStr) {
      case ' ':
        state.paused = !state.paused;
        changed = true;
        break;
      case 'm':
        state.mode = (state.mode + 1) % 2;
        changed = true;
        break;
      case '+':
        state.speed = Math.min(2.0, state.speed + 0.1);
        changed = true;
        break;
      case '-':
        state.speed = Math.max(0.1, state.speed - 0.1);
        changed = true;
        break;
    }

    if (changed) {
      updateStatus();
    }
  });

  // Add animation
  manager.addAnimation(
    "main",
    { x: 0, y: 2, width: 40, height: 16 },
    (buffer, frame) => {
      if (!state.paused) {
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 40; x++) {
            const cell = cells[y][x];

            // Update animation based on mode
            if (state.mode === 0) {  // Wave mode
              const wave = Math.sin((x + y + frame * 0.1 * state.speed) * 0.2);
              cell.brightness = 0.3 + (wave + 1) * 0.35;
              cell.hue = (frame * 0.5 + x * 2) % 360;
            } else {  // Pulse mode
              cell.phase = (cell.phase + 0.05 * state.speed) % (Math.PI * 2);
              cell.brightness = 0.3 + (Math.sin(cell.phase) * 0.5 + 0.5) * 0.7;
              cell.hue = (frame + x * 4) % 360;
            }

            // Render cell
            const color = hslToRgb(cell.hue, 85, 65);
            buffer.setCell(x, y + 2, {
              char: cell.char,
              fg: {
                r: Math.round(color.r * cell.brightness),
                g: Math.round(color.g * cell.brightness),
                b: Math.round(color.b * cell.brightness)
              }
            });
          }
        }
      }
    },
    60
  );

  await new Promise(() => {});
}

// Handle cleanup
process.on('SIGINT', () => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.exit(0);
});

demo().catch(console.error); 