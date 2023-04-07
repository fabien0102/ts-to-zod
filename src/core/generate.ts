import { camel, pascal } from "case";
import { getJsDoc } from "tsutils";
import ts from "typescript";
import { readFile } from "fs-extra";
import { JSDocTagFilter, NameFilter } from "../config";
import { getSimplifiedJsDocTags } from "../utils/getSimplifiedJsDocTags";
import { resolveModules } from "../utils/resolveModules";
import {
  getExtractedTypeNames,
  getExtractedTypeNamesFromExportDeclaration,
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
  outerName: string;
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
   * if we need to extract the default export this will be the varSchema name,
   * in case we don't need it will be undefined
   */
  extractDefaultName?: string;

  /**
   * this is a map we hand down to the recursive function to track of the imported types, and aliases
   * we also use this as a way to clean out the imports that are not used
   */
  aliasingNameMapping?: Record<string, string>;

  /**
   * this is a prefix with all the concatenated namespaces we're currently in
   */
  previousNamespace?: string;
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

  /**
   * indicates if the schema is a default export,
   * in case we're dealing with a enum we'll need to consider this during imports
   */
  isDefault?: boolean;
};

function getModuleRelativity(pathText: string) {
  return pathText.startsWith(".") || pathText.startsWith("/");
}

/**
 * Recursive function we use the retrieve the nodes, it recurses through external module (ij any)
 */
