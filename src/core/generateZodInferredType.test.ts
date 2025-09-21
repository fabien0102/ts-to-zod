import { describe, expect, it } from "vitest";
import ts from "typescript";
import { generateZodInferredType } from "./generateZodInferredType";

describe("generateZodInferredType", () => {
  it("should generate inferred type zod schema", () => {
    const sourceFile = ts.createSourceFile(
      "index.ts",
      `export const supermanSchema = z.object({
      name: z.string(),
    })`,
      ts.ScriptTarget.Latest
    );

    const output = generateZodInferredType({
      aliasName: "Superman",
      zodConstName: "supermanSchema",
      zodImportValue: "z",
      typeMetadata: "none",
    });

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(
      printer.printNode(ts.EmitHint.Unspecified, output, sourceFile)
    ).toMatchInlineSnapshot(
      `"export type Superman = z.infer<typeof supermanSchema>;"`
    );
  });

  it("should generate function type with z.infer", () => {
    const sourceFile = ts.createSourceFile(
      "index.ts",
      `export const myFunctionSchema = z.function({
      input: [z.string()],
      output: z.boolean()
    })`,
      ts.ScriptTarget.Latest
    );

    const output = generateZodInferredType({
      aliasName: "MyFunction",
      zodConstName: "myFunctionSchema",
      zodImportValue: "z",
      typeMetadata: "none",
    });

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(
      printer.printNode(ts.EmitHint.Unspecified, output, sourceFile)
    ).toMatchInlineSnapshot(
      `"export type MyFunction = z.infer<typeof myFunctionSchema>;"`
    );
  });

  it("should generate promise-returning function type with z.output<>", () => {
    const sourceFile = ts.createSourceFile(
      "index.ts",
      `export const killSupermanSchema = z.function({
      input: [z.boolean(), z.string()],
      output: z.promise(z.boolean())
    })`,
      ts.ScriptTarget.Latest
    );

    const output = generateZodInferredType({
      aliasName: "KillSuperman",
      zodConstName: "killSupermanSchema",
      zodImportValue: "z",
      typeMetadata: "promiseReturningFunction",
    });

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(printer.printNode(ts.EmitHint.Unspecified, output, sourceFile)).toBe(
      "export type KillSuperman = z.output<typeof killSupermanSchema>;"
    );
  });

  it("should generate Promise type with Promise<z.output<>>", () => {
    const sourceFile = ts.createSourceFile(
      "index.ts",
      `export const krytonResponseSchema = z.promise(z.boolean())`,
      ts.ScriptTarget.Latest
    );

    const output = generateZodInferredType({
      aliasName: "KrytonResponse",
      zodConstName: "krytonResponseSchema",
      zodImportValue: "z",
      typeMetadata: "promise",
    });

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(
      printer.printNode(ts.EmitHint.Unspecified, output, sourceFile)
    ).toMatchInlineSnapshot(
      `"export type KrytonResponse = Promise<z.output<typeof krytonResponseSchema>>;"`
    );
  });
});
