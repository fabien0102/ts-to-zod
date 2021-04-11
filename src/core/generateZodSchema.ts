import { camel, lower } from "case";
import * as ts from "typescript";
import {
  getJSDocTags,
  JSDocTags,
  jsDocTagToZodProperties,
  ZodProperty,
} from "./jsDocTags";
import uniq from "lodash/uniq";

const { factory: f } = ts;

export interface GenerateZodSchemaProps {
  /**
   * Name of the exported variable
   */
  varName: string;

  /**
   * Interface or type node
   */
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration;

  /**
   * Zod import value.
   *
   * @default "z"
   */
  zodImportValue?: string;

  /**
   * Source file
   */
  sourceFile: ts.SourceFile;

  /**
   * Getter for schema dependencies (Type reference inside type)
   *
   * @default (identifierName) => camel(`${identifierName}Schema`)
   */
  getDependencyName?: (identifierName: string) => string;

  /**
   * Add `.strict()` to every `z.object()` (disallow unknown keys)
   */
  strict?: boolean;
}

/**
 * Generate zod schema declaration
 *
 * ```ts
 * export const ${varName} = ${zodImportValue}.object(…)
 * ```
 */
export function generateZodSchemaVariableStatement({
  node,
  sourceFile,
  varName,
  zodImportValue = "z",
  getDependencyName = (identifierName) => camel(`${identifierName}Schema`),
  strict = false,
}: GenerateZodSchemaProps) {
  let schema: ts.CallExpression | ts.Identifier | undefined;
  const dependencies: string[] = [];

  if (ts.isInterfaceDeclaration(node)) {
    let baseSchema: string | undefined;
    if (node.typeParameters) {
      throw new Error("Interface with generics are not supported!");
    }
    if (node.heritageClauses) {
      if (
        node.heritageClauses.length > 1 ||
        node.heritageClauses[0].types.length > 1
      ) {
        throw new Error(
          "Only interface with single `extends T` are not supported!"
        );
      }
      const type = node.heritageClauses[0].types[0];
      baseSchema = getDependencyName(type.expression.getText(sourceFile));
    }
    schema = buildZodObject({
      typeNode: node,
      sourceFile,
      z: zodImportValue,
      dependencies,
      getDependencyName,
      baseSchema,
      strict,
    });
  }

  if (ts.isTypeAliasDeclaration(node)) {
    if (node.typeParameters) {
      throw new Error("Type with generics are not supported!");
    }
    schema = buildZodPrimitive({
      z: zodImportValue,
      typeNode: node.type,
      isOptional: false,
      jsDocTags: {},
      sourceFile,
      dependencies,
      getDependencyName,
      strict,
    });
  }

  return {
    dependencies: uniq(dependencies),
    statement: f.createVariableStatement(
      node.modifiers,
      f.createVariableDeclarationList(
        [
          f.createVariableDeclaration(
            f.createIdentifier(varName),
            undefined,
            undefined,
            schema
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
  };
}

function buildZodProperties({
  members,
  zodImportValue: z,
  sourceFile,
  dependencies,
  getDependencyName,
  strict,
}: {
  members: ts.NodeArray<ts.TypeElement> | ts.PropertySignature[];
  zodImportValue: string;
  sourceFile: ts.SourceFile;
  dependencies: string[];
  getDependencyName: (identifierName: string) => string;
  strict: boolean;
}) {
  const properties = new Map<
    ts.Identifier | ts.StringLiteral,
    ts.CallExpression | ts.Identifier
  >();
  members.forEach((member) => {
    if (
      !ts.isPropertySignature(member) ||
      !member.type ||
      !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
    ) {
      return;
    }

    const isOptional = Boolean(member.questionToken);
    const jsDocTags = getJSDocTags(member, sourceFile);

    properties.set(
      member.name,
      buildZodPrimitive({
        z,
        typeNode: member.type,
        isOptional,
        jsDocTags,
        sourceFile,
        dependencies,
        getDependencyName,
        strict,
      })
    );
  });
  return properties;
}

function buildZodPrimitive({
  z,
  typeNode,
  isOptional,
  isPartial,
  isRequired,
  jsDocTags,
  sourceFile,
  dependencies,
  getDependencyName,
  strict,
}: {
  z: string;
  typeNode: ts.TypeNode;
  isOptional: boolean;
  isPartial?: boolean;
  isRequired?: boolean;
  jsDocTags: JSDocTags;
  sourceFile: ts.SourceFile;
  dependencies: string[];
  getDependencyName: (identifierName: string) => string;
  strict: boolean;
}): ts.CallExpression | ts.Identifier {
  const zodProperties = jsDocTagToZodProperties(
    jsDocTags,
    isOptional,
    Boolean(isPartial),
    Boolean(isRequired)
  );

  if (ts.isParenthesizedTypeNode(typeNode)) {
    return buildZodPrimitive({
      z,
      typeNode: typeNode.type,
      isOptional,
      jsDocTags,
      sourceFile,
      dependencies,
      getDependencyName,
      strict,
    });
  }

  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    const identifierName = typeNode.typeName.text;

    // Deal with `Array<>` syntax
    if (identifierName === "Array" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: f.createArrayTypeNode(typeNode.typeArguments[0]),
        isOptional: false,
        jsDocTags: {},
        sourceFile,
        dependencies,
        getDependencyName,
        strict,
      });
    }

    // Deal with `Partial<>` syntax
    if (identifierName === "Partial" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: typeNode.typeArguments[0],
        isOptional,
        jsDocTags,
        sourceFile,
        isPartial: true,
        dependencies,
        getDependencyName,
        strict,
      });
    }

    // Deal with `Required<>` syntax
    if (identifierName === "Required" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: typeNode.typeArguments[0],
        isOptional,
        jsDocTags,
        sourceFile,
        isRequired: true,
        dependencies,
        getDependencyName,
        strict,
      });
    }

    // Deal with `Readonly<>` syntax
    if (identifierName === "Readonly" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: typeNode.typeArguments[0],
        isOptional,
        jsDocTags,
        sourceFile,
        dependencies,
        getDependencyName,
        strict,
      });
    }

    // Deal with `Record<>` syntax
    if (identifierName === "Record" && typeNode.typeArguments) {
      if (
        typeNode.typeArguments.length !== 2 ||
        typeNode.typeArguments[0].kind !== ts.SyntaxKind.StringKeyword
      ) {
        throw new Error(
          `Record<${typeNode.typeArguments[0].getText(
            sourceFile
          )}, …> are not supported (https://github.com/colinhacks/zod/tree/v3#records)`
        );
      }
      return buildZodSchema(
        z,
        "record",
        [
          buildZodPrimitive({
            z,
            typeNode: typeNode.typeArguments[1],
            isOptional,
            jsDocTags,
            sourceFile,
            isPartial: false,
            dependencies,
            getDependencyName,
            strict,
          }),
        ],
        zodProperties
      );
    }

    // Deal with `Promise<>` syntax
    if (identifierName === "Promise" && typeNode.typeArguments) {
      return buildZodSchema(
        z,
        "promise",
        typeNode.typeArguments.map((i) =>
          buildZodPrimitive({
            z,
            typeNode: i,
            isOptional: false,
            jsDocTags,
            sourceFile,
            dependencies,
            getDependencyName,
            strict,
          })
        ),
        zodProperties
      );
    }

    // Deal with `Omit<>` & `Pick<>` syntax
    if (["Omit", "Pick"].includes(identifierName) && typeNode.typeArguments) {
      const [originalType, keys] = typeNode.typeArguments;
      let parameters: ts.ObjectLiteralExpression | undefined;

      if (ts.isLiteralTypeNode(keys)) {
        parameters = f.createObjectLiteralExpression([
          f.createPropertyAssignment(
            keys.literal.getText(sourceFile),
            f.createTrue()
          ),
        ]);
      }
      if (ts.isUnionTypeNode(keys)) {
        parameters = f.createObjectLiteralExpression(
          keys.types.map((type) => {
            if (!ts.isLiteralTypeNode(type)) {
              throw new Error(
                `${identifierName}<T, K> unknown syntax: (${
                  ts.SyntaxKind[type.kind]
                } as K union part not supported)`
              );
            }
            return f.createPropertyAssignment(
              type.literal.getText(sourceFile),
              f.createTrue()
            );
          })
        );
      }

      if (!parameters) {
        throw new Error(
          `${identifierName}<T, K> unknown syntax: (${
            ts.SyntaxKind[keys.kind]
          } as K not supported)`
        );
      }

      return f.createCallExpression(
        f.createPropertyAccessExpression(
          buildZodPrimitive({
            z,
            typeNode: originalType,
            isOptional: false,
            jsDocTags: {},
            sourceFile,
            dependencies,
            getDependencyName,
            strict,
          }),
          f.createIdentifier(lower(identifierName))
        ),
        undefined,
        [parameters]
      );
    }

    const dependencyName = getDependencyName(identifierName);
    dependencies.push(dependencyName);
    const zodSchema: ts.Identifier | ts.CallExpression = f.createIdentifier(
      dependencyName
    );
    return withZodProperties(zodSchema, zodProperties);
  }

  if (ts.isUnionTypeNode(typeNode)) {
    const values = typeNode.types.map((i) =>
      buildZodPrimitive({
        z,
        typeNode: i,
        isOptional: false,
        jsDocTags: {},
        sourceFile,
        dependencies,
        getDependencyName,
        strict,
      })
    );
    return buildZodSchema(
      z,
      "union",
      [f.createArrayLiteralExpression(values)],
      zodProperties
    );
  }

  if (ts.isTupleTypeNode(typeNode)) {
    const values = typeNode.elements.map((i) =>
      buildZodPrimitive({
        z,
        typeNode: ts.isNamedTupleMember(i) ? i.type : i,
        isOptional: false,
        jsDocTags: {},
        sourceFile,
        dependencies,
        getDependencyName,
        strict,
      })
    );
    return buildZodSchema(
      z,
      "tuple",
      [f.createArrayLiteralExpression(values)],
      zodProperties
    );
  }

  if (ts.isLiteralTypeNode(typeNode)) {
    if (ts.isStringLiteral(typeNode.literal)) {
      return buildZodSchema(
        z,
        "literal",
        [f.createStringLiteral(typeNode.literal.text)],
        zodProperties
      );
    }
    if (ts.isNumericLiteral(typeNode.literal)) {
      return buildZodSchema(
        z,
        "literal",
        [f.createNumericLiteral(typeNode.literal.text)],
        zodProperties
      );
    }
    if (typeNode.literal.kind === ts.SyntaxKind.TrueKeyword) {
      return buildZodSchema(z, "literal", [f.createTrue()], zodProperties);
    }
    if (typeNode.literal.kind === ts.SyntaxKind.FalseKeyword) {
      return buildZodSchema(z, "literal", [f.createFalse()], zodProperties);
    }
  }

  if (ts.isArrayTypeNode(typeNode)) {
    return buildZodSchema(
      z,
      "array",
      [
        buildZodPrimitive({
          z,
          typeNode: typeNode.elementType,
          isOptional: false,
          jsDocTags: {},
          sourceFile,
          dependencies,
          getDependencyName,
          strict,
        }),
      ],
      zodProperties
    );
  }

  if (ts.isTypeLiteralNode(typeNode)) {
    return withZodProperties(
      buildZodObject({
        typeNode,
        z,
        sourceFile,
        dependencies,
        getDependencyName,
        strict,
      }),
      zodProperties
    );
  }

  if (ts.isIntersectionTypeNode(typeNode)) {
    const [base, ...rest] = typeNode.types;
    const basePrimitive = buildZodPrimitive({
      z,
      typeNode: base,
      isOptional: false,
      jsDocTags: {},
      sourceFile,
      dependencies,
      getDependencyName,
      strict,
    });

    return rest.reduce(
      (intersectionSchema, node) =>
        f.createCallExpression(
          f.createPropertyAccessExpression(
            intersectionSchema,
            f.createIdentifier("and")
          ),
          undefined,
          [
            buildZodPrimitive({
              z,
              typeNode: node,
              isOptional: false,
              jsDocTags: {},
              sourceFile,
              dependencies,
              getDependencyName,
              strict,
            }),
          ]
        ),
      basePrimitive
    );
  }

  if (ts.isLiteralTypeNode(typeNode)) {
    return buildZodSchema(
      z,
      typeNode.literal.getText(sourceFile),
      [],
      zodProperties
    );
  }

  if (ts.isFunctionTypeNode(typeNode)) {
    return buildZodSchema(
      z,
      "function",
      [],
      [
        {
          identifier: "args",
          expressions: typeNode.parameters.map((p) =>
            buildZodPrimitive({
              z,
              typeNode:
                p.type || f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
              jsDocTags,
              sourceFile,
              dependencies,
              getDependencyName,
              strict,
              isOptional: false,
            })
          ),
        },
        {
          identifier: "returns",
          expressions: [
            buildZodPrimitive({
              z,
              typeNode: typeNode.type,
              jsDocTags,
              sourceFile,
              dependencies,
              getDependencyName,
              strict,
              isOptional: false,
            }),
          ],
        },
        ...zodProperties,
      ]
    );
  }

  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return buildZodSchema(z, "string", [], zodProperties);
    case ts.SyntaxKind.BooleanKeyword:
      return buildZodSchema(z, "boolean", [], zodProperties);
    case ts.SyntaxKind.UndefinedKeyword:
      return buildZodSchema(z, "undefined", [], zodProperties);
    case ts.SyntaxKind.NumberKeyword:
      return buildZodSchema(z, "number", [], zodProperties);
    case ts.SyntaxKind.AnyKeyword:
      return buildZodSchema(z, "any", [], zodProperties);
    case ts.SyntaxKind.BigIntKeyword:
      return buildZodSchema(z, "bigint", [], zodProperties);
    case ts.SyntaxKind.VoidKeyword:
      return buildZodSchema(z, "void", [], zodProperties);
  }

  console.warn(
    ` »   Warning: '${
      ts.SyntaxKind[typeNode.kind]
    }' is not supported, fallback into 'z.any()'`
  );
  return buildZodSchema(z, "any", [], zodProperties);
}

