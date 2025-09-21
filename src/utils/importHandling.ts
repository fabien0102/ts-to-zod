import ts from "typescript";
const { factory: f } = ts;

export type ImportIdentifier = {
  name: string;
  original?: string;
};

/**
 * Extracts the list of import identifiers from an import clause
 * @param node an ImportDeclaration node
 * @returns an array of all identifiers found in statement
 */
export function getImportIdentifiers(
  node: ts.ImportDeclaration
): ImportIdentifier[] {
  if (!node.importClause) return [];

  const { importClause } = node;
  const importIdentifiers: ImportIdentifier[] = [];

  // Case `import MyGlobal from "module";`
  if (importClause.name)
    importIdentifiers.push({ name: importClause.name.text });

  if (importClause.namedBindings) {
    // Cases `import { A, B } from "module"`
    // and `import C from "module"`
    if (ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        if (ts.isImportSpecifier(element)) {
          importIdentifiers.push({
            name: element.name.text,
            original: element.propertyName?.text,
          });
        }
      }
    }
    // Case `import * as A from "module"`
    else if (ts.isNamespaceImport(importClause.namedBindings)) {
      importIdentifiers.push({ name: importClause.namedBindings.name.text });
    }
  }

  return importIdentifiers;
}

export function getSingleImportIdentifierForNode(
  node: ts.ImportDeclaration,
  identifier: string
): ImportIdentifier | undefined {
  const allIdentifiers = getImportIdentifiers(node);
  return allIdentifiers.find(({ name }) => name === identifier);
}

/**
 * Creates an import statement from the given arguments
 * @param identifiers array of types to import
 * @param path module path
 * @returns an ImportDeclaration node that corresponds to `import { ...identifiers } from "path"`
 */
export function createImportNode(
  identifiers: ImportIdentifier[],
  path: string
) {
  const specifiers = identifiers.map(({ name, original }) =>
    f.createImportSpecifier(
      false,
      original ? f.createIdentifier(original) : undefined,
      f.createIdentifier(name)
    )
  );

  return f.createImportDeclaration(
    undefined,
    f.createImportClause(false, undefined, f.createNamedImports(specifiers)),
    f.createStringLiteral(path)
  );
}
