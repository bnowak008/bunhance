import { describe, expect, it } from "bun:test";
import { createGradient } from "../src/styles/gradient";

describe("Gradient System", () => {
  const text = "Hello World";

  describe("Basic Functionality", () => {
    it("should create a basic horizontal gradient", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"]);
      expect(result).toContain("\x1b[38;2;");
      expect(result).toContain(text);
      expect(result).toContain("\x1b[0m");
    });

    it("should handle different color formats", () => {
      const result = createGradient(text, [
        { r: 255, g: 0, b: 0 },
        { h: 240, s: 100, l: 50 },
        "#00ff00"
      ]);
      expect(result).toContain("\x1b[38;2;");
    });
  });

  describe("Gradient Directions", () => {
    it("should create horizontal gradients", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"], {
        direction: "horizontal"
      });
      expect(result).toContain("\x1b[38;2;");
    });

    it("should create vertical gradients", () => {
      const multiline = "Hello\nWorld";
      const result = createGradient(multiline, ["#ff0000", "#0000ff"], {
        direction: "vertical"
      });
      expect(result.split("\n")).toHaveLength(2);
    });

    it("should create radial gradients", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"], {
        direction: "radial"
      });
      expect(result).toContain("\x1b[38;2;");
    });

    it("should create conic gradients", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"], {
        direction: "conic"
      });
      expect(result).toContain("\x1b[38;2;");
    });
  });

  describe("Interpolation Options", () => {
    it("should support linear interpolation", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"], {
        interpolation: "linear"
      });
      expect(result).toContain("\x1b[38;2;");
    });

    it("should support bezier interpolation", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"], {
        interpolation: "bezier"
      });
      expect(result).toContain("\x1b[38;2;");
    });
  });

  describe("Color Space Options", () => {
    it("should interpolate in RGB space", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"], {
        colorSpace: "rgb"
      });
      expect(result).toContain("\x1b[38;2;");
    });

    it("should interpolate in HSL space", () => {
      const result = createGradient(text, ["#ff0000", "#0000ff"], {
        colorSpace: "hsl"
      });
      expect(result).toContain("\x1b[38;2;");
    });
  });

  describe("Color Stops", () => {
    it("should support custom color stops", () => {
      const result = createGradient(text, ["#ff0000", "#00ff00", "#0000ff"], {
        stops: [0, 0.8, 1]
      });
      expect(result).toContain("\x1b[38;2;");
    });
  });

  describe("Error Handling", () => {
    it("should throw on invalid colors", () => {
      // @ts-expect-error
      expect(() => createGradient(text, ["invalid"])).toThrow();
    });

    it("should throw on empty color array", () => {
      expect(() => createGradient(text, [])).toThrow();
    });

    it("should throw on invalid gradient options", () => {
      expect(() => createGradient(text, ["#ff0000", "#0000ff"], {
        direction: "invalid" as any
      })).toThrow();
    });
  });

  describe("Performance", () => {
    it("should handle long text efficiently", () => {
      const longText = "x".repeat(1000);
      const start = performance.now();
      createGradient(longText, ["#ff0000", "#0000ff"]);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });
  });
}); 