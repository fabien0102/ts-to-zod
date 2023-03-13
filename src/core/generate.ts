import { camel } from "case";
import { getJsDoc } from "tsutils";
import ts from "typescript";
import { JSDocTagFilter, NameFilter } from "../config";
import { getSimplifiedJsDocTags } from "../utils/getSimplifiedJsDocTags";
import { resolveModules } from "../utils/resolveModules";
import {
  getExtractedTypeNames,
  isTypeNode,
  TypeNode,
} from "../utils/traverseTypes";
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
   * Path of z.infer<> types file.
   */
  inferredTypes?: string;
}

/**
 * Generate zod schemas and integration tests from a typescript file.
 *
 * This function take care of the sorting of the `const` declarations and solved potential circular references
 */
export function generate({
  sourceText,
  nameFilter = () => true,
  jsDocTagFilter = () => true,
  getSchemaName = (id) => camel(id) + "Schema",
  keepComments = false,
  skipParseJSDoc = false,
}: GenerateProps) {
  // Create a source file and deal with modules
  const sourceFile = resolveModules(sourceText);

  // Extract the nodes (interface declarations & type aliases)
  const nodes: Array<TypeNode> = [];

  // declare a map to store the interface name and its corresponding zod schema
  const typeNameMapping = new Map<string, TypeNode>();

  const typesNeedToBeExtracted = new Set<string>();

  const typeNameMapBuilder = (node: ts.Node) => {
    if (isTypeNode(node)) {
      typeNameMapping.set(node.name.text, node);
    }
  };
  ts.forEachChild(sourceFile, typeNameMapBuilder);
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

      const typeNames = getExtractedTypeNames(
        node,
        sourceFile,
        typeNameMapping
      );
      typeNames.forEach((typeName) => {
        typesNeedToBeExtracted.add(typeName);
      });
    }
  };
  ts.forEachChild(sourceFile, visitor);

  typesNeedToBeExtracted.forEach((typeName) => {
    const node = typeNameMapping.get(typeName);
    if (node) {
      nodes.push(node);
    }
  });

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
    });

    return { typeName, varName, ...zodSchema };
  });
  const zodSchemaNames = zodSchemas.map(({ varName }) => varName);

  // Resolves statements order
  // A schema can't be declared if all the referenced schemas used inside this one are not previously declared.
  const statements = new Map<
    string,
    { typeName: string; value: ts.VariableStatement }
  >();
  const typeImports: Set<string> = new Set();

  // Zod schemas with direct or indirect dependencies that are not in `zodSchemas`, won't be generated
  const zodSchemasWithMissingDependencies = new Set<string>();

  let done = false;
  // Loop until no more schemas can be generated and no more schemas with direct or indirect missing dependencies are found
  while (
    !done &&
    statements.size + zodSchemasWithMissingDependencies.size !==
      zodSchemas.length
  ) {
    done = true;
    zodSchemas
      .filter(
        ({ varName }) =>
          !statements.has(varName) &&
          !zodSchemasWithMissingDependencies.has(varName)
      )
      .forEach(
        ({ varName, dependencies, statement, typeName, requiresImport }) => {
          const isCircular = dependencies.includes(varName);
          const notGeneratedDependencies = dependencies
            .filter((dep) => dep !== varName)
            .filter((dep) => !statements.has(dep));
          if (notGeneratedDependencies.length === 0) {
            done = false;
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
          } else if (
            // Check if every dependency is (in `zodSchemas` and not in `zodSchemasWithMissingDependencies`)
            !notGeneratedDependencies.every(
              (dep) =>
                zodSchemaNames.includes(dep) &&
                !zodSchemasWithMissingDependencies.has(dep)
            )
          ) {
            done = false;
            zodSchemasWithMissingDependencies.add(varName);
          }
        }
      );
  }

  // Generate remaining schemas, which have circular dependencies with loop of length > 1 like: A->B—>C->A
  zodSchemas
    .filter(
      ({ varName }) =>
        !statements.has(varName) &&
        !zodSchemasWithMissingDependencies.has(varName)
    )
    .forEach(
      ({ varName, dependencies, statement, typeName, requiresImport }) => {
        typeImports.add(typeName);
        statements.set(varName, {
          value: transformRecursiveSchema("z", statement, typeName),
          typeName,
        });
      }
    );

  // Warn the user of possible not resolvable loops
  const errors: string[] = [];

  if (zodSchemasWithMissingDependencies.size > 0) {
    errors.push(
      `Some schemas can't be generated due to direct or indirect missing dependencies:
${Array.from(zodSchemasWithMissingDependencies).join("\n")}`
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
}
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

  const getInferredTypes = (
    zodSchemasImportPath: string
  ) => `// Generated by ts-to-zod
import { z } from "zod";

import * as generated from "${zodSchemasImportPath}";

${Array.from(statements.values())
  .filter(isExported)
  .map((statement) => {
    const zodInferredSchema = generateZodInferredType({
      aliasName: statement.typeName,
      zodConstName: `generated.${getSchemaName(statement.typeName)}`,
      zodImportValue: "z",
    });

    return print(zodInferredSchema);
  })
  .join("\n\n")}
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
     * Get the content of the zod inferred types files.
     *
     * @param zodSchemasImportPath Relative path of the zod schemas file
     */
    getInferredTypes,

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
