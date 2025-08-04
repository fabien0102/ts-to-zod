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
    });

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(
      printer.printNode(ts.EmitHint.Unspecified, output, sourceFile)
    ).toMatchInlineSnapshot(
      `"export type Superman = z.infer<typeof supermanSchema>;"`
    );
  });

  it("should generate function type with _input for Zod v4", () => {
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
      isFunction: true,
    });

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(
      printer.printNode(ts.EmitHint.Unspecified, output, sourceFile)
    ).toMatchInlineSnapshot(
      `"export type MyFunction = z.infer<typeof myFunctionSchema>;"`
    );
  });

  it("should generate promise type with z.infer for Zod v4", () => {
    const sourceFile = ts.createSourceFile(
      "index.ts",
      `export const krytonResponseSchema = z.promise(z.boolean())`,
      ts.ScriptTarget.Latest
    );

    const output = generateZodInferredType({
      aliasName: "KrytonResponse",
      zodConstName: "krytonResponseSchema",
      zodImportValue: "z",
      isPromise: true,
    });

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(
      printer.printNode(ts.EmitHint.Unspecified, output, sourceFile)
    ).toMatchInlineSnapshot(
      `"export type KrytonResponse = Promise<z.output<typeof krytonResponseSchema>>;"`
    );
  });
});
