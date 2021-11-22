import ts from "typescript";

/**
 * Helper to filter out any `null` node
 *
 * @param node
 * @returns
 */
export function isNotNull(node: ts.TypeNode) {
  return (
    !ts.isLiteralTypeNode(node) ||
    node.literal.kind !== ts.SyntaxKind.NullKeyword
  );
}
