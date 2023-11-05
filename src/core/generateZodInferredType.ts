import * as ts from "typescript";
const { factory: f } = ts;

export interface GenerateZodInferredTypeProps {
  aliasName: string;
  zodImportValue: string;
  zodConstName: string;
}

/**
 * Generate zod inferred type.
 *
 * ```ts
 *  export type ${aliasName} = ${zodImportValue}.infer<typeof ${zodConstName}>
 * ```
 */
export function generateZodInferredType({
  aliasName,
  zodImportValue,
  zodConstName,
}: GenerateZodInferredTypeProps) {
  return f.createTypeAliasDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    f.createIdentifier(aliasName),
    undefined,
    f.createTypeReferenceNode(
      f.createQualifiedName(
        f.createIdentifier(zodImportValue),
        f.createIdentifier("infer")
      ),
      [f.createTypeQueryNode(f.createIdentifier(zodConstName))]
    )
  );
}
