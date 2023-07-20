import ts, { factory as f } from "typescript";
import { getImportIdentifiers } from "./importHandling";

/**
 * Add optional property to `any` and type references to workaround comparaison issue.
 *
 * ref: https://github.com/fabien0102/ts-to-zod/issues/140
 */
export function fixOptional(sourceText: string) {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const importedIdentifiers = getImportedIdentifiers(sourceFile);

  const markAsOptional: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit: ts.Visitor = (node) => {
      node = ts.visitEachChild(node, visit, context);

      if (ts.isPropertySignature(node) && node.type) {
        if (
          node.type.kind === ts.SyntaxKind.AnyKeyword ||
          (ts.isTypeReferenceNode(node.type) &&
            importedIdentifiers.has(node.type.getText(sourceFile)))
        ) {
          return makePropertyOptional(node);
        } else if (
          ts.isArrayTypeNode(node.type) &&
          ts.isTypeReferenceNode(node.type.elementType) &&
          importedIdentifiers.has(node.type.elementType.getText(sourceFile))
        ) {
          return makePropertyOptional(node);
        } else if (
          ts.isIntersectionTypeNode(node.type) ||
          ts.isUnionTypeNode(node.type)
        ) {
          const importedType = node.type.types.find(
            (child) =>
              ts.isTypeReferenceNode(child) &&
              importedIdentifiers.has(child.getText(sourceFile))
          );
          if (importedType) {
            return makePropertyOptional(node);
          }
        }
      }

      return node;
    };

    return (node) => ts.visitNode(node, visit);
  };

  const outputFile = ts.transform(sourceFile, [markAsOptional]);

  return printer.printFile(outputFile.transformed[0]);
}

function getImportedIdentifiers(sourceFile: ts.SourceFile) {
  const importNamesAvailable = new Set<string>();
  const typeNameMapBuilder = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const imports = getImportIdentifiers(node);
      imports.forEach((i) => importNamesAvailable.add(i));
    }
  };

  ts.forEachChild(sourceFile, typeNameMapBuilder);
  return importNamesAvailable;
}

function makePropertyOptional(node: ts.PropertySignature) {
  return ts.factory.createPropertySignature(
    node.modifiers,
    node.name,
    f.createToken(ts.SyntaxKind.QuestionToken), // Add `questionToken`
    node.type
  );
}
