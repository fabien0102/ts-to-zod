import ts from "typescript";
import { getJSDocTags } from "../core/jsDocTags";

/**
 * Remove optional properties when `@default` jsdoc tag is defined.
 *
 * Indeed, `z.{type}().optional().default({value})` will be
 * compile as a non-optional type.
 */
export function resolveDefaultProperties(sourceText: string) {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const removeOptionalTransformer: ts.TransformerFactory<ts.SourceFile> = (
    context
  ) => {
    const visit: ts.Visitor = (node) => {
      node = ts.visitEachChild(node, visit, context);

      if (ts.isPropertySignature(node)) {
        const jsDocTags = getJSDocTags(node, sourceFile, {});
        if (jsDocTags.default !== undefined) {
          const type = node.type
            ? ts.visitEachChild(node.type, omitUndefinedKeyword, context)
            : undefined;
          return ts.factory.createPropertySignature(
            node.modifiers,
            node.name,
            undefined, // Remove `questionToken`
            type
          );
        }
      }
      return node;
    };

    return (node) => ts.visitNode(node, visit);
  };

  const outputFile = ts.transform(sourceFile, [removeOptionalTransformer]);

  return printer.printFile(outputFile.transformed[0]);
}

function omitUndefinedKeyword(node: ts.Node) {
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
    return undefined;
  }
  return node;
}
