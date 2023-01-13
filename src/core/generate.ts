import { camel } from "case";
import { getJsDoc } from "tsutils";
import ts from "typescript";
import {
  DefaultMaybeConfig,
  JSDocTagFilter,
  MaybeConfig,
  NameFilter,
} from "../config";
import { getSimplifiedJsDocTags } from "../utils/getSimplifiedJsDocTags";
import { resolveModules } from "../utils/resolveModules";
import { generateIntegrationTests } from "./generateIntegrationTests";
import { generateZodInferredType } from "./generateZodInferredType";
import { generateZodSchemaVariableStatement } from "./generateZodSchema";
import { transformRecursiveSchema } from "./transformRecursiveSchema";

export interface GenerateProps {
  /**
   * Content of the typescript source file.
   */
  sourceText: string;

  /**
   * Max iteration number to resolve the declaration order.
   */
  maxRun?: number;

  /**
   * Filter on type/interface name.
   */
  nameFilter?: NameFilter;

  /**
   * Filter on JSDocTag.
   */
  jsDocTagFilter?: JSDocTagFilter;

  /**
   * Schema name generator.
   */
  getSchemaName?: (identifier: string) => string;

  /**
   * Keep parameters comments.
   * @default false
   */
  keepComments?: boolean;

  /**
   * Skip the creation of zod validators from JSDoc annotations
   *
   * @default false
   */
  skipParseJSDoc?: boolean;

  /**
   * If present, it will be used to support the `Maybe<T>` special case.
   *
   * e.g.
   * ```ts
   * // with maybe config: { typeNames: ["Maybe"], optional: true, nullable: true }
   *
   * export type X = { a: string; b: Maybe<string> };
   *
   * // output:
   * const maybe = <T extends z.ZodTypeAny>(schema: T) => {
   *   return schema.optional().nullable();
   * };
   *
   * export const xSchema = zod.object({
   *   a: zod.string(),
   *   b: maybe(zod.string())
   * })
   * ```
   */
  maybeConfig?: MaybeConfig;
}

type ValidTSNode =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration;

/**
 * Generate zod schemas and integration tests from a typescript file.
 *
 * This function take care of the sorting of the `const` declarations and solved potential circular references
 */
