import ts from "typescript";

export type TypeNode = (
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
) & {
  visited?: boolean;

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
  node: TypeNode,
  sourceFile: ts.SourceFile,
  typeNameMapping: Map<string, TypeNode>
) {
  const referenceTypeNames: string[] = [];

  const eventuallyAddType = (childNode: ts.Node) => {
    if (
      ts.isPropertySignature(childNode) &&
      childNode.type &&
      ts.isTypeReferenceNode(childNode.type)
    ) {
      let escapedName = "";
      if (ts.isIdentifier(childNode.type.typeName)) {
        escapedName = childNode.type.typeName.escapedText.toString();
      }
      if (
        ts.isQualifiedName(childNode.type.typeName) &&
        ts.isIdentifier(childNode.type.typeName.left)
      ) {
        const left = childNode.type.typeName.left.escapedText.toString();
        escapedName = left;
      }
      if (!escapedName) {
        return;
      }
      referenceTypeNames.push(escapedName);

      const typeNode = typeNameMapping.get(escapedName);
      if (typeNode) {
        typeNode.visited = true;
        recursiveExtract(typeNode);
      }
    }
  };

  const recursiveExtract = (node: TypeNode) => {
    if (node.visited) {
      return;
    }

    const heritageClauses = (node as ts.InterfaceDeclaration).heritageClauses;

    if (heritageClauses) {
      heritageClauses.forEach((clause) => {
        const extensionTypes = clause.types;
        extensionTypes.forEach((extensionTypeNode) => {
          const typeName = extensionTypeNode.expression.getText(sourceFile);
          const typeNode = typeNameMapping.get(typeName);

          referenceTypeNames.push(typeName);

          if (typeNode) {
            typeNode.visited = true;
            recursiveExtract(typeNode);
          }
        });
      });
    }

    node.forEachChild((child) => {
      if (ts.isTypeLiteralNode(child)) {
        child.members.forEach(eventuallyAddType);
      } else {
        eventuallyAddType(child);
      }
    });
  };

  recursiveExtract(node);
  return [node.name.text, ...referenceTypeNames];
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
