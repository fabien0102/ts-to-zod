import ts from "typescript";

/**
 * Recursively checks if a type node is a function type
 */
function isFunctionTypeNode(type: ts.TypeNode): boolean {
  if (ts.isFunctionTypeNode(type)) {
    return true;
  }

  if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
    return type.types.some(isFunctionTypeNode);
  }

  if (ts.isParenthesizedTypeNode(type)) {
    return isFunctionTypeNode(type.type);
  }

  return false;
}

/**
 * Detects if a type node is a Promise type
 */
function isPromiseTypeNode(type: ts.TypeNode): boolean {
  if (ts.isTypeReferenceNode(type)) {
    const typeName = type.typeName;
    if (ts.isIdentifier(typeName) && typeName.text === "Promise") {
      return true;
    }
  }
  return false;
}

/**
 * Detects if a type alias is directly a function type (not a property within an interface)
 *
 * @example
 * ```ts
 * // Returns true
 * type MyFunc = (x: string) => number
 * type Handler = ((event: Event) => void) | string
 *
 * // Returns false
 * type MyString = string
 * interface API { method: () => void } // function is a property, not direct
 * ```
 */
export function isDirectFunctionType(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
): boolean {
  if (ts.isTypeAliasDeclaration(node)) {
    return isFunctionTypeNode(node.type);
  }
  return false;
}

/**
 * Detects if a type alias is directly a Promise type
 */
export function isDirectPromiseType(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
): boolean {
  if (ts.isTypeAliasDeclaration(node)) {
    return isPromiseTypeNode(node.type);
  }
  return false;
}

/**
 * Detects if a function type returns a Promise
 */
function functionReturnsPromise(type: ts.TypeNode): boolean {
  if (ts.isFunctionTypeNode(type)) {
    return isPromiseTypeNode(type.type);
  }
  return false;
}

/**
 * Detects if a type alias is a function type that returns a Promise
 *
 * @example
 * ```ts
 * // Returns true
 * type AsyncFunc = (id: string) => Promise<User>
 * type AsyncHandler = () => Promise<void>
 *
 * // Returns false
 * type SyncFunc = (x: string) => number
 * type PromiseType = Promise<User> // Promise but not function
 * ```
 */
export function isFunctionReturningPromise(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
): boolean {
  if (ts.isTypeAliasDeclaration(node)) {
    return functionReturnsPromise(node.type);
  }
  return false;
}
