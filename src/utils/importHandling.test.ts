import ts from "typescript";
import { findNode } from "./findNode";
<<<<<<< HEAD
import { getImportIdentifiers } from "./importHandling";
=======
import {
  createImportNode,
  getImportIdentifiers,
  isRelativeModuleImport,
} from "./importHandling";
>>>>>>> a021ddd (feat: add createImport function)

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
