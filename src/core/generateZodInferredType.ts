import ts, { factory as f } from "typescript";

export interface GenerateZodInferredTypeProps {
  aliasName: string;
  zodImportValue: string;
  zodConstName: string;
  // If it is a function, we need to use z.input<typeof schema> to get the correct type inference in Zod v4
  isFunction?: boolean;
  // If it is a promise, we need to use z.output<typeof schema> to get the correct type inference in Zod v4
  isPromise?: boolean;
}

/**
 * Generate zod inferred type.
 *
 * ```ts
 *  // For regular types:
 *  export type ${aliasName} = ${zodImportValue}.infer<typeof ${zodConstName}>
 *
 *  // For function types (Zod v4):
 *  export type ${aliasName} = ${zodImportValue}.input<typeof ${zodConstName}>
 *
 *  // For promise types (Zod v4):
 *  export type ${aliasName} = Promise<${zodImportValue}.output<typeof ${zodConstName}>>
 * ```
 */
export function generateZodInferredType({
  aliasName,
  zodImportValue,
  zodConstName,
  isFunction = false,
  isPromise = false,
}: GenerateZodInferredTypeProps) {
  let typeReference: ts.TypeNode;

  if (isFunction) {
    typeReference = f.createTypeReferenceNode(
      f.createQualifiedName(
        f.createIdentifier(zodImportValue),
        f.createIdentifier("infer")
      ),
      [f.createTypeQueryNode(f.createIdentifier(zodConstName))]
    );
  } else if (isPromise) {
    // For promise types in Zod v4, we need to manually construct Promise<T>
    // where T is z.output<typeof schema> (the inner type)
    typeReference = f.createTypeReferenceNode(f.createIdentifier("Promise"), [
      f.createTypeReferenceNode(
        f.createQualifiedName(
          f.createIdentifier(zodImportValue),
          f.createIdentifier("output")
        ),
        [f.createTypeQueryNode(f.createIdentifier(zodConstName))]
      ),
    ]);
  } else {
    // For regular types, use z.infer<typeof schema>
    typeReference = f.createTypeReferenceNode(
      f.createQualifiedName(
        f.createIdentifier(zodImportValue),
        f.createIdentifier("infer")
      ),
      [f.createTypeQueryNode(f.createIdentifier(zodConstName))]
    );
  }

  return f.createTypeAliasDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    f.createIdentifier(aliasName),
    undefined,
    typeReference
  );
}
