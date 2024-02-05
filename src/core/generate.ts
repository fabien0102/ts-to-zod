import { camel } from "case";
import { getJsDoc } from "tsutils";
import ts from "typescript";
import {
  InputOutputMapping,
  JSDocTagFilter,
  NameFilter,
  CustomJSDocFormatTypes,
} from "../config";
import { getSimplifiedJsDocTags } from "../utils/getSimplifiedJsDocTags";
import { resolveModules } from "../utils/resolveModules";
import {
  getExtractedTypeNames,
  isTypeNode,
  TypeNode,
} from "../utils/traverseTypes";

import {
  getImportIdentifiers,
  createImportNode,
} from "../utils/importHandling";

import { generateIntegrationTests } from "./generateIntegrationTests";
import { generateZodInferredType } from "./generateZodInferredType";
import {
  generateZodSchemaVariableStatement,
  generateZodSchemaVariableStatementForImport,
} from "./generateZodSchema";
import { transformRecursiveSchema } from "./transformRecursiveSchema";
import { relative } from "path";

const DEFAULT_GET_SCHEMA = (id: string) => camel(id) + "Schema";

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
  /**
   * Custom JSDoc format types.
   */
  customJSDocFormatTypes?: CustomJSDocFormatTypes;

  /**
   * Map of input/output from config that can
   * be used to automatically handle imports
   */
  inputOutputMappings?: InputOutputMapping[];
}

/**
 * Generate zod schemas and integration tests from a typescript file.
 *
 * This function takes care of the sorting of the `const` declarations and solves potential circular references
 */
export function generate({
  sourceText,
  nameFilter = () => true,
  jsDocTagFilter = () => true,
  getSchemaName = DEFAULT_GET_SCHEMA,
  keepComments = false,
  skipParseJSDoc = false,
  customJSDocFormatTypes = {},
  inputOutputMappings = [],
}: GenerateProps) {
  // Create a source file and deal with modules
  const sourceFile = resolveModules(sourceText);

  // Extract the nodes (interface declarations & type aliases)
  const nodes: Array<TypeNode> = [];

  // declare a map to store the interface name and its corresponding zod schema
  const typeNameMapping = new Map<string, TypeNode>();

  // handling existing import statements
  const importNamesAvailable = new Set<string>();
  const importNodes: ts.ImportDeclaration[] = [];
  const importNamesUsed: string[] = [];
  const importedZodNamesAvailable = new Map<string, string>();

  const typesNeedToBeExtracted = new Set<string>();

  const typeNameMapBuilder = (node: ts.Node) => {
    if (isTypeNode(node)) {
      typeNameMapping.set(node.name.text, node);
    }
    if (ts.isImportDeclaration(node) && node.importClause) {
      // Check if we're importing from a mapped file
      const eligibleMapping = inputOutputMappings.find(
        (io: InputOutputMapping) =>
          relative(
            io.input,
            (node.moduleSpecifier as ts.StringLiteral).text
          ) === ""
      );
      if (eligibleMapping) {
        const schemaMethod =
          eligibleMapping.getSchemaName || DEFAULT_GET_SCHEMA;

        const identifiers = getImportIdentifiers(node);
        identifiers.forEach((i) =>
          importedZodNamesAvailable.set(i, schemaMethod(i))
        );

        const importNode = createImportNode(
          identifiers.map(schemaMethod),
          eligibleMapping.output
        );
        importNodes.push(importNode); // We assume all identifiers will be used so pushing the whole node
      }
      // Not a Zod import, handling it as 3rd party import later on
      else {
        const identifiers = getImportIdentifiers(node);
        identifiers.forEach((i) => importNamesAvailable.add(i));
        importNodes.push(node); // We assume all identifiers will be used so pushing the whole node
      }
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

      const typeNames = getExtractedTypeNames(node, sourceFile);
      typeNames.forEach((typeName) => {
        typesNeedToBeExtracted.add(typeName);
      });
    }
  };
  ts.forEachChild(sourceFile, visitor);

  const importedZodSchemas = new Set<string>();

  typesNeedToBeExtracted.forEach((typeName) => {
    const node = typeNameMapping.get(typeName);
    if (node) {
      nodes.push(node);
      return;
    }
    if (importNamesAvailable.has(typeName)) {
      importNamesUsed.push(typeName);
      return;
    }
    if (importedZodNamesAvailable.has(typeName)) {
      importedZodSchemas.add(importedZodNamesAvailable.get(typeName) as string);
      return;
    }
  });

  // Generate zod schemas for type nodes

  const getDependencyName = (identifierName: string) => {
    if (importedZodNamesAvailable.has(identifierName)) {
      return importedZodNamesAvailable.get(identifierName) as string;
    }
    return getSchemaName(identifierName);
  };

  const zodTypeSchemas = nodes.map((node) => {
    const typeName = node.name.text;
    const varName = getSchemaName(typeName);
    const zodSchema = generateZodSchemaVariableStatement({
      zodImportValue: "z",
      node,
      sourceFile,
      varName,
      getDependencyName: getDependencyName,
      skipParseJSDoc,
      customJSDocFormatTypes,
    });

    return { typeName, varName, ...zodSchema };
  });

  // Generate zod schemas for 3rd party imports
  const zodImportSchemas = importNamesUsed.map((importName) => {
    const varName = getSchemaName(importName);
    return {
      dependencies: [],
      statement: generateZodSchemaVariableStatementForImport({
        varName,
        zodImportValue: "z",
      }),
      requiresImport: false,
      typeName: importName,
      varName,
    };
  });

  const zodSchemas = zodTypeSchemas.concat(zodImportSchemas);
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
            .filter((dep) => !statements.has(dep))
            .filter((dep) => !importedZodSchemas.has(dep));
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
    .forEach(({ varName, statement, typeName }) => {
      typeImports.add(typeName);
      statements.set(varName, {
        value: transformRecursiveSchema("z", statement, typeName),
        typeName,
      });
    });

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

  const typeImportsValues = Array.from(typeImports.values());
  const getZodSchemasFile = (
    typesImportPath: string
  ) => `// Generated by ts-to-zod
import { z } from "zod";
${
  typeImportsValues.length
    ? `import { ${typeImportsValues.join(", ")} } from "${typesImportPath}";\n`
    : ""
}
${
  importNodes.length
    ? importNodes.map((node) => print(node)).join("\n") + "\n\n"
    : ""
}${Array.from(statements.values())
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
    hasCircularDependencies: typeImportsValues.length > 0,
  };
}

/**
 * Helper to filter exported const declaration
 * @param i
 * @returns
 */
const isExported = (i: { typeName: string; value: ts.VariableStatement }) =>
  i.value.modifiers?.find((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
