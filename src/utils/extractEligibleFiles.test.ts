/* eslint-disable @typescript-eslint/no-explicit-any */

import { extractEligibleFiles } from "./extractEligibleFiles";

import mock from "mock-fs";

describe("extractEligibleFiles", () => {
  afterEach(() => {
    mock.restore();
  });

  it("should return an empty array from an empty folder", () => {
    const rootFolderPath = "dummyPath";
    mock({ dummyPath: {} });

    const result = extractEligibleFiles(rootFolderPath);

    expect(result).toEqual([]);
  });

  it('should return only ".ts" files from folder', () => {
    const rootFolderPath = "dummyPath";
    mock({
      dummyPath: {
        "file1.ts": "content of file1",
        "file2.txt": "content of file2",
        "file3.png": "content of file3",
        "file4.ts": "content of file4",
      },
    });

    const result = extractEligibleFiles(rootFolderPath);
    expect(result).toEqual(["file1.ts", "file4.ts"]);
  });

  it("should return all .ts from root and subfolder", () => {
    const rootFolderPath = "dummyPath";

    mock({
      dummyPath: {
        "file1.ts": "content of file1",
        folder: {
          "file2.txt": "content of file1",
          folder2: {
            "file3.ts": "content of file2",
            "file3bis.jpg": "content of file2",
          },
          "file4.ts": "content of file2",
        },
        "file3.txt": "content of file3",
      },
    });

    const result = extractEligibleFiles(rootFolderPath);
    expect(result).toEqual([
      "file1.ts",
      "folder/file4.ts",
      "folder/folder2/file3.ts",
    ]);
  });
});
