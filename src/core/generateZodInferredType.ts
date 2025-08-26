import ts, { factory as f } from "typescript";

export interface GenerateZodInferredTypeProps {
  aliasName: string;
  zodImportValue: string;
  zodConstName: string;
  // If it is a function, we need to use z.infer<typeof schema> to get the correct type inference
  isFunction?: boolean;
  // If it is a promise, we need special handling due to Zod v4 Promise type constraints
  isPromise?: boolean;
}

/**
 * Generate zod inferred type.
 *
 * ```ts
 *  // For regular types:
 *  export type ${aliasName} = ${zodImportValue}.infer<typeof ${zodConstName}>
 *
 *  // For function types:
 *  export type ${aliasName} = ${zodImportValue}.infer<typeof ${zodConstName}>
 *
 *  // For promise types (special handling required):
 *  export type ${aliasName} = Promise<${zodImportValue}.output<typeof ${zodConstName}>>
 * ```
 *
 * ## Why Promise Types Need Special Handling
 *
 * Zod v4 has special runtime behavior for Promise types:
 * - Promises require asynchronous parsing (parseAsync())
 * - z.output<ZodPromise<T>> returns the unwrapped type T (not Promise<T>)
 * - z.infer<ZodPromise<T>> technically returns Promise<T> but creates type compatibility issues
 *
 * Using Promise<z.output<typeof schema>> accurately reconstructs a Promise<T> type
 * that is fully compatible with the original TypeScript type, while using z.infer
 * alone would yield type validation failures.
 *
 * This should be considered a workaround necessitated by Zod v4's Promise type system.
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
    // CRITICAL: Promise types require special handling in Zod v4
    // Cannot use z.infer<> due to type compatibility issues - must use Promise<z.output<>>
    // This constructs Promise<T> where T is the unwrapped type from z.output<ZodPromise<T>>
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
