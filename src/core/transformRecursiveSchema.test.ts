import ts from "typescript";
import { findNode } from "../utils/findNode";
import { transformRecursiveSchema } from "./transformRecursiveSchema";

describe("transformRecursiveSchema", () => {
  it("should wrap the variable declaration with the appropriate syntax", () => {
    const sourceFile = ts.createSourceFile(
      "index.ts",
      `export const categorySchema = z.object({
      name: z.string(),
      subcategories: z.array(categorySchema),
    })`,
      ts.ScriptTarget.Latest
    );

    const declaration = findNode(sourceFile, ts.isVariableStatement);
    if (!declaration) {
      fail("should have a variable declaration");
    }

    const output = transformRecursiveSchema("z", declaration, "Category");

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    expect(printer.printNode(ts.EmitHint.Unspecified, output, sourceFile))
      .toMatchInlineSnapshot(`
      "export const categorySchema: z.ZodSchema<Category> = z.lazy(() => z.object({
          name: z.string(),
          subcategories: z.array(categorySchema),
      }));"
    `);
  });

  it("should throw if the statement is not valid", () => {
    const sourceFile = ts.createSourceFile(
      "index.ts",
      `export const categorySchema;
    })`,
      ts.ScriptTarget.Latest
    );

    const declaration = findNode(sourceFile, ts.isVariableStatement);
    if (!declaration) {
      fail("should have a variable declaration");
    }

    expect(() =>
      transformRecursiveSchema("z", declaration, "Category")
    ).toThrowErrorMatchingInlineSnapshot(`"Unvalid zod statement"`);
  });
});
