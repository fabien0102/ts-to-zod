import ts from "typescript";
import {
  isDirectFunctionType,
  isDirectPromiseType,
  isFunctionReturningPromise,
} from "./isFunctionType";

describe("isFunctionType", () => {
  function createNode(
    sourceCode: string
  ): ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration {
    const sourceFile = ts.createSourceFile(
      "test.ts",
      sourceCode,
      ts.ScriptTarget.Latest
    );

    let targetNode:
      | ts.InterfaceDeclaration
      | ts.TypeAliasDeclaration
      | ts.EnumDeclaration
      | undefined;
    function visit(node: ts.Node) {
      if (
        ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        targetNode = node;
        return;
      }
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    if (!targetNode) {
      throw new Error("No target node found");
    }
    return targetNode;
  }

  describe("isDirectFunctionType", () => {
    it("should return true for function type alias", () => {
      const node = createNode("type MyFunc = (x: string) => number;");
      expect(isDirectFunctionType(node)).toBe(true);
    });

    it("should return false for non-function type alias", () => {
      const node = createNode("type MyString = string;");
      expect(isDirectFunctionType(node)).toBe(false);
    });

    it("should return false for interface", () => {
      const node = createNode("interface MyInterface { prop: string; }");
      expect(isDirectFunctionType(node)).toBe(false);
    });

    it("should return false for enum", () => {
      const node = createNode("enum MyEnum { A, B }");
      expect(isDirectFunctionType(node)).toBe(false);
    });

    it("should return true for union with function types", () => {
      const node = createNode(
        "type MyUnion = ((x: string) => number) | string;"
      );
      expect(isDirectFunctionType(node)).toBe(true);
    });

    it("should return true for parenthesized function type", () => {
      const node = createNode("type MyFunc = ((x: string) => number);");
      expect(isDirectFunctionType(node)).toBe(true);
    });
  });

  describe("isDirectPromiseType", () => {
    it("should return true for Promise type alias", () => {
      const node = createNode("type MyPromise = Promise<boolean>;");
      expect(isDirectPromiseType(node)).toBe(true);
    });

    it("should return false for non-Promise type alias", () => {
      const node = createNode("type MyString = string;");
      expect(isDirectPromiseType(node)).toBe(false);
    });

    it("should return false for interface", () => {
      const node = createNode("interface MyInterface { prop: string; }");
      expect(isDirectPromiseType(node)).toBe(false);
    });

    it("should return false for enum", () => {
      const node = createNode("enum MyEnum { A, B }");
      expect(isDirectPromiseType(node)).toBe(false);
    });

    it("should return false for function type", () => {
      const node = createNode("type MyFunc = (x: string) => number;");
      expect(isDirectPromiseType(node)).toBe(false);
    });
  });

  describe("isFunctionReturningPromise", () => {
    it("should return true for function returning Promise", () => {
      const node = createNode("type MyFunc = (x: string) => Promise<boolean>;");
      expect(isFunctionReturningPromise(node)).toBe(true);
    });

    it("should return false for function not returning Promise", () => {
      const node = createNode("type MyFunc = (x: string) => number;");
      expect(isFunctionReturningPromise(node)).toBe(false);
    });

    it("should return false for non-function types", () => {
      const node = createNode("type MyString = string;");
      expect(isFunctionReturningPromise(node)).toBe(false);
    });

    it("should return false for Promise type (not function)", () => {
      const node = createNode("type MyPromise = Promise<boolean>;");
      expect(isFunctionReturningPromise(node)).toBe(false);
    });
  });
});
