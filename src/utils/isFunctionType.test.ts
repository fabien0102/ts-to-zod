import ts from "typescript";
import { analyzeTypeMetadata } from "./isFunctionType";

describe("analyzeTypeMetadata", () => {
  it("should identify function types", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "type MyFunction = (a: string) => boolean",
      ts.ScriptTarget.Latest
    );

    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const metadata = analyzeTypeMetadata(typeAlias);

    expect(metadata.isFunction).toBe(true);
    expect(metadata.isPromiseReturningFunction).toBe(false);
    expect(metadata.isPromiseType).toBe(false);
  });

  it("should identify Promise-returning function types", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "type MyAsyncFunction = (a: string) => Promise<boolean>",
      ts.ScriptTarget.Latest
    );

    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const metadata = analyzeTypeMetadata(typeAlias);

    expect(metadata.isFunction).toBe(true);
    expect(metadata.isPromiseReturningFunction).toBe(true);
    expect(metadata.isPromiseType).toBe(false);
  });

  it("should identify Promise types", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "type MyPromise = Promise<string>",
      ts.ScriptTarget.Latest
    );

    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const metadata = analyzeTypeMetadata(typeAlias);

    expect(metadata.isFunction).toBe(false);
    expect(metadata.isPromiseReturningFunction).toBe(false);
    expect(metadata.isPromiseType).toBe(true);
  });

  it("should handle interface declarations", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "interface MyInterface { name: string }",
      ts.ScriptTarget.Latest
    );

    const interfaceDecl = sourceFile.statements[0] as ts.InterfaceDeclaration;
    const metadata = analyzeTypeMetadata(interfaceDecl);

    expect(metadata.isFunction).toBe(false);
    expect(metadata.isPromiseReturningFunction).toBe(false);
    expect(metadata.isPromiseType).toBe(false);
  });

  it("should handle enum declarations", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "enum MyEnum { A, B, C }",
      ts.ScriptTarget.Latest
    );

    const enumDecl = sourceFile.statements[0] as ts.EnumDeclaration;
    const metadata = analyzeTypeMetadata(enumDecl);

    expect(metadata.isFunction).toBe(false);
    expect(metadata.isPromiseReturningFunction).toBe(false);
    expect(metadata.isPromiseType).toBe(false);
  });

  it("should handle regular object types", () => {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      "type MyObject = { name: string; age: number }",
      ts.ScriptTarget.Latest
    );

    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const metadata = analyzeTypeMetadata(typeAlias);

    expect(metadata.isFunction).toBe(false);
    expect(metadata.isPromiseReturningFunction).toBe(false);
    expect(metadata.isPromiseType).toBe(false);
  });
});
