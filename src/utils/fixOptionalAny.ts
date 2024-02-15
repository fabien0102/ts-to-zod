import ts, { factory as f } from "typescript";

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

  // Apply transformation
  const outputFile = ts.transform(sourceFile, [markAnyAsOptional]);

  // Printing the transformed file
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return printer.printFile(outputFile.transformed[0]);
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
      if (ts.isUnionTypeNode(typeNode) || ts.isIntersectionTypeNode(typeNode)) {
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

function shouldAddQuestionToken(node: ts.TypeNode) {
  return (
    node.kind === ts.SyntaxKind.AnyKeyword ||
    (ts.isTypeReferenceNode(node) && isImportedTypeReferenceNode(node))
  );
}

function isImportedTypeReferenceNode(node: ts.TypeReferenceNode) {
  return true;
}

function createOptionalPropertyNode(node: ts.PropertySignature) {
  return ts.factory.createPropertySignature(
    node.modifiers,
    node.name,
    f.createToken(ts.SyntaxKind.QuestionToken), // Add `questionToken`
    node.type
  );
}