/**
 * Build a zod schema.
 *
 * @param z zod namespace
 * @param callName zod function
 * @param args Args to add to the main zod call, if any
 * @param properties An array of flags that should be added as extra property calls such as optional to add .optional()
 */
function buildZodSchema(
  z: string,
  callName: string,
  args?: ts.Expression[],
  properties?: ZodProperty[]
) {
  const zodCall = f.createCallExpression(
    f.createPropertyAccessExpression(
      f.createIdentifier(z),
      f.createIdentifier(callName)
    ),
    undefined,
    args
  );
  return withZodProperties(zodCall, properties);
}

/**
 * Apply zod properties to an expression (as `.optional()`)
 *
 * @param expression
 * @param properties
 */
function withZodProperties(
  expression: ts.Expression,
  properties: ZodProperty[] = []
) {
  return properties.reduce(
    (expressionWithProperties, property) =>
      f.createCallExpression(
        f.createPropertyAccessExpression(
          expressionWithProperties,
          f.createIdentifier(property.identifier)
        ),
        undefined,
        property.expressions ? property.expressions : undefined
      ),
    expression
  ) as ts.CallExpression;
}

/**
 * Build z.object (with support of index signature)
 */
function buildZodObject({
  typeNode,
  z,
  dependencies,
  sourceFile,
  getDependencyName,
  baseSchema,
  strict,
}: {
  typeNode: ts.TypeLiteralNode | ts.InterfaceDeclaration;
  z: string;
  dependencies: string[];
  sourceFile: ts.SourceFile;
  getDependencyName: Required<GenerateZodSchemaProps>["getDependencyName"];
  baseSchema?: string;
  strict: boolean;
}) {
  const { properties, indexSignature } = typeNode.members.reduce<{
    properties: ts.PropertySignature[];
    indexSignature?: ts.IndexSignatureDeclaration;
  }>(
    (mem, member) => {
      if (ts.isIndexSignatureDeclaration(member)) {
        return {
          ...mem,
          indexSignature: member,
        };
      }
      if (ts.isPropertySignature(member)) {
        return {
          ...mem,
          properties: [...mem.properties, member],
        };
      }
      return mem;
    },
    { properties: [] }
  );

  let objectSchema: ts.CallExpression | undefined;

  if (properties.length > 0) {
    const parsedProperties = buildZodProperties({
      members: properties,
      zodImportValue: z,
      sourceFile,
      dependencies,
      getDependencyName,
      strict,
    });

    objectSchema = buildZodSchema(
      baseSchema || z,
      baseSchema ? "extend" : "object",
      [
        f.createObjectLiteralExpression(
          Array.from(parsedProperties.entries()).map(([key, tsCall]) => {
            return f.createPropertyAssignment(key, tsCall);
          }),
          true
        ),
      ],
      strict ? [{ identifier: "strict" }] : undefined
    );
  }

  if (indexSignature) {
    if (baseSchema) {
      throw new Error(
        "interface with `extends` and index signature are not supported!"
      );
    }
    const indexSignatureSchema = buildZodSchema(z, "record", [
      // Index signature type can't be optional or have validators.
      buildZodPrimitive({
        z,
        typeNode: indexSignature.type,
        isOptional: false,
        jsDocTags: {},
        sourceFile,
        dependencies,
        getDependencyName,
        strict,
      }),
    ]);

    if (objectSchema) {
      return f.createCallExpression(
        f.createPropertyAccessExpression(
          indexSignatureSchema,
          f.createIdentifier("and")
        ),
        undefined,
        [objectSchema]
      );
    }
    return indexSignatureSchema;
  } else if (objectSchema) {
    return objectSchema;
  }
  return buildZodSchema(
    z,
    "object",
    [f.createObjectLiteralExpression()],
    strict ? [{ identifier: "strict" }] : undefined
  );
}
