import { bunhance } from "../src";
import type { RGBTuple } from "../src/types";

async function sunsetDemo() {
  const WIDTH = 60;
  const HEIGHT = 20;

  // Sky gradient colors (more natural transitions)
  const skyColors: RGBTuple[] = [
    [20, 20, 80],   // Darker blue
    [40, 50, 120],  // Deep blue
    [80, 100, 180], // Medium blue
    [255, 120, 80], // Orange-red
    [255, 180, 100],// Light orange
  ];

  // Create a smoother sky gradient
  for (let i = 0; i < HEIGHT / 2; i++) {
    const gradientColors = i < HEIGHT / 4 ? skyColors.slice(0, 3) : skyColors.slice(2);
    console.log(bunhance.gradientBlock(gradientColors, WIDTH, 1));
  }

  // Create a more realistic sun (smaller, more intense)
  const sunColor: RGBTuple = [255, 255, 100]; // Bright yellow
  const sunSize = 4;
  const sunPadding = Math.floor((WIDTH - sunSize) / 2);
  const sunHeight = Math.floor(HEIGHT / 2 - sunSize / 2);

  for (let i = 0; i < sunSize; i++) {
    console.log(
      " ".repeat(sunPadding) +
      bunhance.colorBlock(sunColor, sunSize, 1) +
      " ".repeat(sunPadding)
    );
  }

  // Create more detailed mountains
  const mountainColor: RGBTuple = [40, 40, 60]; // Darker mountains
  const mountainBase = HEIGHT - 4;

  // Left mountain
  console.log(
    " ".repeat(5) +
    bunhance.colorBlock(mountainColor, 5, 1) +
    " ".repeat(WIDTH - 10)
  );
  console.log(
    " ".repeat(3) +
    bunhance.colorBlock(mountainColor, 9, 1) +
    " ".repeat(WIDTH - 12)
  );

  // Right mountain
  console.log(
    " ".repeat(WIDTH - 25) +
    bunhance.colorBlock(mountainColor, 8, 1) +
    " ".repeat(17)
  );
  console.log(
    " ".repeat(WIDTH - 20) +
    bunhance.colorBlock(mountainColor, 6, 1) +
    " ".repeat(14)
  );

  // Ground (more subtle gradient)
  const groundColors: RGBTuple[] = [
    [60, 30, 60],   // Darker purple
    [80, 40, 70],   // Slightly lighter purple
  ];

  for (let i = 0; i < 2; i++) {
    console.log(bunhance.gradientBlock(groundColors, WIDTH, 1));
  }

  // Add stars (more realistic placement)
  const stars = [
    { x: 5, y: 2 }, { x: 12, y: 4 }, { x: 20, y: 1 }, { x: 35, y: 3 }, { x: 48, y: 2 }, { x: 55, y: 4 }
  ];

  for (const star of stars) {
    console.log(
      "\x1b[" + star.y + ";" + star.x + "H" + // Move cursor to star position
      bunhance.white("*") +
      "\x1b[0m" // Reset styling
    );
  }

  console.log(); // Add a final newline
}

sunsetDemo().catch(console.error);
