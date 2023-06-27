import ts, { factory as f } from "typescript";

/**
 * Add optional property to `any` to workaround comparaison issue.
 *
 * ref: https://github.com/fabien0102/ts-to-zod/issues/140
 */
export function fixOptionalAny(sourceText: string) {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const markAnyAsOptional: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit: ts.Visitor = (node) => {
      node = ts.visitEachChild(node, visit, context);

      if (
        ts.isPropertySignature(node) &&
        node.type?.kind === ts.SyntaxKind.AnyKeyword
      ) {
        return ts.factory.createPropertySignature(
          node.modifiers,
          node.name,
          f.createToken(ts.SyntaxKind.QuestionToken), // Add `questionToken`
          node.type
        );
      }

      return node;
    };

    return (node) => ts.visitNode(node, visit);
  };

  const outputFile = ts.transform(sourceFile, [markAnyAsOptional]);

  return printer.printFile(outputFile.transformed[0]);
}
