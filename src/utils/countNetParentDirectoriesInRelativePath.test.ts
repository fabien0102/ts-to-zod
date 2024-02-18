import { countNetParentDirectoriesInRelativePath } from "./countNetParentDirectoriesInRelativePath";

describe("countNetUpFoldersInRelativePath", () => {
  it("should return 0 for an empty string", () => {
    expect(countNetParentDirectoriesInRelativePath("")).toBe(0);
  });

  it("should return 0 for a path with no parent directory", () => {
    expect(countNetParentDirectoriesInRelativePath("folder/file.txt")).toBe(0);
  });

  it("should return 1 for a path with one parent directory", () => {
    expect(
      countNetParentDirectoriesInRelativePath("../folder1/folder2/file.txt")
    ).toBe(1);
  });

  it("should return 2 for a path with two parent directories", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        "../../folder1/folder2/folder3/file.txt"
      )
    ).toBe(2);
  });

  it("should return 2 for a path with two parent directories not at the beginining", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        "../folder1/../../folder2/folder3/file.txt"
      )
    ).toBe(2);
  });

  it("should return 3 for a path with 3 parent directories not at the beginining with more folders in between", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        "../folder1/folder2/../../../..//folder3/file.txt"
      )
    ).toBe(3);
  });
});
