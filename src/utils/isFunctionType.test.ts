import ts from "typescript";
import { analyzeTypeMetadata } from "./isFunctionType";

describe("analyzeTypeMetadata", () => {
  it("should identify Promise types", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "type MyPromise = Promise<string>",
      ts.ScriptTarget.Latest
    );

    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const result = analyzeTypeMetadata(typeAlias);

    expect(result).toBe("promise");
  });

  it("should identify Promise-returning function types", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "type MyAsyncFunction = (a: string) => Promise<boolean>",
      ts.ScriptTarget.Latest
    );

    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const result = analyzeTypeMetadata(typeAlias);

    expect(result).toBe("promiseReturningFunction");
  });

  it("should handle interface declarations", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "interface MyInterface { name: string }",
      ts.ScriptTarget.Latest
    );

    const interfaceDecl = sourceFile.statements[0] as ts.InterfaceDeclaration;
    const result = analyzeTypeMetadata(interfaceDecl);

    expect(result).toBe("none");
  });

  it("should handle enum declarations", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "enum MyEnum { A, B, C }",
      ts.ScriptTarget.Latest
    );

    const enumDecl = sourceFile.statements[0] as ts.EnumDeclaration;
    const result = analyzeTypeMetadata(enumDecl);

    expect(result).toBe("none");
  });

  it("should handle regular object types", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "type MyObject = { name: string; age: number }",
      ts.ScriptTarget.Latest
    );

    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const result = analyzeTypeMetadata(typeAlias);

    expect(result).toBe("none");
  });
});
