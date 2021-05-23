import {
  createDefaultMapFromNodeModules,
  createFSBackedSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import ts from "typescript";
import { join } from "path";
import { resolveDefaultProperties } from "../utils/resolveDefaultProperties";
interface File {
  sourceText: string;
  relativePath: string;
}
export interface ValidateGeneratedTypesProps {
  sourceTypes: File;
  zodSchemas: File;
  integrationTests: File;
}

/**
 * Use typescript compiler to validate the generated zod schemas.
 */
export function validateGeneratedTypes({
  sourceTypes,
  zodSchemas,
  integrationTests,
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
  fsMap.set(
    getPath(sourceTypes),
    resolveDefaultProperties(sourceTypes.sourceText)
  );
  fsMap.set(getPath(zodSchemas), zodSchemas.sourceText);
  fsMap.set(getPath(integrationTests), integrationTests.sourceText);

  // Create a virtual typescript environment
  const system = createFSBackedSystem(fsMap, projectRoot, ts);
  const env = createVirtualTypeScriptEnvironment(
    system,
    [sourceTypes, zodSchemas, integrationTests].map(getPath),
    ts,
    compilerOptions
  );

  // Get the diagnostic
  const errors: ts.Diagnostic[] = [];
  errors.push(
    ...env.languageService.getSemanticDiagnostics(getPath(integrationTests))
  );
  errors.push(
    ...env.languageService.getSyntacticDiagnostics(getPath(integrationTests))
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

function getPath(file: File) {
  return join(process.cwd(), file.relativePath);
}
