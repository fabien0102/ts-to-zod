import { sep } from "path";
import { countNetParentDirectoriesInRelativePath } from "./countNetParentDirectoriesInRelativePath";

describe("countNetUpFoldersInRelativePath", () => {
  it("should return 0 for an empty string", () => {
    expect(countNetParentDirectoriesInRelativePath("")).toBe(0);
  });

  it("should return 0 for a path with no parent directory", () => {
    expect(
      countNetParentDirectoriesInRelativePath(`folder${sep}file.txt`)
    ).toBe(0);
  });

  it("should return 1 for a path with one parent directory", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        `..${sep}folder1${sep}folder2${sep}file.txt`
      )
    ).toBe(1);
  });

  it("should return 2 for a path with two parent directories", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        `..${sep}..${sep}folder1${sep}folder2${sep}folder3${sep}file.txt`
      )
    ).toBe(2);
  });

  it("should return 2 for a path with two parent directories not at the beginining", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        `..${sep}folder1${sep}..${sep}..${sep}folder2${sep}folder3${sep}file.txt`
      )
    ).toBe(2);
  });

  it("should return 3 for a path with 3 parent directories not at the beginining with more folders in between", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        `..${sep}folder1${sep}folder2${sep}..${sep}..${sep}..${sep}..${sep}${sep}folder3${sep}file.txt`
      )
    ).toBe(3);
  });
});
