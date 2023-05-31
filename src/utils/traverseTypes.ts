import ts from "typescript";

export type TypeNode = (
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
) & { visited?: boolean };

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
) {
  const referenceTypeNames: string[] = [];

  if (node.visited) {
    return;
  }

  const heritageClauses = (node as ts.InterfaceDeclaration).heritageClauses;

  if (heritageClauses) {
    heritageClauses.forEach((clause) => {
      const extensionTypes = clause.types;
      extensionTypes.forEach((extensionTypeNode) => {
        const typeName = extensionTypeNode.expression.getText(sourceFile);

        referenceTypeNames.push(typeName);
      });
    });
  }

  node.forEachChild((child) => {
    const childNode = child as ts.PropertySignature;
    if (!ts.isPropertySignature(childNode)) {
      return;
    }

    if (childNode.type && ts.isTypeReferenceNode(childNode.type)) {
      referenceTypeNames.push(childNode.type.getText(sourceFile));
    }
  });

  return [node.name.text, ...referenceTypeNames];
}
