import {
  createDefaultMapFromNodeModules,
  createFSBackedSystem,
  // createSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import ts from "typescript";
import { getImportPath } from "../utils/getImportPath";
import { generate } from "./generate";
import { join } from "path";

export interface ValidateGeneratedTypesProps {
  /**
   * File content of the source types.
   */
  sourceText: string;

  /**
   * Getter for generated zod schemas
   */
  getZodSchemasFile: ReturnType<typeof generate>["getZodSchemasFile"];

  /**
   * Getter for generated integration tests
   */
  getIntegrationTestFile: ReturnType<typeof generate>["getIntegrationTestFile"];
}

/**
 * Use typescript compiler to validate the generated zod schemas.
 */
export function validateGeneratedTypes({
  sourceText,
  getZodSchemasFile,
  getIntegrationTestFile,
}: ValidateGeneratedTypesProps) {
  // Shared configuration
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2016,
    esModuleInterop: true,
  };

  // Create virtual files system with our 3 files
  const fsMap = createDefaultMapFromNodeModules({
    target: compilerOptions.target,
  });
  const projectRoot = process.cwd();
  const fileNames = {
    source: join(projectRoot, "source.ts"),
    zod: join(projectRoot, "source.zod.ts"),
    test: join(projectRoot, "source.test.ts"),
  };
  fsMap.set(fileNames.source, sourceText);
  fsMap.set(
    fileNames.zod,
    getZodSchemasFile(getImportPath(fileNames.zod, fileNames.source))
  );
  fsMap.set(
    fileNames.test,
    getIntegrationTestFile(
      getImportPath(fileNames.test, fileNames.source),
      getImportPath(fileNames.test, fileNames.zod)
    )
  );

  // Create a virtual typescript environment
  // const system = createSystem(fsMap);
  const system = createFSBackedSystem(fsMap, projectRoot, ts);
  const env = createVirtualTypeScriptEnvironment(
    system,
    Object.values(fileNames),
    ts,
    compilerOptions
  );

  // Get the diagnostic
  const errors: ts.Diagnostic[] = [];
  errors.push(...env.languageService.getSemanticDiagnostics(fileNames.test));
  errors.push(...env.languageService.getSyntacticDiagnostics(fileNames.test));

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

      return { ...position, message, ...details };
    }
    return { message };
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