export function generate({
  sourceText,
  maybeConfig = DefaultMaybeConfig,
  maxRun = 10,
  nameFilter = () => true,
  jsDocTagFilter = () => true,
  getSchemaName = (id) => camel(id) + "Schema",
  keepComments = false,
  skipParseJSDoc = false,
}: GenerateProps) {
  // Create a source file and deal with modules
  const sourceFile = resolveModules(sourceText);

  const isMaybe = (node: ValidTSNode) =>
    maybeConfig.typeNames.has(node.name.text);

  // Extract the nodes (interface declarations, type aliases, and enums)
  const nodes: Array<ValidTSNode> = [];

  const visitor = (node: ts.Node) => {
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const jsDoc = getJsDoc(node, sourceFile);
      const tags = getSimplifiedJsDocTags(jsDoc);
      if (!jsDocTagFilter(tags)) return;
      if (!nameFilter(node.name.text)) return;
      if (isMaybe(node)) return;
      nodes.push(node);
    }
  };
  ts.forEachChild(sourceFile, visitor);

  // Generate zod schemas
  const zodSchemas = nodes.map((node) => {
    const typeName = node.name.text;
    const varName = getSchemaName(typeName);
    const zodSchema = generateZodSchemaVariableStatement({
      zodImportValue: "z",
      node,
      sourceFile,
      varName,
      getDependencyName: getSchemaName,
      skipParseJSDoc,
      maybeConfig,
    });

    return { typeName, varName, ...zodSchema };
  });

  // Resolves statements order
  // A schema can't be declared if all the referenced schemas used inside this one are not previously declared.
  const statements = new Map<
    string,
    { typeName: string; value: ts.VariableStatement }
  >();
  const typeImports: Set<string> = new Set();

  let n = 0;
  while (statements.size !== zodSchemas.length && n < maxRun) {
    zodSchemas
      .filter(({ varName }) => !statements.has(varName))
      .forEach(
        ({ varName, dependencies, statement, typeName, requiresImport }) => {
          const isCircular = dependencies.includes(varName);
          const missingDependencies = dependencies
            .filter((dep) => dep !== varName)
            .filter((dep) => !statements.has(dep));
          if (missingDependencies.length === 0) {
            if (isCircular) {
              typeImports.add(typeName);
              statements.set(varName, {
                value: transformRecursiveSchema("z", statement, typeName),
                typeName,
              });
            } else {
              if (requiresImport) {
                typeImports.add(typeName);
              }
              statements.set(varName, { value: statement, typeName });
            }
          }
        }
      );

    n++; // Just a safety net to avoid infinity loops
  }

  // Warn the user of possible not resolvable loops
  const missingStatements = zodSchemas.filter(
    ({ varName }) => !statements.has(varName)
  );

  const errors: string[] = [];

  if (missingStatements.length) {
    errors.push(
      `Some schemas can't be generated due to circular dependencies:
${missingStatements.map(({ varName }) => `${varName}`).join("\n")}`
    );
  }

  // Create output files (zod schemas & integration tests)
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: !keepComments,
  });

  const printerWithComments = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
  });

  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);

  const transformedSourceText = printerWithComments.printFile(sourceFile);

  const imports = Array.from(typeImports.values());
  const getZodSchemasFile = (
    typesImportPath: string
  ) => `// Generated by ts-to-zod
import { z } from "zod";
${
  imports.length
    ? `import { ${imports.join(", ")} } from "${typesImportPath}";\n`
    : ""
}${makeMaybePrinted(maybeConfig)}
${Array.from(statements.values())
  .map((statement) => print(statement.value))
  .join("\n\n")}
`;

  const testCases = generateIntegrationTests(
    Array.from(statements.values())
      .filter(isExported)
      .map((i) => ({
        zodType: `${getSchemaName(i.typeName)}InferredType`,
        tsType: `spec.${i.typeName}`,
      }))
  );

  const getIntegrationTestFile = (
    typesImportPath: string,
    zodSchemasImportPath: string
  ) => `// Generated by ts-to-zod
import { z } from "zod";

import * as spec from "${typesImportPath}";
import * as generated from "${zodSchemasImportPath}";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expectType<T>(_: T) {
  /* noop */
}

${Array.from(statements.values())
  .filter(isExported)
  .map((statement) => {
    // Generate z.infer<>
    const zodInferredSchema = generateZodInferredType({
      aliasName: `${getSchemaName(statement.typeName)}InferredType`,
      zodConstName: `generated.${getSchemaName(statement.typeName)}`,
      zodImportValue: "z",
    });

    return print(zodInferredSchema);
  })
  .join("\n\n")}
${testCases.map(print).join("\n")}
`;

  return {
    /**
     * Source text with pre-process applied.
     */
    transformedSourceText,

    /**
     * Get the content of the zod schemas file.
     *
     * @param typesImportPath Relative path of the source file
     */
    getZodSchemasFile,

    /**
     * Get the content of the integration tests file.
     *
     * @param typesImportPath Relative path of the source file
     * @param zodSchemasImportPath Relative path of the zod schemas file
     */
    getIntegrationTestFile,

    /**
     * List of generation errors.
     */
    errors,

    /**
     * `true` if zodSchemaFile have some resolvable circular dependencies
     */
    hasCircularDependencies: imports.length > 0,
  };
}

/**
 * Helper to filter exported const declaration
 * @param i
 * @returns
 */
const isExported = (i: { typeName: string; value: ts.VariableStatement }) =>
  i.value.modifiers?.find((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);

const makeMaybePrinted = (maybeConfig: MaybeConfig): string => {
  if (!maybeConfig.typeNames.size) return "";

  let chained = "";
  if (maybeConfig.nullable) {
    chained += ".nullable()";
  }
  if (maybeConfig.optional) {
    chained += ".optional()";
  }

  return `
export const maybe = <T extends z.ZodTypeAny>(schema: T) => {
  return schema${chained};
};
`;
};
