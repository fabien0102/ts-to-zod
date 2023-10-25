import ts from "typescript";

const typeScriptHelper = [
  "Array",
  "Promise",
  "Omit",
  "Pick",
  "Record",
  "Partial",
  "Required",
];

export type TypeNode = (
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
) & {
  /**
   * this flag indicates if the type is exported from the file
   */
  exported?: boolean;
};

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

  const visitorExtract = (childNode: ts.Node) => {
    // if (ts.isTypeLiteralNode(childNode)) {
    //   childNode.members.forEach(visitorExtract);
    //   return;
    // }
    if (!ts.isPropertySignature(childNode)) {
      return;
    }
    if (childNode.type) {
      handleTypeNode(childNode.type);
    }
  };

  const handleTypeNode = (typeNode: ts.Node) => {
    if (ts.isTypeReferenceNode(typeNode)) {
      handleTypeReferenceNode(typeNode);
    } else if (ts.isArrayTypeNode(typeNode)) {
      handleTypeNode(typeNode.elementType);
    } else if (ts.isTypeLiteralNode(typeNode)) {
      typeNode.forEachChild(visitorExtract);
    } else if (
      ts.isIntersectionTypeNode(typeNode) ||
      ts.isUnionTypeNode(typeNode)
    ) {
      typeNode.types.forEach((childNode: ts.TypeNode) => {
        if (ts.isTypeReferenceNode(childNode)) {
          handleTypeReferenceNode(childNode);
        } else childNode.forEachChild(visitorExtract);
      });
    }
  };

  const handleTypeReferenceNode = (typeNode: ts.TypeReferenceNode) => {
    // let escapedName = "";
    // if (ts.isIdentifier(typeNode.typeName)) {
    //   escapedName = typeNode.typeName.escapedText.toString();
    // }
    // if (
    //   ts.isQualifiedName(typeNode.typeName) &&
    //   ts.isIdentifier(typeNode.typeName.left)
    // ) {
    //   const left = typeNode.typeName.left.escapedText.toString();
    //   escapedName = left;
    // }
    // if (!escapedName) {
    //   return;
    // }
    const typeName = typeNode.typeName.getText(sourceFile);
    if (typeScriptHelper.indexOf(typeName) > -1 && typeNode.typeArguments) {
      typeNode.typeArguments.forEach((t) => handleTypeNode(t));
    } else {
      referenceTypeNames.add(typeName);
    }
  };

  if (ts.isInterfaceDeclaration(node)) {
    const heritageClauses = node.heritageClauses;

    if (heritageClauses) {
      heritageClauses.forEach((clause) => {
        const extensionTypes = clause.types;
        extensionTypes.forEach((extensionTypeNode) => {
          const typeName = extensionTypeNode.expression.getText(sourceFile);

          referenceTypeNames.add(typeName);
        });
      });
      node.forEachChild(visitorExtract);
    }
  } else if (ts.isTypeAliasDeclaration(node)) {
    handleTypeNode(node.type);
  }

  return Array.from(referenceTypeNames);
}

export function getExtractedTypeNamesFromExportDeclaration(
  node: ts.ExportDeclaration & { moduleSpecifier: ts.StringLiteral }
) {
  const referenceTypeNames: string[] = [];

  const eventuallyAddType = (childNode: ts.Node) => {
    if (ts.isNamedExports(childNode)) {
      childNode.elements.forEach((element) => {
        if (ts.isIdentifier(element.name)) {
          referenceTypeNames.push(element.name.escapedText.toString());
        }
      });
    }
  };

  node.forEachChild(eventuallyAddType);

  return referenceTypeNames;
}
