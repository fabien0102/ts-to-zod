import {
  areImportPathsEqualIgnoringExtension,
  getImportPath,
} from './getImportPath';

describe('getImportPath', () => {
  it('should return a simple slash when both path are the same', () => {
    expect(getImportPath('/usr/file.js', '/usr/file.js')).toBe('/');
  });

  it('should return the import path when two files are in two separate folders', () => {
    expect(getImportPath('/usr/folder2/file.js', '/usr/folder/file2.js')).toBe(
      './../folder/file2'
    );
  });

  it('should return the import path when one file is in a subfolder of the other one', () => {
    expect(
      getImportPath('/usr/folder/file.js', '/usr/folder/folder2/file2.js')
    ).toBe('./folder2/file2');
  });

  it('should return the import path when one file is in a parent of the other one', () => {
    expect(
      getImportPath('/usr/folder/folder2/file.js', '/usr/folder/file2.js')
    ).toBe('./../file2');
  });
});

describe('areImportPathsEqualIgnoringExtension', () => {
  it('should return true for the same path', () => {
    expect(
      areImportPathsEqualIgnoringExtension(`folder/file.js`, `folder/file.js`)
    ).toBe(true);
  });

  it('should return true for the same path', () => {
    expect(areImportPathsEqualIgnoringExtension(`./file.js`, `file.js`)).toBe(
      true
    );
  });

  it('should return true for the same path in parent directory', () => {
    expect(
      areImportPathsEqualIgnoringExtension(`../file.js`, `../file.js`)
    ).toBe(true);
  });

  it('should return true for the same path with different extensions', () => {
    expect(
      areImportPathsEqualIgnoringExtension(`folder/file.js`, `folder/file.ts`)
    ).toBe(true);
  });

  it('should return true for the same path with different extensions using module notation', () => {
    expect(areImportPathsEqualIgnoringExtension(`../file.js`, `../file`)).toBe(
      true
    );
  });

  it('should return false for different paths', () => {
    expect(
      areImportPathsEqualIgnoringExtension(`folder1/file.js`, `folder2/file.js`)
    ).toBe(false);
  });

  it('should return false for different paths with different extensions', () => {
    expect(
      areImportPathsEqualIgnoringExtension(`folder1/file.js`, `folder2/file.js`)
    ).toBe(false);
  });
});
