import ts from "typescript";
import { findNode } from "./findNode";
import { createImportNode, getImportIdentifiers } from "./importHandling";

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
      { name: "MyGlobal" },
    ]);
  });

  it("should get the identifier with whole module aliased import", () => {
    const sourceText = `
    import * as MyGlobal from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      { name: "MyGlobal" },
    ]);
  });

  it("should get the selected identifier", () => {
    const sourceText = `
    import { MyGlobal } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      { name: "MyGlobal" },
    ]);
  });

  it("should get the selected aliased identifier", () => {
    const sourceText = `
    import { AA as MyGlobal } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      { name: "MyGlobal", original: "AA" },
    ]);
  });

  it("should get the selected identifiers", () => {
    const sourceText = `
    import { MyGlobal, MyGlobal2 } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      { name: "MyGlobal" },
      { name: "MyGlobal2" },
    ]);
  });

  it("should get the identifier from default, mixed with others", () => {
    const sourceText = `
    import MyGlobal, { MyGlobal2 } from "module";
    `;

    expect(getImportIdentifiers(getImportNode(sourceText))).toEqual([
      { name: "MyGlobal" },
      { name: "MyGlobal2" },
    ]);
  });
});

describe("createImportNode", () => {
  function printNode(node: ts.Node) {
    const printer = ts.createPrinter();
    return printer.printNode(
      ts.EmitHint.Unspecified,
      node,
      ts.createSourceFile("", "", ts.ScriptTarget.Latest)
    );
  }

  it("should create an ImportDeclaration node correctly", () => {
    const identifiers = [{ name: "Test1" }, { name: "Test2" }];
    const path = "./testPath";

    const expected = 'import { Test1, Test2 } from "./testPath";';

    const result = createImportNode(identifiers, path);

    expect(printNode(result)).toEqual(expected);
  });

  it("should handle empty identifiers array", () => {
    const path = "./testPath";

    // Yes, this is valid
    const expected = 'import {} from "./testPath";';
    const result = createImportNode([], path);

    expect(printNode(result)).toEqual(expected);
  });

  it("should create an ImportDeclaration with alias", () => {
    const identifiers = [
      { name: "Test1", original: "T1" },
      { name: "Test2" },
      { name: "Test3", original: "T3" },
    ];
    const path = "./testPath";

    const expected =
      'import { T1 as Test1, Test2, T3 as Test3 } from "./testPath";';

    const result = createImportNode(identifiers, path);

    expect(printNode(result)).toEqual(expected);
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
