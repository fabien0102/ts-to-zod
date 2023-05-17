import ts from "typescript";
import { findNode } from "./findNode";
import { getImportIdentifiers, isRelativeModuleImport } from "./importHandling";

describe("getImportIdentifiers", () => {
  it("should return nothing with a StringLiteral import", () => {
    const sourceText = `
        import "module";
        `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([]);
  });

  it("should get the identifier from default", () => {
    const sourceText = `
    import MyGlobal from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      "MyGlobal",
    ]);
  });

  it("should get the identifier with whole module aliased import", () => {
    const sourceText = `
    import * as MyGlobal from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      "MyGlobal",
    ]);
  });

  it("should get the selected identifier", () => {
    const sourceText = `
    import { MyGlobal } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      "MyGlobal",
    ]);
  });

  it("should get the selected aliased identifier", () => {
    const sourceText = `
    import { AA as MyGlobal } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      "MyGlobal",
    ]);
  });

  it("should get the selected identifiers", () => {
    const sourceText = `
    import { MyGlobal, MyGlobal2 } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      "MyGlobal",
      "MyGlobal2",
    ]);
  });

  it("should get the identifier from default, mixed with others", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      "MyGlobal",
      "MyGlobal2",
    ]);
  });
});

describe("isRelativeModuleImport", () => {
  it("should return false for non-relative modules", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "module";
    `;

    expect(isRelativeModuleImport(getImportNode(sourceText))).toEqual(false);
  });

  it("should return false for non-relative package", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "@project/module";
    `;

    expect(isRelativeModuleImport(getImportNode(sourceText))).toEqual(false);
  });

  it("should return true for relative module in same folder", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "./module";
    `;

    expect(isRelativeModuleImport(getImportNode(sourceText))).toEqual(true);
  });

  it("should return true for relative module in direct parent folder", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "../module";
    `;

    expect(isRelativeModuleImport(getImportNode(sourceText))).toEqual(true);
  });

  it("should return true for relative module in parent folder", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "../../folder/module";
    `;

    expect(isRelativeModuleImport(getImportNode(sourceText))).toEqual(true);
  });

  it("should return true for relative module in folder relative to root", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "/folder/module";
    `;

    expect(isRelativeModuleImport(getImportNode(sourceText))).toEqual(true);
  });
});

function getImportNode(sourceText: string): ts.ImportDeclaration {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );

  const importNode = findNode(
    sourceFile,
    (node): node is ts.ImportDeclaration => ts.isImportDeclaration(node)
  );
  if (!importNode) {
    throw new Error("No `type` or `interface` found!");
  }
  return importNode;
}
