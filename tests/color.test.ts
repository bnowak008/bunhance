import { describe, expect, it } from "bun:test";
import {
  mix, lighten, darken, saturate, desaturate,
  invert, alpha, complement, analogous, triadic,
  splitComplement, temperature, rgbToHsl, hslToRgb
} from "../src/color";

describe("Color Manipulation", () => {
  const red = { r: 255, g: 0, b: 0 };
  const blue = { r: 0, g: 0, b: 255 };

  it("should mix colors", () => {
    const purple = mix(red, blue);
    expect(purple).toEqual({ r: 128, g: 0, b: 128 });
  });

  it("should lighten colors", () => {
    const lightRed = lighten(red, 20);
    expect(lightRed.r).toBe(255);
    expect(lightRed.g).toBeGreaterThan(0);
    expect(lightRed.b).toBeGreaterThan(0);
  });

  it("should darken colors", () => {
    const darkRed = darken(red, 20);
    expect(darkRed.r).toBeLessThan(255);
    expect(darkRed.g).toBe(0);
    expect(darkRed.b).toBe(0);
  });

  it("should create complementary colors", () => {
    const cyan = complement(red);
    expect(cyan).toEqual({ r: 0, g: 255, b: 255 });
  });

  it("should create analogous colors", () => {
    const colors = analogous(red);
    expect(colors).toHaveLength(3);
    expect(colors[0]).not.toEqual(colors[1]);
    expect(colors[1]).not.toEqual(colors[2]);
  });

  it("should create triadic colors", () => {
    const [color1, color2, color3] = triadic(red);
    expect(color1).toEqual(red);
    expect(color2).not.toEqual(red);
    expect(color3).not.toEqual(red);
  });

  it("should adjust color temperature", () => {
    const warmer = temperature(red, 50);
    const cooler = temperature(red, -50);
    expect(warmer).not.toEqual(cooler);
  });
}); 