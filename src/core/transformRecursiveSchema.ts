import ts from "typescript";

const { factory: f } = ts;

/**
 * Type hint zod to deal with recursive types.
 *
 * https://github.com/colinhacks/zod/tree/v3#recursive-types
 */
export function transformRecursiveSchema(
  zodImportValue: string,
  zodStatement: ts.VariableStatement,
  typeName: string
): ts.VariableStatement {
  const declaration = zodStatement.declarationList.declarations[0];

  if (!declaration.initializer) {
    throw new Error("Unvalid zod statement");
  }

  return f.createVariableStatement(
    zodStatement.modifiers,
    f.createVariableDeclarationList(
      [
        f.createVariableDeclaration(
          declaration.name,
          undefined,
          f.createTypeReferenceNode(`${zodImportValue}.ZodSchema`, [
            f.createTypeReferenceNode(typeName),
          ]),
          f.createCallExpression(
            f.createPropertyAccessExpression(
              f.createIdentifier(zodImportValue),
              f.createIdentifier("lazy")
            ),
            undefined,
            [
              f.createArrowFunction(
                undefined,
                undefined,
                [],
                undefined,
                undefined,
                declaration.initializer
              ),
            ]
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}
