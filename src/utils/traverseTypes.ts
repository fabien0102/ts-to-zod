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

  const handleTypeReferenceNode = (typeRefNode: ts.TypeReferenceNode) => {
    const typeName = typeRefNode.typeName.getText(sourceFile);
    if (typeScriptHelper.indexOf(typeName) > -1 && typeRefNode.typeArguments) {
      typeRefNode.typeArguments.forEach((t) => handleTypeNode(t));
    } else {
      referenceTypeNames.add(typeName);
    }
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
            referenceTypeNames.add(typeName);
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

export function getImportIdentifers(node: ts.ImportDeclaration): string[] {
  if (!node.importClause) return [];

  const { importClause } = node;
  const importIdentifiers: string[] = [];

  // Case `import MyGlobal from "module";`
  if (importClause.name) importIdentifiers.push(importClause.name.text);

  if (importClause.namedBindings) {
    // Cases `import { A, B } from "module"`
    // and `import C from "module"`
    if (ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        if (ts.isImportSpecifier(element)) {
          importIdentifiers.push(element.name.text);
        }
      }
    }
    // Case `import * as A from "module"`
    else if (ts.isNamespaceImport(importClause.namedBindings)) {
      importIdentifiers.push(importClause.namedBindings.name.text);
    }
  }

  return importIdentifiers;
}
