import ts, { factory as f } from 'typescript';

/**
 * Add optional property to `any`, `undefined` or imported types to workaround comparison issue.
 *
 * ref:
 * -> https://github.com/fabien0102/ts-to-zod/issues/140
 * -> https://github.com/fabien0102/ts-to-zod/issues/203
 * -> https://github.com/fabien0102/ts-to-zod/issues/239
 *
 */
export function fixOptionalAny(
  sourceFile: ts.SourceFile,
  importsToHandleAsAny: Set<string>
) {
  function shouldAddQuestionToken(node: ts.TypeNode) {
    return (
      // https://github.com/fabien0102/ts-to-zod/issues/140
      node.kind === ts.SyntaxKind.AnyKeyword ||
      // https://github.com/fabien0102/ts-to-zod/issues/239
      node.kind === ts.SyntaxKind.UndefinedKeyword ||
      // Handling type referencing imported types
      // https://github.com/fabien0102/ts-to-zod/issues/203
      (ts.isTypeReferenceNode(node) &&
        importsToHandleAsAny.has(node.typeName.getText(sourceFile)))
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
