import ts from "typescript";

export type TypeMetadata = "none" | "promise" | "promiseReturningFunction";

type TypeNode =
  | ts.TypeNode
  | ts.TypeAliasDeclaration
  | ts.InterfaceDeclaration
  | ts.EnumDeclaration;

export function analyzeTypeMetadata(
  typeNode: TypeNode,
  typeChecker?: ts.TypeChecker
): TypeMetadata {
  if (ts.isTypeAliasDeclaration(typeNode)) {
    return analyzeTypeMetadata(typeNode.type, typeChecker);
  }

  if (ts.isFunctionTypeNode(typeNode) && isPromise(typeNode.type)) {
    return "promiseReturningFunction";
  }

  if (isPromise(typeNode)) {
    return "promise";
  }

  return "none";
}

function isPromise(typeNode: TypeNode): boolean {
  return (
    ts.isTypeReferenceNode(typeNode) &&
    ts.isIdentifier(typeNode.typeName) &&
    typeNode.typeName.text === "Promise"
  );
}
