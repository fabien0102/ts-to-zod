import ts, { factory as f } from "typescript";
import { getImportIdentifiers } from "./importHandling";

/**
 * Add optional property to `any` and type references to workaround comparison issue.
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

  const markAsOptional: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit: ts.Visitor = (node) => {
      node = ts.visitEachChild(node, visit, context);

      if (ts.isPropertySignature(node) && node.type) {
        if (node.type.kind === ts.SyntaxKind.AnyKeyword) {
          return makePropertyOptional(node);
        }
      }

      return node;
    };

    return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
  };

  const outputFile = ts.transform(sourceFile, [markAsOptional]);

  return printer.printFile(outputFile.transformed[0]);
}

function makePropertyOptional(node: ts.PropertySignature) {
  return ts.factory.createPropertySignature(
    node.modifiers,
    node.name,
    f.createToken(ts.SyntaxKind.QuestionToken), // Add `questionToken`
    node.type
  );
}
