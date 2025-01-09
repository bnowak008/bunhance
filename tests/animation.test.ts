import { describe, expect, it } from "bun:test";
import { bunhance } from "../src";
import { rainbow, pulse, wave, type as typeAnim, glitch, sparkle, zoom, rotate, slide } from "../src/animation/effects";
import { createAnimation, createAnimationState } from "../src/animation/engine";
import { defaultEasing } from "../src/animation/easing";
import type { RGB, AnimationOptions } from "../src/types";

describe("Animation", () => {
  it("should create basic animation", () => {
    const { state } = rainbow("test");
    expect(state.frames).toHaveLength(360);
  });

  it("should create rainbow animation", () => {
    const { state } = rainbow("test");
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create pulse animation", () => {
    const { state } = pulse("test", { r: 255, g: 0, b: 0 });
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should start and stop animation", async () => {
    const animation = rainbow("test");
    const frames: string[] = [];
    
    animation.state.onFrame = frame => frames.push(frame.content);
    animation.start();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    animation.stop();
    
    expect(frames.length).toBeGreaterThan(0);
  });
});

describe("Animation Effects", () => {
  const red: RGB = { r: 255, g: 0, b: 0 };

  it("should create wave effect", () => {
    const { state } = wave("Hello", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create typing effect", () => {
    const { state } = typeAnim("Hello", red);
    expect(state.frames.length).toBe(6); // "", "H", "He", "Hel", "Hell", "Hello"
  });

  it("should create glitch effect", () => {
    const { state } = glitch("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create sparkle effect", () => {
    const { state } = sparkle("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create zoom effect", () => {
    const { state } = zoom("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create rotate effect", () => {
    const { state } = rotate("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should create slide effect", () => {
    const { state } = slide("Test", red);
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should support custom easing", () => {
    const { state } = wave("Test", red, { 
      easing: defaultEasing 
    });
    expect(state.frames.length).toBeGreaterThan(0);
  });

  it("should compose animations", () => {
    const anim1 = wave("Test", red);
    const anim2 = sparkle("Test", red);
    const composed = bunhance.compose([anim1, anim2], 'sequence');
    expect(composed.animations).toHaveLength(2);
    expect(composed.type).toBe('sequence');
  });
});

describe("Animation Composition", () => {
  it("should compose animations in sequence", async () => {
    const anim1 = bunhance.wave("Hello", { r: 255, g: 0, b: 0 });
    const anim2 = bunhance.sparkle("World", { r: 0, g: 255, b: 0 });
    
    const composite = bunhance.compose([anim1, anim2], 'sequence');
    expect(composite.type).toBe('sequence');
    expect(composite.animations).toHaveLength(2);
    
    let frames: string[] = [];
    composite.state.onFrame = frame => frames.push(frame.content);
    
    composite.start();
    await new Promise(resolve => {
      composite.state.onComplete = () => {
        composite.stop();
        resolve(null);
      };
    });
    
    expect(frames.length).toBeGreaterThan(0);
  });

  it("should support frame interpolation", () => {
    const result = bunhance.transition(
      "Hello",
      "World",
      { r: 255, g: 0, b: 0 }
    );
    
    expect(result.state.frames.length).toBeGreaterThan(0);
  });
}); 