import {
  areRelativePathsEqualIgnoringExtension,
  countNetParentDirectoriesInRelativePath,
} from "./pathUtils";

describe("countNetUpFoldersInRelativePath", () => {
  it("should return 0 for an empty string", () => {
    expect(countNetParentDirectoriesInRelativePath("")).toBe(0);
  });

  it("should return 0 for a path with no parent directory", () => {
    expect(countNetParentDirectoriesInRelativePath(`folder/file.js`)).toBe(0);
  });

  it("should return 1 for a path with one parent directory", () => {
    expect(
      countNetParentDirectoriesInRelativePath(`../folder1/folder2/file.js`)
    ).toBe(1);
  });

  it("should return 2 for a path with two parent directories", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        `../../folder1/folder2/folder3/file.js`
      )
    ).toBe(2);
  });

  it("should return 2 for a path with two parent directories not at the beginining", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        `../folder1/../../folder2/folder3/file.js`
      )
    ).toBe(2);
  });

  it("should return 3 for a path with 3 parent directories not at the beginining with more folders in between", () => {
    expect(
      countNetParentDirectoriesInRelativePath(
        `../folder1/folder2/../../../..//folder3/file.js`
      )
    ).toBe(3);
  });
});

describe("areRelativePathsEqualIgnoringExtension", () => {
  it("should return true for the same path", () => {
    expect(
      areRelativePathsEqualIgnoringExtension(`folder/file.js`, `folder/file.js`)
    ).toBe(true);
  });

  it("should return true for the same path", () => {
    expect(areRelativePathsEqualIgnoringExtension(`./file.js`, `file.js`)).toBe(
      true
    );
  });

  it("should return true for the same path in parent directory", () => {
    expect(
      areRelativePathsEqualIgnoringExtension(`../file.js`, `../file.js`)
    ).toBe(true);
  });

  it("should return true for the same path with different extensions", () => {
    expect(
      areRelativePathsEqualIgnoringExtension(`folder/file.js`, `folder/file.ts`)
    ).toBe(true);
  });

  it("should return true for the same path with different extensions using module notation", () => {
    expect(
      areRelativePathsEqualIgnoringExtension(`../file.js`, `../file`)
    ).toBe(true);
  });

  it("should return false for different paths", () => {
    expect(
      areRelativePathsEqualIgnoringExtension(
        `folder1/file.js`,
        `folder2/file.js`
      )
    ).toBe(false);
  });

  it("should return false for different paths with different extensions", () => {
    expect(
      areRelativePathsEqualIgnoringExtension(
        `folder1/file.js`,
        `folder2/file.js`
      )
    ).toBe(false);
  });
});
