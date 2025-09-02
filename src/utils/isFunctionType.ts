import ts from "typescript";

interface TypeMetadata {
  isFunction: boolean;
  isPromiseReturningFunction: boolean;
  isPromiseType: boolean;
}

export function analyzeTypeMetadata(
  typeNode:
    | ts.TypeNode
    | ts.TypeAliasDeclaration
    | ts.InterfaceDeclaration
    | ts.EnumDeclaration,
  typeChecker?: ts.TypeChecker
): TypeMetadata {
  if (ts.isTypeAliasDeclaration(typeNode)) {
    return analyzeTypeMetadata(typeNode.type, typeChecker);
  }

  if (ts.isInterfaceDeclaration(typeNode)) {
    return {
      isFunction: false,
      isPromiseReturningFunction: false,
      isPromiseType: false,
    };
  }

  if (ts.isEnumDeclaration(typeNode)) {
    return {
      isFunction: false,
      isPromiseReturningFunction: false,
      isPromiseType: false,
    };
  }

  const isFunction = ts.isFunctionTypeNode(typeNode);

  let isPromiseType = false;
  let isPromiseReturningFunction = false;

  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName;
    if (ts.isIdentifier(typeName) && typeName.text === "Promise") {
      isPromiseType = true;
    }
  }

  if (isFunction && ts.isFunctionTypeNode(typeNode)) {
    const returnType = typeNode.type;
    if (ts.isTypeReferenceNode(returnType)) {
      const typeName = returnType.typeName;
      if (ts.isIdentifier(typeName) && typeName.text === "Promise") {
        isPromiseReturningFunction = true;
        isPromiseType = false;
      }
    }
  }

  return {
    isFunction,
    isPromiseReturningFunction,
    isPromiseType,
  };
}
