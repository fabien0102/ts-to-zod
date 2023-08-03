import ts from "typescript";

export type TypeNode =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration;

export function isTypeNode(node: ts.Node): node is TypeNode {
  return (
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  );
}

export function getExtractedTypeNames(
  node: TypeNode,
  sourceFile: ts.SourceFile
): string[] {
  const referenceTypeNames = new Set<string>();
  referenceTypeNames.add(node.name.text);

  const heritageClauses = (node as ts.InterfaceDeclaration).heritageClauses;

  if (heritageClauses) {
    heritageClauses.forEach((clause) => {
      const extensionTypes = clause.types;
      extensionTypes.forEach((extensionTypeNode) => {
        const typeName = extensionTypeNode.expression.getText(sourceFile);

        referenceTypeNames.add(typeName);
      });
    });
  }

  const visitorExtract = (child: ts.Node) => {
    const childNode = child as ts.PropertySignature;
    if (!ts.isPropertySignature(childNode)) {
      return;
    }

    if (childNode.type) {
      let typeNode = childNode.type;

      if (ts.isParenthesizedTypeNode(childNode.type)) {
        typeNode = childNode.type.type;
      }

      if (ts.isTypeReferenceNode(typeNode)) {
        referenceTypeNames.add(typeNode.getText(sourceFile));
      } else if (
        ts.isArrayTypeNode(typeNode) &&
        ts.isTypeNode(typeNode.elementType)
      ) {
        referenceTypeNames.add(typeNode.elementType.getText(sourceFile));
      } else if (ts.isTypeLiteralNode(typeNode)) {
        typeNode.forEachChild(visitorExtract);
      } else if (
        ts.isIntersectionTypeNode(typeNode) ||
        ts.isUnionTypeNode(typeNode)
      ) {
        typeNode.types.forEach((typeNode: ts.TypeNode) => {
          if (ts.isTypeReferenceNode(typeNode)) {
            referenceTypeNames.add(typeNode.getText(sourceFile));
          } else typeNode.forEachChild(visitorExtract);
        });
      }
    }
  };

  node.forEachChild(visitorExtract);

  return Array.from(referenceTypeNames);
}
