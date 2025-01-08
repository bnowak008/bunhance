import { describe, expect, it } from "bun:test";
import { bunhance } from "../src";
import { hslToRgb } from "../src/color";

describe("Performance Benchmarks", () => {
  it("should be fast for basic colors", () => {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      bunhance.red("test");
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(1000); // Should complete in less than 1 second
  });

  it("should be fast for gradients", () => {
    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      bunhance.gradient("#ff0000", "#00ff00")("test");
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(1000);
  });

  it("should benefit from caching", () => {
    const uncachedStart = performance.now();
    bunhance.red("test");
    const uncachedEnd = performance.now();

    const cachedStart = performance.now();
    bunhance.red("test");
    const cachedEnd = performance.now();

    expect(cachedEnd - cachedStart).toBeLessThan(uncachedEnd - uncachedStart);
  });

  it("should be fast for HSL colors", () => {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      bunhance.hsl(0, 100, 50)("test");
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(1000);
  });

  it("should be fast for HSL to RGB conversion", () => {
    const start = performance.now();
    for (let i = 0; i < 100000; i++) {
      hslToRgb(0, 100, 50);
    }
    const end = performance.now();
    expect(end - start).toBeLessThan(100);
  });
});
