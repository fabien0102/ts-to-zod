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
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration,
  sourceFile: ts.SourceFile
): string[] {
  const referenceTypeNames = new Set<string>();

  // Adding the node name
  referenceTypeNames.add(node.name.text);

  const visitorExtract = (child: ts.Node) => {
    if (!ts.isPropertySignature(child)) {
      return;
    }

    const childNode = child as ts.PropertySignature;
    if (childNode.type) {
      handleTypeNode(childNode.type);
    }
  };

  const handleTypeNode = (typeNode: ts.Node) => {
    if (ts.isParenthesizedTypeNode(typeNode)) {
      typeNode = typeNode.type;
    }

    if (ts.isTypeReferenceNode(typeNode)) {
      referenceTypeNames.add(typeNode.getText(sourceFile));
    } else if (ts.isArrayTypeNode(typeNode)) {
      handleTypeNode(typeNode.elementType);
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
  };

  if (ts.isInterfaceDeclaration(node)) {
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

    node.forEachChild(visitorExtract);
  } else if (ts.isTypeAliasDeclaration(node)) {
    handleTypeNode(node.type);
  }

  return Array.from(referenceTypeNames);
}
