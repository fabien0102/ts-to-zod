import {
  createDefaultMapFromNodeModules,
  createFSBackedSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import ts from "typescript";
import { join, sep, posix, relative } from "path";
import { resolveDefaultProperties } from "../utils/resolveDefaultProperties";
import { fixOptionalAny } from "../utils/fixOptionalAny";
import { getImportIdentifiers } from "../utils/importHandling";

interface File {
  sourceText: string;
  relativePath: string;
}
export interface ValidateGeneratedTypesProps {
  sourceTypes: File;
  zodSchemas: File;
  integrationTests: File;
  skipParseJSDoc: boolean;
  extraFiles?: File[];
}

/**
 * Use typescript compiler to validate the generated zod schemas.
 */
export function validateGeneratedTypes({
  sourceTypes,
  zodSchemas,
  integrationTests,
  skipParseJSDoc,
  extraFiles = [],
}: ValidateGeneratedTypesProps) {
  // Shared configuration
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2016,
    esModuleInterop: true,
  };

  const sourceFile = ts.createSourceFile(
    "index.ts",
    skipParseJSDoc
      ? sourceTypes.sourceText
      : resolveDefaultProperties(sourceTypes.sourceText),
    ts.ScriptTarget.Latest
  );

  // Extracting imports that should be handled as any
  const importsToHandleAsAny = new Set<string>();
  const extractImportIdentifiers = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      // If the import declaration is referenced in the extraFiles, it should not be "fixed"
      !extraFiles.find(
        (file) =>
          relative(
            file.relativePath,
            (node.moduleSpecifier as ts.StringLiteral).text
          ) === ""
      )
    ) {
      if (node.importClause) {
        const identifiers = getImportIdentifiers(node);
        identifiers.forEach((i) => importsToHandleAsAny.add(i));
      }
    }
  };
  ts.forEachChild(sourceFile, extractImportIdentifiers);

  const fixedSourceForValidation = fixOptionalAny(
    sourceFile,
    importsToHandleAsAny
  );

  // Create virtual files system with our files
  const fsMap = createDefaultMapFromNodeModules({
    target: compilerOptions.target,
  });

  // Adding extra "folder" to the paths to make sure the root of the virtual environment is at the "right" level
  const extraPath = getExtraPath(extraFiles);

  fsMap.set(getPath(sourceTypes, extraPath), fixedSourceForValidation);
  fsMap.set(getPath(zodSchemas, extraPath), zodSchemas.sourceText);
  fsMap.set(getPath(integrationTests, extraPath), integrationTests.sourceText);

  if (extraFiles) {
    extraFiles.forEach((file) =>
      fsMap.set(getPath(file, extraPath), file.sourceText)
    );
  }

  // Create a virtual typescript environment
  const projectRoot = makePosixPath(process.cwd());
  const system = createFSBackedSystem(fsMap, projectRoot, ts);
  const env = createVirtualTypeScriptEnvironment(
    system,
    [sourceTypes, zodSchemas, integrationTests].map((file) =>
      getPath(file, extraPath)
    ),
    ts,
    compilerOptions
  );

  // Get the diagnostic
  const errors: ts.Diagnostic[] = [];
  errors.push(
    ...env.languageService.getSemanticDiagnostics(
      getPath(integrationTests, extraPath)
    )
  );
  errors.push(
    ...env.languageService.getSyntacticDiagnostics(
      getPath(integrationTests, extraPath)
    )
  );

  return errors.map((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n"
    );
    if (diagnostic.file && diagnostic.start) {
      const position = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );
      const details = getDetails(diagnostic.file, position.line);

      if (details.zodType && details.specType && details.from) {
        return details.from === "spec"
          ? `'${details.specType}' is not compatible with '${details.zodType}':\n${message}`
          : `'${details.zodType}' is not compatible with '${details.specType}':\n${message}`;
      }
    }
    return message;
  });
}

function getDetails(file: ts.SourceFile, line: number) {
  const source = file.getFullText().split("\n")[line];
  const pattern = /expectType<(\w.+)>\({} as (\w.+)\)/;
  const expression: {
    source: string;
    specType?: string;
    zodType?: string;
    from?: "type" | "spec";
  } = {
    source,
  };
  Array.from(pattern.exec(source) || []).map((chunk, i) => {
    if (chunk.startsWith("spec.")) {
      expression.specType = chunk.slice("spec.".length);
      if (i === 1) {
        expression.from = "type";
      }
    }
    if (chunk.endsWith("InferredType")) {
      expression.zodType = chunk.slice(0, -"InferredType".length);
      if (i === 1) {
        expression.from = "spec";
      }
    }
  });
  return expression;
}

function getPath(file: File, extraPath: string = "") {
  return makePosixPath(join(process.cwd(), extraPath, file.relativePath));
}

function makePosixPath(str: string) {
  return str.split(sep).join(posix.sep);
}

function countNetUpFoldersInRelativePath(relativePath: string): number {
  let counter = 0;

  if (!relativePath) return 0;

  relativePath
    .split(sep)
    .slice(0, -1)
    .forEach((segment) => {
      if (segment === "..") {
        counter++;
      } else if (segment !== "." && segment !== "") {
        // Decrement for "down" movement, but not below zero
        if (counter > 0) counter--;
      }
      // No action needed for current directory (.) or empty segments
    });
  return counter;
}

// When extra files are provided, we need to add a folder to the path to make sure
// the root of the virtual environment is at the "right" level
function getExtraPath(extraFiles: File[]) {
  let maxDepth = 0;
  extraFiles.forEach(({ relativePath }) => {
    const depth = countNetUpFoldersInRelativePath(relativePath);
    if (depth > maxDepth) maxDepth = depth;
  });
  return "folder/".repeat(maxDepth);
}
