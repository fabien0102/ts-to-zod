import { describe, expect, it } from "vitest";
import { generateCombinations } from "./generateCombinations.js";

describe("generateCombinations", () => {
  it("should generate all combinations of 1 empty array", () => {
    const arrays = [[]];
    const result = generateCombinations(arrays);
    expect(result).toEqual([]);
  });

  it("should generate all combinations of 1 array", () => {
    const arrays = [["a", "b"]];
    const result = generateCombinations(arrays);
    expect(result).toEqual(["a", "b"]);
  });

  it("should generate all combinations of 2 arrays with one empty array", () => {
    const arrays = [["a", "b"], []];
    const result = generateCombinations(arrays);
    expect(result).toEqual(["a", "b"]);
  });

  it("should generate all combinations of 2 arrays", () => {
    const arrays = [
      ["a", "b"],
      ["1", "2"],
    ];
    const result = generateCombinations(arrays);
    expect(result).toEqual(["a1", "a2", "b1", "b2"]);
  });

  it("should generate all combinations of 3 arrays", () => {
    const arrays = [
      ["a", "b"],
      ["1", "2"],
      ["x", "y"],
    ];
    const result = generateCombinations(arrays);
    expect(result).toEqual([
      "a1x",
      "a1y",
      "a2x",
      "a2y",
      "b1x",
      "b1y",
      "b2x",
      "b2y",
    ]);
  });

  it("should generate all combinations of 2 arrays with one array of 1", () => {
    const arrays = [["a", "b"], ["1"]];
    const result = generateCombinations(arrays);
    expect(result).toEqual(["a1", "b1"]);
  });

  it("should generate all combinations of 4 arrays with 2 arrays of 1", () => {
    const arrays = [["a", "b"], ["-"], ["x", "y"], ["$"]];
    const result = generateCombinations(arrays);

    expect(result).toEqual(["a-x$", "a-y$", "b-x$", "b-y$"]);
  });
});
