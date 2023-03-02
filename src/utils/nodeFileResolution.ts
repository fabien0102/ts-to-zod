import ts from "typescript";
/**
 * This function uses the TS Compiler API to resolve the import module path
 */
export function nodeFileResolution({
  containingFile,
  importName,
}: {
  containingFile: string;
  importName: string;
}) {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
  };
  const host = ts.createCompilerHost(options);
  const resolutionResult = ts.resolveModuleName(
    importName,
    containingFile,
    options,
    host
  );
  const { resolvedModule } = resolutionResult;
  if (resolvedModule) {
    return resolvedModule.resolvedFileName;
  }
  throw new Error(
    `Could not resolve module "${importName}" in file "${containingFile}".`
  );
}
