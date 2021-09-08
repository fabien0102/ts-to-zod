import { pascal } from "case";
import ts, { factory as f } from "typescript";

/**
 * Resolve all modules from a source text.
 *
 * @param sourceText
 */
export function resolveModules(sourceText: string): string {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );

  const nodes: ts.Node[] = [];
  let hasModule = false;

  const visitor = (node: ts.Node) => {
    if (ts.isModuleDeclaration(node)) {
      hasModule = true;
      nodes.push(...flattenModule(node));
    } else {
      nodes.push(node);
    }
  };

  ts.forEachChild(sourceFile, visitor);

  if (hasModule) {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    const print = (node: ts.Node) =>
      printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);

    return nodes.map(print).join("\n\n");
  } else {
    return sourceText;
  }
}

/**
 * Extract and prefix every `interface` and `type` from a module (`export namespace`)
 *
 * @param module
 */
function flattenModule(module: ts.ModuleDeclaration) {
  // 1. Extract all type names in the module
  const namespacedTypes = new Set<string>();

  const extractNamespacedTypesVisitor = (node: ts.Node) => {
    if (
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
    ) {
      namespacedTypes.add(node.name.text);
    }
  };

  module.body?.forEachChild(extractNamespacedTypesVisitor);

  const prefixTypeReferences = (member: ts.TypeElement) => {
    if (!ts.isPropertySignature(member) || !member.type) {
      return member;
    }

    let type = member.type;

    if (
      ts.isTypeReferenceNode(member.type) &&
      ts.isIdentifier(member.type.typeName) &&
      namespacedTypes.has(member.type.typeName.text)
    ) {
      type = f.createTypeReferenceNode(
        f.createIdentifier(
          pascal(module.name.text) + pascal(member.type.typeName.text)
        ),
        member.type.typeArguments
      );
    }

    if (ts.isTypeLiteralNode(member.type)) {
      type = f.createTypeLiteralNode(
        member.type.members.map(prefixTypeReferences)
      );
    }

    return f.createPropertySignature(
      member.modifiers,
      member.name,
      member.questionToken,
      type
    );
  };

  // 2. Extract and prefix all interfaces/types/enums declaration
  const declarations: Array<
    ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration
  > = [];

  const getDeclarationsVisitor = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node)) {
      declarations.push(
        f.createInterfaceDeclaration(
          node.decorators,
          node.modifiers,
          pascal(module.name.text) + pascal(node.name.text), // Prefix with module name
          node.typeParameters,
          node.heritageClauses,
          node.members.map(prefixTypeReferences)
        )
      );
    } else if (ts.isTypeAliasDeclaration(node)) {
      declarations.push(
        f.createTypeAliasDeclaration(
          node.decorators,
          node.modifiers,
          pascal(module.name.text) + pascal(node.name.text), // Prefix with module name
          node.typeParameters,
          ts.isTypeLiteralNode(node.type)
            ? f.createTypeLiteralNode(
                node.type.members.map(prefixTypeReferences)
              )
            : node.type
        )
      );
    } else if (ts.isEnumDeclaration(node)) {
      declarations.push(
        f.createEnumDeclaration(
          node.decorators,
          node.modifiers,
          pascal(module.name.text) + pascal(node.name.text), // Prefix with module name
          node.members
        )
      );
    }
  };

  module.body?.forEachChild(getDeclarationsVisitor);

  return declarations;
}
