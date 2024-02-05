import ts from "typescript";

/**
 * Extracts the list of import identifiers from an import clause
 * @param node an ImportDeclaration node
 * @returns an array of all identifiers found in statement
 */
export function getImportIdentifiers(node: ts.ImportDeclaration): string[] {
  if (!node.importClause) return [];

  const { importClause } = node;
  const importIdentifiers: string[] = [];

  // Case `import MyGlobal from "module";`
  if (importClause.name) importIdentifiers.push(importClause.name.text);

  if (importClause.namedBindings) {
    // Cases `import { A, B } from "module"`
    // and `import C from "module"`
    if (ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        if (ts.isImportSpecifier(element)) {
          importIdentifiers.push(element.name.text);
        }
      }
    }
    // Case `import * as A from "module"`
    else if (ts.isNamespaceImport(importClause.namedBindings)) {
      importIdentifiers.push(importClause.namedBindings.name.text);
    }
  }

  return importIdentifiers;
}