async function iterateZodSchemas({
  inputPath,
  sourceFile,
  nameFilter,
  jsDocTagFilter,
  getSchemaName,
  skipParseJSDoc,
  isRootFile,
  extractDefaultName,
  aliasingNameMapping = {},
  previousNamespace = "",
}: IterateZodSchemasProps): Promise<Array<IterateZodSchemaResult>> {
  const checkExportability = !isRootFile;
  const sourceText = await readFile(inputPath, "utf8");

  const inheritedNamespace =
    previousNamespace + (aliasingNameMapping["*"] || "");

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
          outerName: name,
          pathText,
          isRelative,
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
          };
          addToImportNameMapping({
            outerKey: pathText,
            innerKey: name,
            payload,
          });
        });
      }
      // case for namespace imports
      if (
        node?.importClause?.namedBindings &&
        ts.isNamespaceImport(node.importClause.namedBindings)
      ) {
        const namespace = node.importClause.namedBindings.name.escapedText.toString();
        const payload = {
          name: namespace,
          pathText,
          outerName: "*",
          isRelative,
        };
        addToImportNameMapping({
          outerKey: pathText,
          innerKey: namespace,
          payload,
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
    // we need to mark exported types in non root files as exported
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !isRootFile
    ) {
      // named exports
      const typeNames = getExtractedTypeNamesFromExportDeclaration(
        node as ts.ExportDeclaration & { moduleSpecifier: ts.StringLiteral }
      );
      typeNames.forEach((typeName) => {
        typesNeedToBeExtracted.add(typeName);
      });
    }
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
      if (
        !isRootFile &&
        !aliasingNameMapping["*"] &&
        !aliasingNameMapping[node.name.text] &&
        node.name.text !== exportInfo.defaultExportName
      ) {
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

  const foreignSchemas = [];
  /**
   * Resolve externalModules
   */
  for await (const [pathText, v] of importNameMappingByPath.entries()) {
    // we use this dict to map external to internal names
    const importAliasingNameMap = Array.from(v.values()).reduce<
      Record<string, string>
    >(
      (ac, v) => ({
        ...ac,
        // in case we have a namespace containing a namespace we should nest the names
        [v.outerName]:
          v.name === "*" ? pascal(`${inheritedNamespace} ${v.name}`) : v.name,
      }),
      {}
    );

    const isNeeded = Array.from(v.values()).some((x) => x.required);
    if (!isNeeded) continue;

    const importPath = nodeFileResolution({
      containingFile: inputPath,
      importName: pathText,
    });
    const extractDefault = Array.from(v.values()).find((x) => x.default);

    const externalSchemas = await iterateZodSchemas({
      inputPath: importPath,
      nameFilter: () => true,
      getSchemaName,
      isRootFile: false,
      extractDefaultName: extractDefault?.name,
      jsDocTagFilter,
      skipParseJSDoc,
      aliasingNameMapping: importAliasingNameMap,
    });
    foreignSchemas.push(...externalSchemas);
  }

  const availableNameSpaces = new Map<string, (x: string) => string>();
  importNameMapping.forEach((x) => {
    if (x.outerName === "*") {
      availableNameSpaces.set(x.name, (id) =>
        getSchemaName(camel(`${x.name}_${id}`))
      );
    }
  });
  // Generate zod schemas
  const localSchemas = nodes.reduce<Array<IterateZodSchemaResult>>(
    (ac, node) => {
      const typeName = node.name.text;
      const typeNameMappingNode =
        typeNameMapping.has(typeName) && typeNameMapping.get(typeName);
      const varNameArg = typeNameMappingNode
        ? typeNameMappingNode.name.escapedText.toString()
        : typeName;
      const varName = aliasingNameMapping[typeName]
        ? getSchemaName(aliasingNameMapping[typeName])
        : getSchemaName(varNameArg);

      const isDefaultExport =
        extractDefaultName && typeName === exportInfo.defaultExportName;

      if (!isDefaultExport || aliasingNameMapping[typeName]) {
        const res = generateZodSchemaVarStatementWrapper({
          node,
          sourceFile: cohercedSourceFile,
          varName: inheritedNamespace
            ? camel(`${inheritedNamespace} ${varName}`)
            : varName,
          getSchemaName: (id) =>
            getSchemaName(
              inheritedNamespace ? [inheritedNamespace, id].join(" ") : id
            ),
          skipParseJSDoc,
          sourceText,
          inputPath,
          typeName: inheritedNamespace
            ? camel(`${inheritedNamespace} ${typeName}`)
            : typeName,
          getNamespaceSchemeName: availableNameSpaces,
        });
        ac.push(res);
      }
      // if we're dealing with default export, we need to add a special case
      if (isDefaultExport) {
        const defVarName = getSchemaName(extractDefaultName);
        const updatedNode = updateReadonlyNode(node, {
          name: ts.factory.createIdentifier(extractDefaultName),
        });
        const resDefault = generateZodSchemaVarStatementWrapper({
          node: updatedNode,
          sourceFile: cohercedSourceFile,
          getSchemaName,
          skipParseJSDoc,
          sourceText,
          inputPath,
          typeName: extractDefaultName,
          varName: defVarName,
          isDefault: true,
        });
        ac.push(resDefault);
      }

      return ac;
    },
    []
  );
  return [...foreignSchemas, ...localSchemas];
}

/**
 * Generate zod schemas and integration tests from multiple typescript files.
 *
 * This function take care of the sorting of the `const` declarations and solved potential circular references
 */
export async function generate({
  inputPath,
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
  const zodSchemaNames = zodSchemas.map(({ varName }) => varName);

  // Resolves statements order
  // A schema can't be declared if all the referenced schemas used inside this one are not previously declared.
  const statements = new Map<
    string,
    { typeName: string; value: ts.VariableStatement }
  >();
  const typeImports: Map<
    string,
    { names: Set<string>; defaultName?: string }
  > = new Map();
  /*
   * Abstraction to add types related to paths in typeImports
   */
  const addTypeToTypeImports = (args: {
    typeName: string;
    inputPath: string;
    isDefault?: boolean;
  }) => {
    const { typeName, inputPath, isDefault } = args;
    const pathSet: {
      names: Set<string>;
      defaultName?: string;
    } = typeImports.has(inputPath)
      ? (typeImports.get(inputPath) as { names: Set<string> })
      : { names: new Set() };

    if (isDefault) {
      pathSet.defaultName = typeName;
    } else {
      pathSet.names.add(typeName);
    }

    typeImports.set(inputPath, pathSet);
  };

  const sourceTexts: Map<string, string> = new Map();
  sourceTexts.set(inputPath, sourceText);
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
        ({
          varName,
          dependencies,
          statement,
          typeName,
          requiresImport,
          inputPath,
          sourceText,
          isDefault,
        }) => {
          sourceTexts.set(inputPath, sourceText);
          const isCircular = dependencies.includes(varName);
          const notGeneratedDependencies = dependencies
            .filter((dep) => dep !== varName)
            .filter((dep) => !statements.has(dep));
          if (notGeneratedDependencies.length === 0) {
            done = false;
            if (isCircular) {
              addTypeToTypeImports({ typeName, inputPath, isDefault });
              statements.set(varName, {
                value: transformRecursiveSchema("z", statement, typeName),
                typeName,
              });
            } else {
              if (requiresImport) {
                addTypeToTypeImports({ typeName, inputPath, isDefault });
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
      //typeImports.set(inputPath, typeName);
      addTypeToTypeImports({ typeName, inputPath });
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
        const defaultImport = moduleImports.defaultName;
        if (!defaultImport && !moduleImports.names.size) {
          return "";
        }
        const namedImports = moduleImports.names.size
          ? `{ ${Array.from(moduleImports.names.values()).join(", ")} }`
          : "";
        return `import ${[defaultImport, namedImports]
          .filter(Boolean)
          .join(", ")} from "${typesImportPath}";\n`;
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
/**
 * utility to retrieve the zodSchemaVariableStatement together with other fields that are needed downstream
 * @param args
 */
function generateZodSchemaVarStatementWrapper(args: {
  node: TypeNode;
  typeName: string;
  sourceFile: ts.SourceFile;
  varName: string;
  zodImportValue?: string;
  getSchemaName: (s: string) => string;
  skipParseJSDoc?: boolean;
  sourceText: string;
  inputPath: string;
  isDefault?: boolean;
  getNamespaceSchemeName?: Map<string, (x: string) => string>;
}) {
  const {
    node,
    typeName,
    sourceFile,
    varName,
    zodImportValue = "z",
    getSchemaName,
    skipParseJSDoc,
    sourceText,
    inputPath,
    isDefault,
    getNamespaceSchemeName = new Map(),
  } = args;
  const zodSchema = generateZodSchemaVariableStatement({
    zodImportValue,
    node,
    sourceFile,
    varName,
    getDependencyName: getSchemaName,
    skipParseJSDoc,
    getNamespaceSchemaName: getNamespaceSchemeName,
  });
  return {
    typeName,
    varName,
    sourceText,
    inputPath,
    isDefault,
    ...zodSchema,
  };
}

/**
 * This is a workaround for modifying a readonly node
 * I couldn't find a better way to modify a readonly node...
 *
 * @param node the typescript node to update
 * @param props the props to update
 */
function updateReadonlyNode<K extends TypeNode>(
  node: K,
  props: { name: ts.Identifier }
): K {
  const newNode = node as any;
  Object.entries(props).forEach(([key, value]) => {
    newNode[key] = value;
  });
  return newNode as K;
}
