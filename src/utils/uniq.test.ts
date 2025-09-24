import { describe, expect, it } from "vitest";
import { uniq } from "./uniq.js";

describe("uniq", () => {
  it("should remove duplicate values", () => {
    expect(uniq(["a", "b", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});
