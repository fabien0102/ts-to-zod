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
import { getImportPath } from "../utils/getImportPath";

/**
 * Internal representation for imports
 */
interface ImportPayload {
  name: string;
  isRelative: boolean;
  node: ImportDeclaration;
  outerName?: string;
  pathText: string;
  required?: boolean;
  default?: boolean;
}

export interface GenerateProps {
  /**
   * Input, the fileName, or typescript source file(used in tests).
   */
  inputPath: string;

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
  inputPath: string;

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
   * indicates if we're parsing the entrypoint file
   */
  isRootFile: boolean;

  /**
   * true if we need to the default export from the file we're traversing
   */
  extractDefault?: boolean;
  /**
   * Accumulator during recursion
   *
   * @default []
   */
  zSchemas?: Array<IterateZodSchemaResult>;
};

type IterateZodSchemaResult = ReturnType<
  typeof generateZodSchemaVariableStatement
> & {
  varName: string;
  typeName: string;
  /**
   * sourceText will be used later in the pipeline
   */
  sourceText: string;

  /**
   * inputPath will be used later in the pipeline
   */
  inputPath: string;
};

function getModuleRelativity(pathText: string) {
  return pathText.startsWith(".") || pathText.startsWith("/");
}

/**
 * Recursive function we use the retrieve the nodes, it recurses through external module (if any)
 */
