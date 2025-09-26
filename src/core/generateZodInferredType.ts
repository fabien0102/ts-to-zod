import ts, { factory as f } from "typescript";
import { TypeMetadata } from "../utils/isFunctionType.js";

export interface GenerateZodInferredTypeProps {
  aliasName: string;
  zodImportValue: string;
  zodConstName: string;
  typeMetadata: TypeMetadata;
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
  typeMetadata,
}: GenerateZodInferredTypeProps) {
  let typeReference: ts.TypeNode;

  switch (typeMetadata) {
    case "none":
      typeReference = f.createTypeReferenceNode(
        f.createQualifiedName(
          f.createIdentifier(zodImportValue),
          f.createIdentifier("infer")
        ),
        [f.createTypeQueryNode(f.createIdentifier(zodConstName))]
      );
      break;
    case "promise":
      // For Promise types (not functions), use Promise<z.output<>>
      // because z.infer<z.promise<T>> returns T instead of Promise<T> in Zod v4
      const outputType = f.createTypeReferenceNode(
        f.createQualifiedName(
          f.createIdentifier(zodImportValue),
          f.createIdentifier("output")
        ),
        [f.createTypeQueryNode(f.createIdentifier(zodConstName))]
      );

      typeReference = f.createTypeReferenceNode(f.createIdentifier("Promise"), [
        outputType,
      ]);
      break;
    case "promiseReturningFunction":
      // For Promise-returning functions, use z.output<> instead of z.infer<>
      // because z.infer<z.function({ output: z.promise(...) })> loses the Promise wrapper in Zod v4
      // This is similar to the Promise type workaround below
      typeReference = f.createTypeReferenceNode(
        f.createQualifiedName(
          f.createIdentifier(zodImportValue),
          f.createIdentifier("output")
        ),
        [f.createTypeQueryNode(f.createIdentifier(zodConstName))]
      );
      break;
  }

  return f.createTypeAliasDeclaration(
    [f.createModifier(ts.SyntaxKind.ExportKeyword)],
    f.createIdentifier(aliasName),
    undefined,
    typeReference
  );
}
