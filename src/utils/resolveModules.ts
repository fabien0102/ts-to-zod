import { pascal } from "case";
import ts, { factory as f, SourceFile } from "typescript";

/**
 * Resolve all modules from a source text.
 *
 * @param sourceText
 */
export function resolveModules(sourceText: string): SourceFile {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );

  const declarations = getDeclarationNames(sourceFile);
  const { transformed } = ts.transform(sourceFile, [
    moduleToPrefix(declarations),
  ]);

  return parseSourceFile(transformed[0]);
}

/**
 * Parse a sourceFile in order to have new node positions.
 *
 * Typescript need all the node positions to be able to manipulate the AST.
 * After any transformation, an altered node will have `{pos: -1, end: -1}`, this
 * will cause issue when trying to get the JSDocTags (as example)
 *
 * @param sourceFile
 */
function parseSourceFile(sourceFile: SourceFile): SourceFile {
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });

  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);

  const sourceText = print(sourceFile);

  return ts.createSourceFile("index.ts", sourceText, ts.ScriptTarget.Latest);
}

/**
 * Extract all declarations under a namespace
 *
 * @param sourceFile
 * @returns
 */
function getDeclarationNames(sourceFile: ts.SourceFile) {
  const declarations = new Map<string, string[]>();

  const extractNamespacedTypesVisitor =
    (namespace: string) => (node: ts.Node) => {
      if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        const prev = declarations.get(namespace);
        prev
          ? declarations.set(namespace, [...prev, node.name.text])
          : declarations.set(namespace, [node.name.text]);
      }
    };

  const topLevelVisitor = (node: ts.Node) => {
    if (ts.isModuleDeclaration(node)) {
      node.body?.forEachChild(extractNamespacedTypesVisitor(node.name.text));
    }
  };

  sourceFile.forEachChild(topLevelVisitor);

  return declarations;
}

/**
 * Apply namespace to every declarations
 *
 * @param declarationNames
 * @returns
 */
const moduleToPrefix =
  (
    declarationNames: Map<string, string[]>
  ): ts.TransformerFactory<ts.SourceFile> =>
  (context) =>
  (sourceFile) => {
    const prefixInterfacesAndTypes =
      (moduleName: string) =>
      (node: ts.Node): ts.Node | undefined => {
        if (
          ts.isTypeReferenceNode(node) &&
          ts.isIdentifier(node.typeName) &&
          (declarationNames.get(moduleName) || []).includes(node.typeName.text)
        ) {
          return f.updateTypeReferenceNode(
            node,
            f.createIdentifier(pascal(moduleName) + pascal(node.typeName.text)),
            node.typeArguments
          );
        }

        if (ts.isTypeAliasDeclaration(node)) {
          return f.updateTypeAliasDeclaration(
            node,
            node.decorators,
            node.modifiers,
            f.createIdentifier(pascal(moduleName) + pascal(node.name.text)),
            node.typeParameters,
            ts.isTypeLiteralNode(node.type)
              ? f.updateTypeLiteralNode(
                  node.type,
                  ts.visitNodes(
                    node.type.members,
                    prefixInterfacesAndTypes(moduleName)
                  )
                )
              : ts.isTypeReferenceNode(node.type)
              ? f.updateTypeReferenceNode(
                  node.type,
                  node.type.typeName,
                  ts.visitNodes(
                    node.type.typeArguments,
                    prefixInterfacesAndTypes(moduleName)
                  )
                )
              : node.type
          );
        }

        if (ts.isInterfaceDeclaration(node)) {
          return f.updateInterfaceDeclaration(
            node,
            node.decorators,
            node.modifiers,
            f.createIdentifier(pascal(moduleName) + pascal(node.name.text)),
            node.typeParameters,
            ts.visitNodes(
              node.heritageClauses,
              prefixInterfacesAndTypes(moduleName)
            ),
            ts.visitNodes(node.members, prefixInterfacesAndTypes(moduleName))
          );
        }

        if (ts.isHeritageClause(node)) {
          return f.updateHeritageClause(
            node,
            ts.visitNodes(node.types, prefixInterfacesAndTypes(moduleName))
          );
        }

        if (
          ts.isExpressionWithTypeArguments(node) &&
          ts.isIdentifier(node.expression) &&
          (declarationNames.get(moduleName) || []).includes(
            node.expression.text
          )
        ) {
          return f.updateExpressionWithTypeArguments(
            node,
            f.createIdentifier(
              pascal(moduleName) + pascal(node.expression.text)
            ),
            node.typeArguments
          );
        }

        if (ts.isEnumDeclaration(node)) {
          return f.updateEnumDeclaration(
            node,
            node.decorators,
            node.modifiers,
            f.createIdentifier(pascal(moduleName) + pascal(node.name.text)),
            node.members
          );
        }

        return ts.visitEachChild(
          node,
          prefixInterfacesAndTypes(moduleName),
          context
        );
      };

    const flattenModuleDeclaration = (node: ts.Node): ts.Node | ts.Node[] => {
      if (
        ts.isModuleDeclaration(node) &&
        node.body &&
        ts.isModuleBlock(node.body)
      ) {
        const transformedNodes = ts.visitNodes(
          node.body.statements,
          prefixInterfacesAndTypes(node.name.text)
        );
        return [...transformedNodes];
      }
      return ts.visitEachChild(node, flattenModuleDeclaration, context);
    };

    return ts.visitNode(sourceFile, flattenModuleDeclaration);
  };
