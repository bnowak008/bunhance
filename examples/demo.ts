import { bunhance } from "../src";
import { Easing } from "../src/easing";

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
  // Title
  console.log(bunhance.gradient("#ff0000", "#00ff00", "#0000ff")("=== Bunhance Demo ==="));
  console.log(bunhance.dim("A showcase of terminal styling capabilities\n"));
  await sleep(2000);

  // Basic Colors
  console.log(bunhance.bold("1. Basic Colors:"));
  console.log(bunhance.red("■ Red"));
  console.log(bunhance.green("■ Green"));
  console.log(bunhance.blue("■ Blue"));
  console.log(bunhance.yellow("■ Yellow"));
  console.log(bunhance.magenta("■ Magenta"));
  console.log(bunhance.cyan("■ Cyan"));
  console.log(bunhance.white("■ White\n"));
  await sleep(2000);

  // Style Combinations
  console.log(bunhance.bold("2. Style Combinations:"));
  console.log(bunhance.red.bold("Red Bold"));
  console.log(bunhance.blue.underline("Blue Underline"));
  console.log(bunhance.green.italic("Green Italic"));
  console.log(bunhance.yellow.dim("Yellow Dim"));
  console.log(bunhance.magenta.bold.underline("Magenta Bold Underline\n"));
  await sleep(2000);

  // RGB and HSL Colors
  console.log(bunhance.bold("3. Custom Colors:"));
  console.log(bunhance.rgb(255, 100, 0)("■ RGB Orange"));
  console.log(bunhance.rgb(128, 0, 255)("■ RGB Purple"));
  console.log(bunhance.hsl(280, 100, 50)("■ HSL Purple"));
  console.log(bunhance.hsl(180, 100, 50)("■ HSL Cyan\n"));
  await sleep(2000);

  // Gradients
  console.log(bunhance.bold("4. Gradients:"));
  console.log(bunhance.gradient("#ff0000", "#00ff00")("Red to Green"));
  console.log(bunhance.gradient("blue", "#800080")("Blue to Purple"));
  console.log(bunhance.gradient("#ff0000", "#00ff00", "#0000ff")("Rainbow"));
  console.log(bunhance.gradient("cyan", "magenta")("Cyan to Magenta\n"));
  await sleep(2000);

  // Animations
  console.log(bunhance.bold("5. Animations:"));
  
  async function runAnimation(name: string, animationFn: () => { state: any, cleanup: () => void }) {
    // Print the animation name and save its position
    console.log(name);
    console.log(""); // Line for the animation
    process.stdout.write(terminal.saveCursor);
    process.stdout.write(terminal.moveUp(1) + terminal.clearLine + terminal.moveToStart);
    
    // Run the animation and get state
    const { state, cleanup } = animationFn();
    await sleep(3000);
    
    // Clean up but don't clear the animation
    bunhance.stop(state);
    cleanup?.();
    
    // Move to the next line for the next animation
    process.stdout.write('\n');
  }

  // Run each animation in sequence
  await runAnimation("Rainbow Animation:", () => {
    const state = bunhance.rainbow("🌈 Rainbow Text", { fps: 30 });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Sparkle Effect:", () => {
    const state = bunhance.sparkle("✨ Sparkle Magic ✨", { r: 255, g: 215, b: 0 });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Typing Effect:", () => {
    const state = bunhance.type("Hello, I am typing...", { r: 0, g: 255, b: 0 });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Wave Effect:", () => {
    const state = bunhance.wave("🌊 Wave Effect", { r: 0, g: 150, b: 255 });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Glitch Effect:", () => {
    const state = bunhance.glitch("SYSTEM MALFUNCTION", { r: 255, g: 50, b: 50 }, 2);
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Zoom Effect:", () => {
    const state = bunhance.zoom("⭐ Zoom!", { r: 255, g: 215, b: 0 });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Rotate Effect:", () => {
    const state = bunhance.rotate("Loading...", { r: 100, g: 200, b: 255 });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Slide Effect:", () => {
    const state = bunhance.slide("→ Sliding Text →", { r: 150, g: 150, b: 255 }, {
      fps: 60,
      steps: 40,
      transform: { direction: 'right', maxWidth: 30 }
    });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  await runAnimation("Pulse Effect:", () => {
    const state = bunhance.pulse("♥ Pulsing ♥", { r: 255, g: 50, b: 50 }, {
      fps: 30,
      steps: 20,
      transform: { 
        minBrightness: 0.3,
        maxBrightness: 1.0
      }
    });
    bunhance.start(state);
    return { state, cleanup: () => {} };
  });

  // Add some space after animations
  console.log("\n");

  // Themes
  console.log(bunhance.bold("6. Themes:"));
  const theme = {
    error: (text: string) => bunhance.red.bold(text),
    success: (text: string) => bunhance.green.bold(text),
    warning: (text: string) => bunhance.yellow.italic(text),
    info: (text: string) => bunhance.blue.dim(text),
    highlight: (text: string) => bunhance.magenta.bold.underline(text)
  };

  console.log(theme.error("[ERROR] Something went wrong!"));
  console.log(theme.success("[SUCCESS] Operation completed"));
  console.log(theme.warning("[WARNING] Proceed with caution"));
  console.log(theme.info("[INFO] System status normal"));
  console.log(theme.highlight("[IMPORTANT] Critical update available\n"));
  await sleep(2000);

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