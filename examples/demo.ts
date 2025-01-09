import { bunhance } from "../src";
import { createAnimationManager } from "../src/animation/manager";
import type { AnimationState } from "../src/types";

// Add NodeJS process type
declare const process: NodeJS.Process;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Terminal control sequences
const terminal = {
  clearLine: '\x1B[2K',
  moveUp: (n: number) => `\x1B[${n}A`,
  moveDown: (n: number) => `\x1B[${n}B`,
  moveToStart: '\r',
  saveCursor: '\x1B[s',
  restoreCursor: '\x1B[u'
};

async function demo() {
  // Hide cursor during demo
  process.stdout.write('\x1B[?25l');
  
  // Restore cursor on exit
  process.on('exit', () => {
    process.stdout.write('\x1B[?25h');
  });
  
  // Handle Ctrl+C
  process.on('SIGINT', () => {
    process.stdout.write('\x1B[?25h');
    process.exit(0);
  });

  // Title
  console.log(bunhance.gradient("#ff0000", "#00ff00", "#0000ff")("=== Bunhance Demo ==="));
  console.log(bunhance.dim("A showcase of terminal styling capabilities\n"));
  await sleep(2000);

  // Rainbow Animation
  console.log("Rainbow Animation:");
  const manager = createAnimationManager(process.stdout.columns || 80, 1);
  
  const animation = {
    id: 'rainbow',
    region: { x: 0, y: 0, width: process.stdout.columns || 80, height: 1 },
    render: (buffer, frame) => {
      const progress = (frame % 360) / 360;
      const baseHue = progress * 360;
      const text = "🌈 Rainbow Text";
      
      let output = '';
      for (let i = 0; i < text.length; i++) {
        const hue = (baseHue + (i * 30)) % 360;
        const { r, g, b } = bunhance.hslToRgb(hue, 100, 50);
        output += bunhance.rgb(r, g, b)(text[i]);
      }
      
      buffer.clearRegion(0, 0, buffer.getSize().width, 1);
      buffer.writeText(0, 0, output);
    },
    fps: 30,
    frame: 0,
    lastFrameTime: performance.now()
  };

  manager.addAnimation(animation);
  manager.start();
  
  await sleep(3000);
  manager.stop();
  manager.cleanup();
  console.log();

  // Final
  console.log(bunhance.gradient("#ff0000", "#00ff00", "#0000ff")("=== Demo Completed ==="));
  console.log(bunhance.dim("\nThank you for exploring Bunhance!"));
  await sleep(2000);
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  process.exit(0);
});

demo().catch(console.error); 