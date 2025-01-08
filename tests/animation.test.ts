import { describe, expect, it } from "bun:test";
import { bunhance } from "../src";
import { rainbow, pulse, wave, type as typeAnim, glitch, sparkle, zoom, rotate, slide, start, stop, chain, createState } from "../src/animation";
import { Easing } from "../src/easing";
import type { RGB, AnimationOptions } from "../src/types";

describe("Animation", () => {
  it("should create basic animation", () => {
    const state = rainbow("test");
    expect(state.frames).toHaveLength(360);
  });

  it("should create rainbow animation", () => {
    const state = rainbow("test");
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create pulse animation", () => {
    const state = pulse("test", { r: 255, g: 0, b: 0 });
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should start and stop animation", async () => {
    const state = createState({ fps: 60 });
    const frames: string[] = [];
    
    state.frames = rainbow("test").frames;
    start(state, frame => frames.push(frame.text));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    stop(state);
    
    expect(frames.length).toBeGreaterThan(0);
  });
});

describe("Animation Effects", () => {
  const red: RGB = { r: 255, g: 0, b: 0 };

  it("should create wave effect", () => {
    const state = wave("Hello", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create typing effect", () => {
    const state = typeAnim("Hello", red);
    expect(state.frames.length).toBe(6); // "", "H", "He", "Hel", "Hell", "Hello"
  });

  it("should create glitch effect", () => {
    const state = glitch("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create sparkle effect", () => {
    const state = sparkle("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create zoom effect", () => {
    const state = zoom("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create rotate effect", () => {
    const state = rotate("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create slide effect", () => {
    const state = slide("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should support custom easing", () => {
    const state = wave("Test", red, { 
      easing: Easing.easeInElastic 
    });
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should chain animations", () => {
    const state1 = wave("Test", red);
    const state2 = sparkle("Test", red);
    const chained = chain([state1, state2]);
    expect(chained.frames.length).toBe(
      state1.frames.length + state2.frames.length
    );
  });
}); 