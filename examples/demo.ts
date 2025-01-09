import { bunhance } from "../src";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function demo() {
  const screen = bunhance.animations.create(20, 10);
  
  // Start the animation manager
  screen.start();

  // Animate a simple pattern
  let t = 0;
  const interval = setInterval(() => {
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 20; x++) {
        const color = {
          r: Math.floor(128 + 127 * Math.sin(x * 0.2 + t)),
          g: Math.floor(128 + 127 * Math.sin(y * 0.2 + t)),
          b: Math.floor(128 + 127 * Math.sin((x + y) * 0.2 + t))
        };
        screen.update(x, y, '█', color);
      }
    }
    t += 0.1;
  }, 16);

  await sleep(5000);
  clearInterval(interval);
  screen.stop();
}

demo().catch(console.error); 