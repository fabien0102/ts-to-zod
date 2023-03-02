import { camel } from "case";
import { getJsDoc } from "tsutils";
import ts, { ImportDeclaration } from "typescript";
import { readFile } from "fs-extra";
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
import { nodeFileResolution } from "../utils/nodeFileResolution";

/**
 * Internal representation for imports
 */
interface ImportPayload {
  name: string;
  type: "relative" | "absolute";
  node: ImportDeclaration;
  outerName?: string;
  pathText: string;
  required?: boolean;
  resolvedNode?: TypeNode;
}

type GeneratePropsInput = {
  type: "inputPath" | "sourceText";
  payload: string;
};

export interface GenerateProps {
  /**
   * Input, the fileName, or typescript source file(used in tests).
   */
  input: GeneratePropsInput;

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
}

type IterateZodSchemasProps = {
  /**
   * Input, the fileName, or typescript source file(used in tests).
   */
  input: GeneratePropsInput;

  /**
   * the ts.SourceFile for inputPath
   */
  sourceFile?: ts.SourceFile;

  /**
   * Filter on type/interface name.
   */
  nameFilter: NameFilter;

  /**
   * Filter on JSDocTag.
   */
  jsDocTagFilter: JSDocTagFilter;

  /**
   * Schema name generator.
   */
  getSchemaName: (identifier: string) => string;

  /**
   * Skip the creation of zod validators from JSDoc annotations
   *
   * @default false
   */
  skipParseJSDoc: boolean;

  /**
   * Accumulator during recursion
   *
   * @default []
   */
  zSchemas?: Array<IterateZodSchemaResult>;
};

/**
 * Recursive function we use the retrieve the nodes, it recurses through external module (if any)
 */

type IterateZodSchemaResult = ReturnType<
  typeof generateZodSchemaVariableStatement
> & { varName: string; typeName: string };

async function iterateZodSchemas({
  input,
  sourceFile,
  nameFilter,
  jsDocTagFilter,
  getSchemaName,
  skipParseJSDoc,
  zSchemas = [],
}: IterateZodSchemasProps): Promise<Array<IterateZodSchemaResult>> {
  const inputPath = input.type === "inputPath" && input.payload;
  const sourceText = await (input.type === "sourceText"
    ? Promise.resolve(input.payload)
    : readFile(input.payload, "utf8"));

  const cohercedSourceFile = sourceFile
    ? sourceFile
    : resolveModules(sourceText as string);

  // declare a map to store the interface name and its corresponding zod schema
  const typeNameMapping = new Map<string, TypeNode>();

  // save the references to external modules
  const importNameMapping = new Map<string, ImportPayload>();

  const typesNeedToBeExtracted = new Set<string>();

  const nodes: Array<TypeNode> = [];

  const typeNameMapBuilder = (node: ts.Node) => {
    // if we were to accumulate the node import here it would be available afterward
    // but we'd endup traversing many files which are probably not needed
    // we maintain the reference to imports only, we'll do something later with it
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const { text: pathText } = node.moduleSpecifier;
      const type =
        pathText.startsWith(".") || pathText.startsWith("/")
          ? "relative"
          : "absolute";

      if (
        node?.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        node.importClause.namedBindings.elements;
        node.importClause.namedBindings.elements.forEach((x) => {
          const name = x.name.escapedText.toString();
          const outerName = x.propertyName?.escapedText.toString() || name;
          importNameMapping.set(name, {
            name,
            pathText,
            outerName,
            type,
            node,
          });
        });
      }
    }
    if (isTypeNode(node)) {
      typeNameMapping.set(node.name.text, node);
    }
  };
  ts.forEachChild(cohercedSourceFile, typeNameMapBuilder);

  const visitor = (node: ts.Node) => {
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const jsDoc = getJsDoc(node, cohercedSourceFile);
      const tags = getSimplifiedJsDocTags(jsDoc);
      if (!jsDocTagFilter(tags)) return;
      if (!nameFilter(node.name.text)) return;

      const typeNames = getExtractedTypeNames(
        node,
        cohercedSourceFile,
        typeNameMapping
      );
      typeNames.forEach((typeName) => {
        typesNeedToBeExtracted.add(typeName);
      });
    }
  };
  ts.forEachChild(cohercedSourceFile, visitor);

  typesNeedToBeExtracted.forEach((typeName) => {
    // if we're dealing with an external module we need to go get the source
    const externalNode = importNameMapping.get(typeName);
    if (externalNode) {
      // here we have 2 options:
      //   -> 1. get the node and generate the schema locally (but should eventually deal with branching out toward other externa modules)
      //   2. iterate the generation process for the interested file and import the schema (should refactor the whole code because this would mean doing a first pass to check how many times the process needs to be done for a certain file)
      // option 1 wins
      externalNode.required = true;
    }
    const node = typeNameMapping.get(typeName);
    if (node) {
      nodes.push(node);
    }
  });

  /**
   * Resolve externalModules
   *
   * @todo parallelize
   */
  if (inputPath) {
    for await (const v of importNameMapping.values()) {
      if (!v.required || v.resolvedNode) continue;

      const importPath = nodeFileResolution({
        containingFile: inputPath,
        importName: v.pathText,
      });
      const externalSchemas = await iterateZodSchemas({
        input: {
          type: "inputPath",
          payload: importPath,
        },
        nameFilter: (n) => v.outerName === n,
        jsDocTagFilter,
        getSchemaName,
        skipParseJSDoc,
        zSchemas,
      });
      zSchemas.push(...externalSchemas);
    }
  }

  // Generate zod schemas
  return nodes.reduce<Array<IterateZodSchemaResult>>((ac, node) => {
    const typeName = node.mappedName || node.name.text;
    const varName = getSchemaName(typeName);

    const zodSchema = generateZodSchemaVariableStatement({
      zodImportValue: "z",
      node,
      sourceFile: cohercedSourceFile,
      varName,
      getDependencyName: getSchemaName,
      skipParseJSDoc,
    });

    const res = {
      typeName,
      varName,
      ...zodSchema,
    };
    return [...ac, res];
  }, zSchemas);
}

/**
 * Generate zod schemas and integration tests from multiple typescript files.
 *
 * This function take care of the sorting of the `const` declarations and solved potential circular references
 */
export async function generate({
  input,
  maxRun = 10,
  nameFilter = () => true,
  jsDocTagFilter = () => true,
  getSchemaName = (id) => camel(id) + "Schema",
  keepComments = false,
  skipParseJSDoc = false,
}: GenerateProps) {
  const sourceText = await (input.type === "inputPath"
    ? readFile(input.payload, "utf8")
    : Promise.resolve(input.payload));
  const sourceFile = resolveModules(sourceText);

  const zodSchemas = await iterateZodSchemas({
    input,
    sourceFile,
    nameFilter,
    jsDocTagFilter,
    getSchemaName,
    skipParseJSDoc,
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
    if (n === maxRun) {
      console.log("Hitting maxRun limit");
    }
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
