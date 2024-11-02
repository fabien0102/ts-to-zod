import ts from 'typescript';

const typeScriptHelper = [
  'Array',
  'Promise',
  'Omit',
  'Pick',
  'Record',
  'Partial',
  'Required',
];

export type TypeNode =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration;

export type TypeNameReference = {
  name: string;
  partOfQualifiedName: boolean;
};

export function isTypeNode(node: ts.Node): node is TypeNode {
  return (
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node)
  );
}

export function getReferencedTypeNames(
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration,
  sourceFile: ts.SourceFile
): TypeNameReference[] {
  const referenceTypeNames = new Set<TypeNameReference>();

  // Adding the node name
  referenceTypeNames.add({ name: node.name.text, partOfQualifiedName: false });

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
      handleTypeReferenceNode(typeNode);
    } else if (ts.isArrayTypeNode(typeNode)) {
      handleTypeNode(typeNode.elementType);
    } else if (ts.isTypeLiteralNode(typeNode)) {
      typeNode.forEachChild(visitorExtract);
    } else if (ts.isTupleTypeNode(typeNode)) {
      typeNode.elements.forEach(handleTypeNode);
    } else if (ts.isRestTypeNode(typeNode)) {
      handleTypeNode(typeNode.type);
    } else if (
      ts.isIntersectionTypeNode(typeNode) ||
      ts.isUnionTypeNode(typeNode)
    ) {
      typeNode.types.forEach(handleTypeNode);
    } else if (ts.isIndexedAccessTypeNode(typeNode)) {
      handleTypeNode(typeNode.objectType);
    }
  };

  const handleTypeReferenceNode = (typeRefNode: ts.TypeReferenceNode) => {
    if (ts.isQualifiedName(typeRefNode.typeName)) {
      const typeName = typeRefNode.typeName.left.getText(sourceFile);
      referenceTypeNames.add({ name: typeName, partOfQualifiedName: true });
      return;
    }

    const typeName = typeRefNode.typeName.getText(sourceFile);
    if (typeScriptHelper.indexOf(typeName) > -1 && typeRefNode.typeArguments) {
      typeRefNode.typeArguments.forEach((t) => handleTypeNode(t));
      return;
    }

    referenceTypeNames.add({ name: typeName, partOfQualifiedName: false });
  };

  if (ts.isInterfaceDeclaration(node)) {
    const heritageClauses = (node as ts.InterfaceDeclaration).heritageClauses;

    if (heritageClauses) {
      heritageClauses.forEach((clause) => {
        const extensionTypes = clause.types;
        extensionTypes.forEach((extensionTypeNode) => {
          const typeName = extensionTypeNode.expression.getText(sourceFile);

          if (extensionTypeNode.typeArguments) {
            extensionTypeNode.typeArguments.forEach((t) => handleTypeNode(t));
          }

          if (typeScriptHelper.indexOf(typeName) === -1) {
            referenceTypeNames.add({
              name: typeName,
              partOfQualifiedName: false,
            });
          }
        });
      });
    }

    node.forEachChild(visitorExtract);
  } else if (ts.isTypeAliasDeclaration(node)) {
    handleTypeNode(node.type);
  }

  return Array.from(referenceTypeNames);
}
