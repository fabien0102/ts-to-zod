import { pascal } from "case";
import ts, { SourceFile } from "typescript";

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

  const declarationMap = getDeclarationMap(sourceFile);
  const { transformed } = ts.transform(sourceFile, [
    moduleToPrefix(declarationMap),
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
 * Creates a map of original Fully Qualified Names (FQN) to their new prefixed names.
 * Example: "A.B.MyType" -> "ABMyType"
 * Global types: "MyGlobalType" -> "MyGlobalType" (no path prefix)
 *
 * @param sourceFile
 * @returns A map where keys are original FQNs and values are new prefixed names.
 */
function getDeclarationMap(sourceFile: ts.SourceFile): Map<string, string> {
  const declarationMap = new Map<string, string>();

  function traversal(node: ts.Node, pathSegments: string[]) {
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      const originalName = node.name.text;
      const fqn =
        pathSegments.length > 0
          ? [...pathSegments, originalName].join(".")
          : originalName;
      const newName = [...pathSegments.map(pascal), pascal(originalName)].join(
        ""
      );
      declarationMap.set(fqn, newName);
    } else if (ts.isModuleDeclaration(node)) {
      const moduleName = node.name.text;
      const newPathSegments = [...pathSegments, moduleName];
      if (node.body) {
        ts.forEachChild(node.body, (child) =>
          traversal(child, newPathSegments)
        );
      }
    } else {
      if (ts.isSourceFile(node) || ts.isModuleBlock(node)) {
        ts.forEachChild(node, (child) => traversal(child, pathSegments));
      }
    }
  }
  traversal(sourceFile, []);
  return declarationMap;
}

/**
 * Apply namespace to every declarations
 *
 * @param declarationMap
 * @returns
 */
const moduleToPrefix =
  (declarationMap: Map<string, string>): ts.TransformerFactory<ts.SourceFile> =>
  (context) =>
  (sourceFile) => {
    const factory = context.factory; // ts.NodeFactory

    function visitor<T extends ts.Node>(
      node: T | ts.Node,
      currentPath: string[]
    ): ts.VisitResult<T | ts.Node> {
      if (ts.isModuleDeclaration(node)) {
        const moduleName = node.name.text;
        const newPath = [...currentPath, moduleName];
        const statements: ts.Statement[] = [];
        if (node.body) {
          ts.forEachChild(node.body, (childNode) => {
            const result = visitor<ts.Statement>(childNode, newPath);
            if (Array.isArray(result)) {
              statements.push(...result);
            } else if (result) {
              statements.push(result as ts.Statement);
            }
          });
        }
        return statements;
      }

      if (
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)
      ) {
        const originalName = node.name.text;
        const fqn =
          currentPath.length > 0
            ? [...currentPath, originalName].join(".")
            : originalName;
        const newName = declarationMap.get(fqn);
        if (!newName) {
          // This shouldn't happen unless bug
          return ts.visitEachChild(
            node,
            (child) => visitor(child, currentPath),
            context
          );
        }
        const newIdentifier = factory.createIdentifier(newName);
        if (ts.isInterfaceDeclaration(node)) {
          return factory.updateInterfaceDeclaration(
            node,
            node.modifiers,
            newIdentifier,
            node.typeParameters,
            ts.visitNodes(
              node.heritageClauses,
              (n) => visitor(n, currentPath), // ts.HeritageClause
              ts.isHeritageClause
            ),
            ts.visitNodes(
              node.members,
              (n) => visitor(n, currentPath), // ts.TypeElement
              ts.isTypeElement
            )
          );
        }
        if (ts.isTypeAliasDeclaration(node)) {
          return factory.updateTypeAliasDeclaration(
            node,
            node.modifiers,
            newIdentifier,
            node.typeParameters,
            visitor(node.type, currentPath) as ts.TypeNode
          );
        }
        if (ts.isEnumDeclaration(node)) {
          return factory.updateEnumDeclaration(
            node,
            node.modifiers,
            newIdentifier,
            ts.visitNodes(
              node.members,
              (n) => visitor(n, currentPath), // ts.EnumMember,
              ts.isEnumMember
            )
          );
        }
      }

      if (ts.isTypeReferenceNode(node)) {
        // Handles node.typeName being Identifier or QualifiedName
        const originalTypeNameString = entityNameToString(node.typeName); // Use helper
        let resolvedFqn: string | undefined = undefined;
        for (let i = currentPath.length; i >= 0; i--) {
          const pathSlice = currentPath.slice(0, i);
          const potentialFqn =
            pathSlice.length > 0
              ? [pathSlice.join("."), originalTypeNameString].join(".")
              : originalTypeNameString;
          if (declarationMap.has(potentialFqn)) {
            resolvedFqn = potentialFqn;
            break;
          }
        }
        if (resolvedFqn) {
          const newName = declarationMap.get(resolvedFqn)!;
          return factory.updateTypeReferenceNode(
            node,
            factory.createIdentifier(newName),
            ts.visitNodes(
              node.typeArguments,
              (n) => visitor(n, currentPath), // ts.TypeNode
              ts.isTypeNode
            )
          );
        }
        return factory.updateTypeReferenceNode(
          node,
          node.typeName,
          ts.visitNodes(
            node.typeArguments,
            (n) => visitor(n, currentPath), // ts.TypeNode
            ts.isTypeNode
          )
        );
      }

      if (ts.isExpressionWithTypeArguments(node)) {
        const originalTypeNameString = expressionToString(node.expression);
        if (originalTypeNameString) {
          let resolvedFqn: string | undefined = undefined;
          for (let i = currentPath.length; i >= 0; i--) {
            const pathSlice = currentPath.slice(0, i);
            const potentialFqn =
              pathSlice.length > 0
                ? [pathSlice.join("."), originalTypeNameString].join(".")
                : originalTypeNameString;
            if (declarationMap.has(potentialFqn)) {
              resolvedFqn = potentialFqn;
              break;
            }
          }
          if (resolvedFqn) {
            const newName = declarationMap.get(resolvedFqn)!;
            return factory.updateExpressionWithTypeArguments(
              node,
              factory.createIdentifier(newName),
              ts.visitNodes(
                node.typeArguments,
                (n) => visitor(n, currentPath) as ts.TypeNode,
                ts.isTypeNode
              )
            );
          }
        }
        // Fallback: visit children, including the original expression if it wasn't simply resolvable
        return factory.updateExpressionWithTypeArguments(
          node,
          visitor(node.expression, currentPath) as ts.LeftHandSideExpression,
          ts.visitNodes(
            node.typeArguments,
            (n) => visitor(n, currentPath),
            ts.isTypeNode
          )
        );
      }
      return ts.visitEachChild(
        node,
        (child) => visitor(child, currentPath),
        context
      );
    }

    function topLevelVisitor(node: ts.Node): ts.VisitResult<ts.Node> {
      if (ts.isSourceFile(node)) {
        const newStatements: ts.Statement[] = [];
        for (const statement of node.statements) {
          const result = visitor(statement, []);
          if (Array.isArray(result)) {
            newStatements.push(...(result as ts.Statement[]));
          } else if (result) {
            newStatements.push(result as ts.Statement);
          }
        }
        return factory.updateSourceFile(node, newStatements);
      }
      return visitor(node, []);
    }
    return ts.visitNode(sourceFile, topLevelVisitor) as ts.SourceFile;
  };

/**
 * Convert ts.EntityName (Identifier or QualifiedName) to string
 * */
const entityNameToString = (name: ts.EntityName): string => {
  if (ts.isIdentifier(name)) {
    return name.text;
  }
  return [entityNameToString(name.left), name.right.text].join(".");
};

/**
 * Convert common name-like expressions to string
 */
const expressionToString = (expr: ts.Expression): string | undefined => {
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  if (!ts.isPropertyAccessExpression(expr)) {
    return undefined;
  }
  const leftString = expressionToString(expr.expression);
  if (leftString) {
    return [leftString, expr.name.text].join(".");
  }
};
