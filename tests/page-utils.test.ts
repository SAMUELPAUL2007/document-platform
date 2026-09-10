import { describe, it, expect } from "vitest";
import {
  parsePageSelection,
  parsePageOrder,
  getPagePresets,
  parsePresetValue,
  validatePageRange,
} from "../lib/processing/page-utils";

describe("parsePageSelection", () => {
  it("returns all pages when value is undefined", () => {
    const result = parsePageSelection(undefined, 5);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns all pages when value is empty string", () => {
    const result = parsePageSelection("", 5);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it("parses single page", () => {
    const result = parsePageSelection("3", 5);
    expect(result).toEqual([2]);
  });

  it("parses comma-separated pages", () => {
    const result = parsePageSelection("1,3,5", 5);
    expect(result).toEqual([0, 2, 4]);
  });

  it("parses page ranges", () => {
    const result = parsePageSelection("2-4", 5);
    expect(result).toEqual([1, 2, 3]);
  });

  it("parses mixed ranges and single pages", () => {
    const result = parsePageSelection("1,3-5,7", 10);
    expect(result).toEqual([0, 2, 3, 4, 6]);
  });

  it("deduplicates pages", () => {
    const result = parsePageSelection("1,1,2-3", 5);
    expect(result).toEqual([0, 1, 2]);
  });

  it("returns empty array when input is all out-of-range", () => {
    const result = parsePageSelection("0,100", 5);
    expect(result).toEqual([]);
  });

  it("returns empty array for reversed ranges", () => {
    const result = parsePageSelection("5-2", 5);
    expect(result).toEqual([]);
  });

  it("ignores invalid entries", () => {
    const result = parsePageSelection("abc,2,def", 5);
    expect(result).toEqual([1]);
  });

  it("returns empty array when no valid pages found", () => {
    const result = parsePageSelection("abc,def", 5);
    expect(result).toEqual([]);
  });

  it("returns all pages for single page document", () => {
    const result = parsePageSelection(undefined, 1);
    expect(result).toEqual([0]);
  });
});

describe("parsePageOrder", () => {
  it("returns all pages when value is undefined", () => {
    const result = parsePageOrder(undefined, 5);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it("returns all pages when value is empty string", () => {
    const result = parsePageOrder("", 5);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it("parses reordered pages", () => {
    const result = parsePageOrder("3,1,2", 5);
    expect(result).toEqual([2, 0, 1]);
  });

  it("parses partial order", () => {
    const result = parsePageOrder("5,2", 5);
    expect(result).toEqual([4, 1]);
  });

  it("ignores out-of-range values", () => {
    const result = parsePageOrder("3,100,1", 5);
    expect(result).toEqual([2, 0]);
  });

  it("returns all pages when no valid pages found", () => {
    const result = parsePageOrder("abc,def", 5);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("getPagePresets", () => {
  it("returns only All and First when no totalPages provided", () => {
    const presets = getPagePresets();
    expect(presets.length).toBe(2);
    const labels = presets.map((p) => p.label);
    expect(labels).toContain("All");
    expect(labels).toContain("First");
  });

  it("returns only All and First for single-page document", () => {
    const presets = getPagePresets(1);
    expect(presets.length).toBe(2);
    const labels = presets.map((p) => p.label);
    expect(labels).toContain("All");
    expect(labels).toContain("First");
  });

  it("includes Last, Even, Odd for multi-page document", () => {
    const presets = getPagePresets(5);
    const labels = presets.map((p) => p.label);
    expect(labels).toContain("All");
    expect(labels).toContain("First");
    expect(labels).toContain("Last");
    expect(labels).toContain("Even");
    expect(labels).toContain("Odd");
  });

  it("Last preset has correct value", () => {
    const presets = getPagePresets(10);
    const last = presets.find((p) => p.label === "Last");
    expect(last).toBeDefined();
    expect(last!.value).toBe("10");
  });

  it("Even preset has correct value for 5-page document", () => {
    const presets = getPagePresets(5);
    const even = presets.find((p) => p.label === "Even");
    expect(even).toBeDefined();
    expect(even!.value).toBe("2,4");
  });

  it("Odd preset has correct value for 5-page document", () => {
    const presets = getPagePresets(5);
    const odd = presets.find((p) => p.label === "Odd");
    expect(odd).toBeDefined();
    expect(odd!.value).toBe("1,3,5");
  });

  it("Even preset has correct value for 4-page document", () => {
    const presets = getPagePresets(4);
    const even = presets.find((p) => p.label === "Even");
    expect(even).toBeDefined();
    expect(even!.value).toBe("2,4");
  });

  it("Odd preset has correct value for 4-page document", () => {
    const presets = getPagePresets(4);
    const odd = presets.find((p) => p.label === "Odd");
    expect(odd).toBeDefined();
    expect(odd!.value).toBe("1,3");
  });

  it("All preset has empty string value", () => {
    const presets = getPagePresets(5);
    const all = presets.find((p) => p.label === "All");
    expect(all).toBeDefined();
    expect(all!.value).toBe("");
  });

  it("First preset has value '1'", () => {
    const presets = getPagePresets(5);
    const first = presets.find((p) => p.label === "First");
    expect(first).toBeDefined();
    expect(first!.value).toBe("1");
  });
});

describe("parsePresetValue", () => {
  it("parses All preset to all pages", () => {
    const result = parsePresetValue("", 5);
    expect(result).toEqual([0, 1, 2, 3, 4]);
  });

  it("parses First preset to first page", () => {
    const result = parsePresetValue("1", 5);
    expect(result).toEqual([0]);
  });

  it("handles single-page document with All preset", () => {
    const result = parsePresetValue("", 1);
    expect(result).toEqual([0]);
  });

  it("handles single-page document with First preset", () => {
    const result = parsePresetValue("1", 1);
    expect(result).toEqual([0]);
  });
});

describe("validatePageRange", () => {
  it("returns null for empty string", () => {
    expect(validatePageRange("")).toBeNull();
  });

  it("returns null for whitespace", () => {
    expect(validatePageRange("  ")).toBeNull();
  });

  it("returns null for valid single page", () => {
    expect(validatePageRange("3")).toBeNull();
  });

  it("returns null for valid range", () => {
    expect(validatePageRange("1-5")).toBeNull();
  });

  it("returns null for valid comma-separated pages", () => {
    expect(validatePageRange("1,3,5")).toBeNull();
  });

  it("returns null for valid mixed input", () => {
    expect(validatePageRange("1,3-5,8")).toBeNull();
  });

  it("returns error for invalid text", () => {
    expect(validatePageRange("abc")).toBe('"abc" is not a valid page number');
  });

  it("returns error for text in range", () => {
    expect(validatePageRange("abc-def")).toBe('"abc-def" contains invalid numbers');
  });

  it("returns error for reversed range", () => {
    expect(validatePageRange("5-2")).toBe('Range "5-2" has start greater than end');
  });

  it("returns error for zero page number", () => {
    expect(validatePageRange("0")).toBe("Page numbers must be at least 1");
  });

  it("returns error for negative page number", () => {
    expect(validatePageRange("-1")).toBe('"-1" contains invalid numbers');
  });

  it("returns first error for mixed valid/invalid", () => {
    const result = validatePageRange("1,abc,5");
    expect(result).toBe('"abc" is not a valid page number');
  });
});
