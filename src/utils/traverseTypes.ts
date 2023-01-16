import ts from "typescript";

export type TypeNode = (
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.EnumDeclaration
) & { visited?: boolean };

export function getExtractedTypeNames(
  node: TypeNode,
  sourceFile: ts.SourceFile,
  typeNameMapping: Map<string, TypeNode>
) {
  const referenceTypeNames: string[] = [];

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
      const childNode = child as ts.PropertySignature;
      if (childNode.kind !== ts.SyntaxKind.PropertySignature) {
        return;
      }

      if (childNode.type?.kind === ts.SyntaxKind.TypeReference) {
        const typeNode = typeNameMapping.get(
          childNode.type.getText(sourceFile)
        );

        referenceTypeNames.push(childNode.type.getText(sourceFile));

        if (typeNode) {
          typeNode.visited = true;
          recursiveExtract(typeNode);
        }
      }
    });
  };

  recursiveExtract(node);
  return [node.name.text, ...referenceTypeNames];
}
