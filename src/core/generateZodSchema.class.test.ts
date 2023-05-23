import ts from "typescript";
import { generateZodSchemaVariableStatementForClass } from "./generateZodSchema";

describe("generateZodSchemaVariableStatementForClass", () => {
  it("should generate variable statement for class name", () => {
    const options = {
      className: "MyClass",
      varName: "myClassSchema",
      zodImportValue: "z",
    };

    const expected = "const myClassSchema = z.instanceof(MyClass);";

    expect(generate(options)).toEqual(expected);
  });

  it("should generate variable statement for class name with alternative zodImportValue", () => {
    const options = {
      className: "MyClass",
      varName: "myClassSchema",
      zodImportValue: "zod",
    };

    const expected = "const myClassSchema = zod.instanceof(MyClass);";

    expect(generate(options)).toEqual(expected);
  });
});

function generate(options: {
  className: string;
  varName: string;
  zodImportValue: string;
}) {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    "",
    ts.ScriptTarget.Latest
  );

  const statement = generateZodSchemaVariableStatementForClass(options);

  return ts
    .createPrinter({ newLine: ts.NewLineKind.LineFeed })
    .printNode(ts.EmitHint.Unspecified, statement, sourceFile);
}
