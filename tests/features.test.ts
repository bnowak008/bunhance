import { describe, expect, it } from "bun:test";
import { bunhance } from "../src";
import { createTheme } from "../src/theme";

describe("Bunhance", () => {
  it("should apply basic colors", () => {
    expect(bunhance.red("test")).toBe("\x1b[31mtest\x1b[0m");
    expect(bunhance.blue("test")).toBe("\x1b[34mtest\x1b[0m");
  });

  it("should chain modifiers", () => {
    expect(bunhance.red.bold("test")).toBe("\x1b[31m\x1b[1mtest\x1b[0m");
  });

  it("should support function call syntax", () => {
    expect(bunhance("test")).toBe("test\x1b[0m");
  });

  it("should support RGB colors", () => {
    expect(bunhance.rgb(255, 0, 0)("test")).toBe("\x1b[38;2;255;0;0mtest\x1b[0m");
  });

  it("should support gradients", () => {
    const result = bunhance.gradient("#ff0000", "#0000ff")("test");
    expect(result).toContain("test");
    expect(result).toContain("\x1b[38;2;");
  });

  it("should support nested styles", () => {
    expect(bunhance.red.bold.underline("test"))
      .toBe("\x1b[31m\x1b[1m\x1b[4mtest\x1b[0m");
  });

  it("should support style config objects", () => {
    expect(bunhance({ text: "test", color: "red", bold: true }))
      .toBe("\x1b[31m\x1b[1mtest\x1b[0m");
  });

  it("should support RGB background colors", () => {
    expect(bunhance.bgRgb(255, 0, 0)("test"))
      .toBe("\x1b[48;2;255;0;0mtest\x1b[0m");
  });

  it("should support HSL colors", () => {
    expect(bunhance.hsl(0, 100, 50)("test"))
      .toBe("\x1b[38;2;255;0;0mtest\x1b[0m");
    
    expect(bunhance.hsl(120, 100, 50)("test"))
      .toBe("\x1b[38;2;0;255;0mtest\x1b[0m");
  });

  it("should support HSL background colors", () => {
    expect(bunhance.bgHsl(0, 100, 50)("test"))
      .toBe("\x1b[48;2;255;0;0mtest\x1b[0m");
  });

  it("should support HSL in style config", () => {
    expect(bunhance({ 
      text: "test", 
      hsl: [0, 100, 50], 
      bgHsl: [120, 100, 50] 
    })).toBe("\x1b[38;2;255;0;0m\x1b[48;2;0;255;0mtest\x1b[0m");
  });

  it("should support HSL in gradients", () => {
    const result = bunhance.gradient(
      { h: 0, s: 100, l: 50 }, 
      { h: 240, s: 100, l: 50 }
    )("test");
    expect(result).toContain("\x1b[38;2;");
    expect(result).toContain("test");
  });
});

describe("Gradients", () => {
  it("should support hex colors in gradients", () => {
    const result = bunhance.gradient("#ff0000", "#00ff00")("test");
    expect(result).toContain("\x1b[38;2;");
    expect(result).toContain("test");
  });

  it("should support named colors in gradients", () => {
    const result = bunhance.gradient("red", "blue")("test");
    expect(result).toContain("\x1b[38;2;");
    expect(result).toContain("test");
  });

  it("should throw on invalid gradient colors", () => {
    expect(() => bunhance.gradient("#invalid")("test"))
      .toThrow("Gradient requires at least 2 colors");
    expect(() => bunhance.gradient("#invalid", "#ff0000")("test"))
      .toThrow("Invalid hex color");
  });
});

describe("Themes", () => {
  it("should create and apply themes", () => {
    const theme = createTheme({
      error: { color: 'red', bold: true },
      success: { color: 'green' }
    });
    
    expect(theme.error("test")).toBe("\x1b[31m\x1b[1mtest\x1b[0m");
    expect(theme.success("test")).toBe("\x1b[32mtest\x1b[0m");
  });

  it("should support theme inheritance", () => {
    const theme = createTheme({
      base: { color: "blue", bold: true },
      warning: { extends: "base", color: "yellow" },
    });
    
    expect(theme.warning("test")).toBe("\x1b[33m\x1b[1mtest\x1b[0m");
  });

  it("should throw on invalid theme extension", () => {
    expect(() => createTheme({
      error: { extends: "nonexistent", color: "red" }
    })).toThrow('Theme "error" extends non-existent theme "nonexistent"');
  });

  it("should validate colors in themes", () => {
    expect(() => createTheme({
      error: { color: "invalid" as any }
    })).toThrow('Invalid color in theme "error": invalid');
  });
});

describe("Error Handling", () => {
  it("should handle invalid hex colors", () => {
    expect(() => bunhance.gradient("#invalid", "#ff0000")("test"))
      .toThrow("Invalid hex color");
  });
});
