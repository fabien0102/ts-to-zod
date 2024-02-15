import ts, { factory as f } from "typescript";
import { getImportIdentifiers } from "./importHandling";

/**
 * Add optional property to `any` to workaround comparison issue.
 *
 * ref: https://github.com/fabien0102/ts-to-zod/issues/140
 */
export function fixOptionalAny(sourceText: string) {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );

  // Extracting imports
  const importNamesAvailable = new Set<string>();
  const extractImportIdentifiers = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const identifiers = getImportIdentifiers(node);
      identifiers.forEach((i) => importNamesAvailable.add(i));
    }
  };
  ts.forEachChild(sourceFile, extractImportIdentifiers);

  function shouldAddQuestionToken(node: ts.TypeNode) {
    return (
      node.kind === ts.SyntaxKind.AnyKeyword ||
      (ts.isTypeReferenceNode(node) &&
        importNamesAvailable.has(node.typeName.getText(sourceFile)))
    );
  }

  const markAnyAsOptional: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit: ts.Visitor = (node) => {
      node = ts.visitEachChild(node, visit, context);

      if (ts.isPropertySignature(node) && node.type) {
        const typeNode = node.type;

        if (shouldAddQuestionToken(typeNode)) {
          return createOptionalPropertyNode(node);
        }

        // Handling nested Any / TypeReference
        if (
          ts.isUnionTypeNode(typeNode) ||
          ts.isIntersectionTypeNode(typeNode)
        ) {
          const withQuestionToken = typeNode.types.filter((childNode) =>
            shouldAddQuestionToken(childNode)
          );
          if (withQuestionToken.length > 0)
            return createOptionalPropertyNode(node);
        }
      }
      return node;
    };

    return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };

  // Apply transformation
  const outputFile = ts.transform(sourceFile, [markAnyAsOptional]);

  // Printing the transformed file
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return printer.printFile(outputFile.transformed[0]);
}

function createOptionalPropertyNode(node: ts.PropertySignature) {
  return ts.factory.createPropertySignature(
    node.modifiers,
    node.name,
    f.createToken(ts.SyntaxKind.QuestionToken), // Add `questionToken`
    node.type
  );
}
