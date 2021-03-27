import * as ts from "typescript";

/**
 * Find and return a typescript node in a sourcefile.
 */
export function findNode<TNode extends ts.Node>(
  sourceFile: ts.SourceFile,
  predicate: (node: ts.Node) => node is TNode
) {
  let declarationNode: TNode | undefined;

  const visitor = (node: ts.Node) => {
    if (!declarationNode && predicate(node)) {
      declarationNode = node;
    }
  };
  ts.forEachChild(sourceFile, visitor);

  return declarationNode;
}