async function iterateZodSchemas({
  inputPath,
  sourceFile,
  nameFilter,
  jsDocTagFilter,
  getSchemaName,
  skipParseJSDoc,
  isRootFile,
  extractDefault = false,
  zSchemas = [],
}: IterateZodSchemasProps): Promise<Array<IterateZodSchemaResult>> {
  const checkExportability = !isRootFile;
  const sourceText = await readFile(inputPath, "utf8");

  const cohercedSourceFile = sourceFile
    ? sourceFile
    : resolveModules(sourceText);

  // declare a map to store the interface name and its corresponding zod schema
  const typeNameMapping = new Map<string, TypeNode>();

  // references to external modules grouped by path
  const importNameMappingByPath = new Map<string, Map<string, ImportPayload>>();
  const addToImportNameMapping = addToNestedMap(importNameMappingByPath);

  // exportability info, relevant when we're importing
  const exportInfo = {
    clauses: {} as Record<string, boolean>,
    defaultExportName: undefined as string | undefined,
  };

  // this is the store of the types that need to be extracted from the file
  const typesNeedToBeExtracted = new Set<string>();

  const typeNameMapBuilder = (node: ts.Node) => {
    // import case
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const { text: pathText } = node.moduleSpecifier;
      const isRelative = getModuleRelativity(pathText);

      // case for default imports
      if (node?.importClause?.name && ts.isIdentifier(node.importClause.name)) {
        const name = node.importClause.name.escapedText.toString();
        const payload = {
          name,
          pathText,
          isRelative,
          node,
          default: true,
        };
        addToImportNameMapping({ outerKey: pathText, innerKey: name, payload });
      }
      // case for named imports
      if (
        node?.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        node.importClause.namedBindings.elements.forEach((x) => {
          const name = x.name.escapedText.toString();
          const outerName = x.propertyName?.escapedText.toString() || name;
          const payload = {
            name,
            pathText,
            outerName,
            isRelative,
            node,
          };
          addToImportNameMapping({
            outerKey: pathText,
            innerKey: name,
            payload,
          });
        });
      }
    }

    // export cases
    if (ts.isExportDeclaration(node)) {
      // named: ex: export { named }
      if (node.exportClause && "elements" in node.exportClause) {
        node.exportClause.elements.forEach((el) => {
          const esName = el.name.escapedText;
          if (esName) {
            exportInfo.clauses[esName] = true;
          }
        });
      }
      // relay: ex: export * from './module.ts'
      if (node.moduleSpecifier) {
        // @todo handle this case
        throw new Error("relay export not supported");
      }
    }
    // default: "export default" assignments here
    if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
      exportInfo.defaultExportName = node.expression.escapedText.toString();
    }

    if (isTypeNode(node)) {
      typeNameMapping.set(node.name.text, node);
    }
  };
  ts.forEachChild(cohercedSourceFile, typeNameMapBuilder);

  // if we're parsing an imported file, we need to validate the exports
  if (checkExportability) {
    typeNameMapping.forEach((node) => {
      const modifiers = ts.getCombinedModifierFlags(node);
      const name = node.name.text;

      if (
        (modifiers && ts.ModifierFlags.Export) ||
        exportInfo.clauses[name] ||
        name === exportInfo.defaultExportName
      ) {
        node.exported = true;
      }
    });
  }

  const visitor = (node: ts.Node) => {
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const jsDoc = getJsDoc(node, cohercedSourceFile);
      const tags = getSimplifiedJsDocTags(jsDoc);
      if (isRootFile && !jsDocTagFilter(tags)) return;
      if (isRootFile && !nameFilter(node.name.text)) {
        return;
      }

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

  const nodes: Array<TypeNode> = [];

  // references to external modules flattened by name
  const importNameMapping = Array.from(importNameMappingByPath.values()).reduce(
    (ac, x) => {
      x.forEach((x) => ac.set(x.name, x));
      return ac;
    },
    new Map<string, ImportPayload>()
  );

  // the schema are currently being generated in a single file,
  // current implementation does NOT give an option to do the generation in separate files.
  typesNeedToBeExtracted.forEach((typeName) => {
    // if we're dealing with an external module we need to go get the source, the reference is stored in importNameMapping
    const externalNode = importNameMapping.get(typeName);
    if (externalNode) {
      externalNode.required = true;
    }
    const node = typeNameMapping.get(typeName);
    if (node) {
      nodes.push(node);
    }
  });

  // // references to external modules flattened by name
  // const importNameMappingByOuterNameWithFallback = Array.from(
  //   importNameMappingByPath.values()
  // ).reduce((ac, x) => {
  //   x.forEach((x) => ac.set((x.outerName || x.name), x))
  //   return ac
  // }, new Map<string, ImportPayload>());

  /**
   * Resolve externalModules
   *
   * @todo improve performance
   */
  for await (const [pathText, v] of importNameMappingByPath.entries()) {
    const isNeeded = Array.from(v.values()).some((x) => x.required);
    if (!isNeeded) continue;

    const importPath = nodeFileResolution({
      containingFile: inputPath,
      importName: pathText,
    });
    const extractDefault = Array.from(v.values()).some((x) => x.default);
    const externalSchemas = await iterateZodSchemas({
      inputPath: importPath,
      nameFilter: () => true,
      getSchemaName,
      isRootFile: false,
      extractDefault,
      jsDocTagFilter,
      skipParseJSDoc,
      zSchemas,
    });
    zSchemas.push(...externalSchemas);
  }

  // Generate zod schemas
  return nodes.reduce<Array<IterateZodSchemaResult>>((ac, node) => {
    const typeName = node.name.text;
    const typeNameMappingNode =
      typeNameMapping.has(typeName) && typeNameMapping.get(typeName);
    const varNameArg = typeNameMappingNode
      ? typeNameMappingNode.name.escapedText.toString()
      : typeName;
    const varName = getSchemaName(varNameArg);

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
      sourceText, // we use this later to do some validation
      inputPath,
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
  inputPath,
  maxRun = 10,
  nameFilter = () => true,
  jsDocTagFilter = () => true,
  getSchemaName = (id) => camel(id) + "Schema",
  keepComments = false,
  skipParseJSDoc = false,
}: GenerateProps) {
  const sourceText = await readFile(inputPath, "utf8");
  const sourceFile = resolveModules(sourceText);

  const zodSchemas = await iterateZodSchemas({
    inputPath,
    sourceFile,
    nameFilter,
    jsDocTagFilter,
    getSchemaName,
    skipParseJSDoc,
    isRootFile: true,
  });

  // Resolves statements order
  // A schema can't be declared if all the referenced schemas used inside this one are not previously declared.
  const statements = new Map<
    string,
    { typeName: string; value: ts.VariableStatement }
  >();
  const typeImports: Map<string, Set<string>> = new Map();
  /*
   * Abstraction to add types related to paths in typeImports
   * @todo check if there could be issues with localNamespaced types
   */
  const addTypeToTypeImports = (args: {
    typeName: string;
    inputPath: string;
  }) => {
    const { typeName, inputPath } = args;
    const pathSet: Set<string> = typeImports.has(inputPath)
      ? (typeImports.get(inputPath) as Set<string>)
      : new Set();
    pathSet.add(typeName);
    typeImports.set(inputPath, pathSet);
  };

  const sourceTexts: Map<string, string> = new Map();
  sourceTexts.set(inputPath, sourceText);
  let n = 0;
  while (statements.size !== zodSchemas.length && n < maxRun) {
    zodSchemas
      .filter(({ varName }) => !statements.has(varName))
      .forEach(
        ({
          varName,
          dependencies,
          statement,
          typeName,
          requiresImport,
          inputPath,
          sourceText,
        }) => {
          sourceTexts.set(inputPath, sourceText);
          const isCircular = dependencies.includes(varName);
          const missingDependencies = dependencies
            .filter((dep) => dep !== varName)
            .filter((dep) => !statements.has(dep));
          if (missingDependencies.length === 0) {
            if (isCircular) {
              addTypeToTypeImports({ typeName, inputPath });
              statements.set(varName, {
                value: transformRecursiveSchema("z", statement, typeName),
                typeName,
              });
            } else {
              if (requiresImport) {
                addTypeToTypeImports({ typeName, inputPath });
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

  const globalSourceFile = resolveModules(
    Array.from(sourceTexts.values()).join("\n")
  );
  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, globalSourceFile);

  const transformedSourceText = printerWithComments.printFile(globalSourceFile);

  const getZodSchemasFile = (from: string) => {
    const multiImports = Array.from(
      typeImports.entries(),
      ([to, moduleImports]) => {
        const typesImportPath = getImportPath(from, to);
        return moduleImports.size
          ? `import { ${Array.from(moduleImports.values()).join(
              ", "
            )} } from "${typesImportPath}";\n`
          : "";
      }
    );
    return `// Generated by ts-to-zod
import { z } from "zod";
${multiImports.join("")}
${Array.from(statements.values())
  .map((statement) => print(statement.value))
  .join("\n\n")}
`;
  };

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
    hasCircularDependencies: typeImports.size > 0,
  };
}

/**
 * Helper to filter exported const declaration
 * @param i
 * @returns
 */
const isExported = (i: { typeName: string; value: ts.VariableStatement }) =>
  i.value.modifiers?.find((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);

// utility to add a key/value pair to a nested map
function addToNestedMap<K>(map: Map<string, Map<string, K>>) {
  return function (args: { outerKey: string; innerKey: string; payload: K }) {
    const { outerKey, innerKey, payload } = args;
    const nestedMap: Map<string, K> = map.has(outerKey)
      ? (map.get(outerKey) as Map<string, K>)
      : new Map();
    nestedMap.set(innerKey, payload);
    map.set(outerKey, nestedMap);
  };
}
