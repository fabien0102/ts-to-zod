import { camel, lower } from "case";
import uniq from "lodash/uniq";
import ts, { factory as f } from "typescript";
import type { CustomJSDocFormatTypes } from "../config";
import { findNode } from "../utils/findNode";
import { isNotNull } from "../utils/isNotNull";
import { generateCombinations } from "../utils/generateCombinations";
import { extractLiteralValue } from "../utils/extractLiteralValue";
import {
  type JSDocTags,
  type ZodProperty,
  getJSDocTags,
  jsDocTagToZodProperties,
} from "./jsDocTags";

/**
 * Get a more specific fallback type instead of always using z.any()
 */
function getSmartFallback(typeNode: ts.TypeNode): string {
  // For type references, try to infer if it's likely an object
  if (ts.isTypeReferenceNode(typeNode)) {
    return "object";
  }

  // For union types, try unknown which is safer than any
  if (ts.isUnionTypeNode(typeNode)) {
    return "unknown";
  }

  // For intersection types, likely an object
  if (ts.isIntersectionTypeNode(typeNode)) {
    return "object";
  }

  // For mapped types or conditional types, use unknown
  if (ts.isMappedTypeNode(typeNode) || ts.isConditionalTypeNode(typeNode)) {
    return "unknown";
  }

  // Default fallback
  return "any";
}

export interface GenerateZodSchemaProps {
  /**
   * Name of the exported variable
   */
  varName: string;

  /**
   * Interface or type node
   */
  node: ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration;

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
   * Skip the creation of zod validators from JSDoc annotations
   *
   * @default false
   */
  skipParseJSDoc?: boolean;

  /**
   * Custom JSDoc format types.
   */
  customJSDocFormatTypes: CustomJSDocFormatTypes;
}

type SchemaExtensionClause = {
  extendedSchemaName: string;
  omitOrPickType?: "Omit" | "Pick";
  omitOrPickKeys?: ts.TypeNode;
};

interface BuildZodPrimitiveParams {
  z: string;
  typeNode: ts.TypeNode;
  isOptional: boolean;
  isNullable?: boolean;
  isPartial?: boolean;
  isRequired?: boolean;
  jsDocTags: JSDocTags;
  customJSDocFormatTypes: CustomJSDocFormatTypes;
  sourceFile: ts.SourceFile;
  dependencies: string[];
  getDependencyName: (identifierName: string) => string;
  skipParseJSDoc: boolean;
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
  skipParseJSDoc = false,
  customJSDocFormatTypes,
}: GenerateZodSchemaProps) {
  let schema:
    | ts.CallExpression
    | ts.Identifier
    | ts.PropertyAccessExpression
    | undefined;
  let dependencies: string[] = [];
  let enumImport = false;

  if (ts.isInterfaceDeclaration(node)) {
    let schemaExtensionClauses: SchemaExtensionClause[] | undefined;
    if (node.typeParameters) {
      throw new Error("Interface with generics are not supported!");
    }
    if (node.heritageClauses) {
      // Looping on heritageClauses browses the "extends" keywords
      schemaExtensionClauses = node.heritageClauses.reduce(
        (deps: SchemaExtensionClause[], h) => {
          if (h.token !== ts.SyntaxKind.ExtendsKeyword || !h.types) {
            return deps;
          }

          // Looping on types browses the comma-separated interfaces
          const heritages = h.types.map((expression) => {
            const identifierName = expression.expression.getText(sourceFile);

            if (
              ["Omit", "Pick"].includes(identifierName) &&
              expression.typeArguments
            ) {
              const [originalType, keys] = expression.typeArguments;
              return {
                extendedSchemaName: getDependencyName(
                  originalType.getText(sourceFile)
                ),
                omitOrPickType: identifierName as "Omit" | "Pick",
                omitOrPickKeys: keys,
              };
            }

            return { extendedSchemaName: getDependencyName(identifierName) };
          });

          return deps.concat(heritages);
        },
        []
      );

      dependencies = dependencies.concat(
        schemaExtensionClauses.map((i) => i.extendedSchemaName)
      );
    }

    schema = buildZodObject({
      typeNode: node,
      sourceFile,
      z: zodImportValue,
      dependencies,
      getDependencyName,
      schemaExtensionClauses,
      skipParseJSDoc,
      customJSDocFormatTypes,
    });

    if (!skipParseJSDoc) {
      const jsDocTags = getJSDocTags(node, sourceFile);
      if (jsDocTags.strict) {
        schema = f.createCallExpression(
          f.createPropertyAccessExpression(
            schema,
            f.createIdentifier("strict")
          ),
          undefined,
          undefined
        );
      }
    }
  }

  if (ts.isTypeAliasDeclaration(node)) {
    if (node.typeParameters) {
      throw new Error("Type with generics are not supported!");
    }
    const jsDocTags = skipParseJSDoc ? {} : getJSDocTags(node, sourceFile);

    schema = buildZodPrimitive({
      z: zodImportValue,
      typeNode: node.type,
      isOptional: false,
      jsDocTags,
      customJSDocFormatTypes,
      sourceFile,
      dependencies,
      getDependencyName,
      skipParseJSDoc,
    });
  }

  if (ts.isEnumDeclaration(node)) {
    schema = buildZodSchema(zodImportValue, "nativeEnum", [node.name]);
    enumImport = true;
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
    enumImport,
  };
}

/**
 * Generate zod schema declaration for imported types (using any)
 *
 * ```ts
 * const ${varName} = ${zodImportValue}.any()
 * ```
 */
export function generateZodSchemaVariableStatementForImport({
  varName,
  zodImportValue = "z",
}: {
  varName: string;
  zodImportValue?: string;
}) {
  const schema = buildZodSchema(zodImportValue, "any");

  return f.createVariableStatement(
    undefined, // No modifier expected
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
  );
}

function buildZodProperties({
  members,
  zodImportValue: z,
  sourceFile,
  dependencies,
  getDependencyName,
  skipParseJSDoc,
  customJSDocFormatTypes,
}: {
  members: ts.NodeArray<ts.TypeElement> | ts.PropertySignature[];
  zodImportValue: string;
  sourceFile: ts.SourceFile;
  dependencies: string[];
  getDependencyName: (identifierName: string) => string;
  skipParseJSDoc: boolean;
  customJSDocFormatTypes: CustomJSDocFormatTypes;
}) {
  const properties = new Map<
    ts.Identifier | ts.StringLiteral | ts.NumericLiteral,
    ts.CallExpression | ts.Identifier | ts.PropertyAccessExpression
  >();
  members.forEach((member) => {
    if (
      !ts.isPropertySignature(member) ||
      !member.type ||
      !(
        ts.isIdentifier(member.name) ||
        ts.isStringLiteral(member.name) ||
        ts.isNumericLiteral(member.name)
      )
    ) {
      return;
    }

    const isOptional = Boolean(member.questionToken);
    const jsDocTags = skipParseJSDoc ? {} : getJSDocTags(member, sourceFile);

    properties.set(
      member.name,
      buildZodPrimitive({
        z,
        typeNode: member.type,
        isOptional,
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
      })
    );
  });
  return properties;
}

function buildZodPrimitive({
  jsDocTags,
  z,
  ...rest
}: BuildZodPrimitiveParams):
  | ts.CallExpression
  | ts.Identifier
  | ts.PropertyAccessExpression {
  const schema = jsDocTags.schema;

  // Schema override when it doesn't start with a dot, return the schema directly
  if (schema && !schema.startsWith(".")) {
    return f.createPropertyAccessExpression(
      f.createIdentifier(z),
      f.createIdentifier(schema)
    );
  }

  delete jsDocTags.schema;
  const generatedSchema = buildZodPrimitiveInternal({ jsDocTags, z, ...rest });

  // No schema override? Return generated one
  if (!schema) {
    return generatedSchema;
  }

  // Schema override starts with dot? Append it
  return f.createPropertyAccessExpression(
    generatedSchema,
    f.createIdentifier(schema.slice(1))
  );
}

function buildZodPrimitiveInternal({
  z,
  typeNode,
  isOptional,
  isNullable,
  isPartial,
  isRequired,
  jsDocTags,
  customJSDocFormatTypes,
  sourceFile,
  dependencies,
  getDependencyName,
  skipParseJSDoc,
}: BuildZodPrimitiveParams):
  | ts.CallExpression
  | ts.Identifier
  | ts.PropertyAccessExpression {
  const zodProperties = jsDocTagToZodProperties(
    jsDocTags,
    customJSDocFormatTypes,
    isOptional,
    Boolean(isPartial),
    Boolean(isRequired),
    Boolean(isNullable)
  );

  if (ts.isParenthesizedTypeNode(typeNode)) {
    return buildZodPrimitive({
      z,
      typeNode: typeNode.type,
      isNullable,
      isOptional,
      jsDocTags,
      customJSDocFormatTypes,
      sourceFile,
      dependencies,
      getDependencyName,
      skipParseJSDoc,
    });
  }

  if (ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)) {
    const identifierName = typeNode.typeName.text;

    // Deal with `Array<>` syntax
    if (identifierName === "Array" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: f.createArrayTypeNode(typeNode.typeArguments[0]),
        isOptional,
        isNullable,
        jsDocTags,
        sourceFile,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
        customJSDocFormatTypes,
      });
    }

    // Deal with `Partial<>` syntax
    if (identifierName === "Partial" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: typeNode.typeArguments[0],
        isOptional,
        isNullable,
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        isPartial: true,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
      });
    }

    // Deal with `Required<>` syntax
    if (identifierName === "Required" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: typeNode.typeArguments[0],
        isOptional,
        isNullable,
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        isRequired: true,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
      });
    }

    // Deal with `Readonly<>` syntax
    if (identifierName === "Readonly" && typeNode.typeArguments) {
      return buildZodPrimitive({
        z,
        typeNode: typeNode.typeArguments[0],
        isOptional,
        isNullable,
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
      });
    }

    // Deal with `ReadonlyArray<>` syntax
    if (identifierName === "ReadonlyArray" && typeNode.typeArguments) {
      return buildZodSchema(
        z,
        "array",
        [
          buildZodPrimitive({
            z,
            typeNode: typeNode.typeArguments[0],
            isOptional: false,
            jsDocTags: {},
            sourceFile,
            dependencies,
            getDependencyName,
            skipParseJSDoc,
            customJSDocFormatTypes,
          }),
        ],
        zodProperties
      );
    }

    // Deal with `Record<>` syntax
    if (identifierName === "Record" && typeNode.typeArguments) {
      if (typeNode.typeArguments[0].kind === ts.SyntaxKind.StringKeyword) {
        // Always use expanded version for Record<string, T> to ensure type safety
        // z.record(z.string(), zodType) vs z.record(zodType) - the former is more explicit
        return buildZodSchema(
          z,
          "record",
          [
            buildZodSchema(z, "string", [], []),
            buildZodPrimitive({
              z,
              typeNode: typeNode.typeArguments[1],
              isOptional: false,
              jsDocTags,
              customJSDocFormatTypes,
              sourceFile,
              isPartial: false,
              dependencies,
              getDependencyName,
              skipParseJSDoc,
            }),
          ],
          zodProperties
        );
      }

      // Expanded version (`z.record(zodType, zodType)`)
      return buildZodSchema(
        z,
        "record",
        [
          buildZodPrimitive({
            z,
            typeNode: typeNode.typeArguments[0],
            isOptional: false,
            jsDocTags,
            customJSDocFormatTypes,
            sourceFile,
            isPartial: false,
            dependencies,
            getDependencyName,
            skipParseJSDoc,
          }),
          buildZodPrimitive({
            z,
            typeNode: typeNode.typeArguments[1],
            isOptional: false,
            jsDocTags,
            customJSDocFormatTypes,
            sourceFile,
            isPartial: false,
            dependencies,
            getDependencyName,
            skipParseJSDoc,
          }),
        ],
        zodProperties
      );
    }

    // Deal with `Date`
    if (identifierName === "Date") {
      return buildZodSchema(z, "date", [], zodProperties);
    }

    // Deal with `Set<>` syntax
    if (identifierName === "Set" && typeNode.typeArguments) {
      return buildZodSchema(
        z,
        "set",
        typeNode.typeArguments.map((i) =>
          buildZodPrimitive({
            z,
            typeNode: i,
            isOptional: false,
            jsDocTags,
            customJSDocFormatTypes,
            sourceFile,
            dependencies,
            getDependencyName,
            skipParseJSDoc,
          })
        ),
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
            customJSDocFormatTypes,
            sourceFile,
            dependencies,
            getDependencyName,
            skipParseJSDoc,
          })
        ),
        zodProperties
      );
    }

    // Deal with `Omit<>` & `Pick<>` syntax
    if (["Omit", "Pick"].includes(identifierName) && typeNode.typeArguments) {
      const [originalType, keys] = typeNode.typeArguments;
      const zodCall = buildZodPrimitive({
        z,
        typeNode: originalType,
        isOptional: false,
        jsDocTags: {},
        sourceFile,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
        customJSDocFormatTypes,
      });

      return buildOmitPickObject(identifierName, keys, sourceFile, zodCall);
    }

    const dependencyName = getDependencyName(identifierName);
    dependencies.push(dependencyName);
    const zodSchema: ts.Identifier | ts.CallExpression =
      f.createIdentifier(dependencyName);
    return withZodProperties(zodSchema, zodProperties);
  }

  if (ts.isUnionTypeNode(typeNode)) {
    const hasNull = Boolean(
      typeNode.types.find(
        (i) =>
          ts.isLiteralTypeNode(i) &&
          i.literal.kind === ts.SyntaxKind.NullKeyword
      )
    );

    const nodes = typeNode.types.filter(isNotNull);

    // type A = | 'b' is a valid typescript definition
    // Zod does not allow `z.union(['b']), so we have to return just the value
    if (nodes.length === 1) {
      return buildZodPrimitive({
        z,
        typeNode: nodes[0],
        isOptional,
        isNullable: hasNull,
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
      });
    }

    const values = nodes.map((i) =>
      buildZodPrimitive({
        z,
        typeNode: i,
        isOptional: false,
        isNullable: false,
        jsDocTags: {},
        sourceFile,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
        customJSDocFormatTypes,
      })
    );

    // Handling null value outside of the union type
    if (hasNull) {
      zodProperties.push({
        identifier: "nullable",
      });
    }

    if (jsDocTags.discriminator) {
      let isValidDiscriminatedUnion = true;

      // Check each member of the union
      for (const node of nodes) {
        if (!ts.isTypeLiteralNode(node) && !ts.isTypeReferenceNode(node)) {
          console.warn(
            ` »   Warning: discriminated union member "${node.getText(
              sourceFile
            )}" is not a type reference or object literal`
          );
          isValidDiscriminatedUnion = false;
          break;
        }

        // For type references, we'd need to resolve the referenced type
        // For type literals, we can check directly
        if (ts.isTypeLiteralNode(node)) {
          const hasDiscriminator = node.members.some(
            (member) =>
              ts.isPropertySignature(member) &&
              member.name &&
              member.name.getText(sourceFile) === jsDocTags.discriminator
          );

          if (!hasDiscriminator) {
            console.warn(
              ` »   Warning: discriminated union member "${node.getText(
                sourceFile
              )}" missing discriminator field "${jsDocTags.discriminator}"`
            );
            isValidDiscriminatedUnion = false;
            break;
          }
        }
      }

      if (isValidDiscriminatedUnion) {
        return buildZodSchema(
          z,
          "discriminatedUnion",
          [
            f.createStringLiteral(jsDocTags.discriminator),
            f.createArrayLiteralExpression(values),
          ],
          zodProperties
        );
      }
    }

    return buildZodSchema(
      z,
      "union",
      [f.createArrayLiteralExpression(values)],
      zodProperties
    );
  }

  if (ts.isTupleTypeNode(typeNode)) {
    // Handle empty tuples
    if (typeNode.elements.length === 0) {
      return buildZodSchema(
        z,
        "tuple",
        [f.createArrayLiteralExpression([])],
        []
      );
    }

    // Handle last item separetely if it is a rest element
    const lastItem = typeNode.elements[typeNode.elements.length - 1];
    const restElement =
      lastItem &&
      ts.isRestTypeNode(lastItem) &&
      ts.isArrayTypeNode(lastItem.type)
        ? lastItem.type.elementType
        : undefined;

    // Handle the rest element
    if (restElement) {
      const values = typeNode.elements
        .slice(0, typeNode.elements.length - 1)
        .map((node) =>
          buildZodPrimitive({
            z,
            typeNode: ts.isNamedTupleMember(node) ? node.type : node,
            isOptional: false,
            jsDocTags: {},
            sourceFile,
            dependencies,
            getDependencyName,
            skipParseJSDoc,
            customJSDocFormatTypes,
          })
        );

      zodProperties.unshift({
        identifier: "rest",
        expressions: [
          buildZodPrimitive({
            z,
            typeNode: restElement,
            isOptional: false,
            jsDocTags: {},
            sourceFile,
            dependencies,
            getDependencyName,
            skipParseJSDoc,
            customJSDocFormatTypes,
          }),
        ],
      });

      return buildZodSchema(
        z,
        "tuple",
        [f.createArrayLiteralExpression(values)],
        zodProperties
      );
    }

    const values = typeNode.elements.map((node) =>
      buildZodPrimitive({
        z,
        typeNode: ts.isNamedTupleMember(node) ? node.type : node,
        isOptional: false,
        jsDocTags: {},
        sourceFile,
        dependencies,
        getDependencyName,
        skipParseJSDoc,
        customJSDocFormatTypes,
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
    if (ts.isPrefixUnaryExpression(typeNode.literal)) {
      if (
        typeNode.literal.operator === ts.SyntaxKind.MinusToken &&
        ts.isNumericLiteral(typeNode.literal.operand)
      ) {
        return buildZodSchema(
          z,
          "literal",
          [
            f.createPrefixUnaryExpression(
              ts.SyntaxKind.MinusToken,
              f.createNumericLiteral(typeNode.literal.operand.text)
            ),
          ],
          zodProperties
        );
      }
    }

    if (typeNode.literal.kind === ts.SyntaxKind.TrueKeyword) {
      return buildZodSchema(z, "literal", [f.createTrue()], zodProperties);
    }
    if (typeNode.literal.kind === ts.SyntaxKind.FalseKeyword) {
      return buildZodSchema(z, "literal", [f.createFalse()], zodProperties);
    }
  }

  // Deal with enums used as literals
  if (
    ts.isTypeReferenceNode(typeNode) &&
    ts.isQualifiedName(typeNode.typeName) &&
    ts.isIdentifier(typeNode.typeName.left)
  ) {
    return buildZodSchema(
      z,
      "literal",
      [
        f.createPropertyAccessExpression(
          typeNode.typeName.left,
          typeNode.typeName.right
        ),
      ],
      zodProperties
    );
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
          jsDocTags: {
            description: jsDocTags.elementDescription,
            minimum: jsDocTags.elementMinimum,
            maximum: jsDocTags.elementMaximum,
            minLength: jsDocTags.elementMinLength,
            maxLength: jsDocTags.elementMaxLength,
            format: jsDocTags.elementFormat,
            pattern: jsDocTags.elementPattern,
          },
          sourceFile,
          dependencies,
          getDependencyName,
          skipParseJSDoc,
          customJSDocFormatTypes,
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
        skipParseJSDoc,
        customJSDocFormatTypes,
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
      skipParseJSDoc,
      customJSDocFormatTypes,
    });

    const zodCall = rest.reduce(
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
              skipParseJSDoc,
              customJSDocFormatTypes,
            }),
          ]
        ),
      basePrimitive
    );

    return withZodProperties(zodCall, zodProperties);
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
    // In Zod v4, functions use z.function({ input: [...], output: ... }) syntax
    const argsArray = typeNode.parameters.map((p) =>
      buildZodPrimitive({
        z,
        typeNode: p.type || f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        dependencies,
        getDependencyName,
        isOptional: Boolean(p.questionToken),
        skipParseJSDoc,
      })
    );

    // Check if the return type is a Promise
    const isPromiseReturnType =
      ts.isTypeReferenceNode(typeNode.type) &&
      ts.isIdentifier(typeNode.type.typeName) &&
      typeNode.type.typeName.text === "Promise";

    let returnType: ts.Expression;

    if (isPromiseReturnType && typeNode.type.typeArguments) {
      // For async functions, wrap with z.custom<Promise<T>>(() => innerSchema)
      // This is a limitation from zod@4, it always returns MaybeAsync when using `implementAsync`, which causes the final type and the original type to not match
      const innerSchema = buildZodPrimitive({
        z,
        typeNode: typeNode.type.typeArguments[0],
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        dependencies,
        getDependencyName,
        isOptional: false,
        skipParseJSDoc,
      }) as ts.Expression;

      returnType = f.createCallExpression(
        f.createPropertyAccessExpression(
          f.createIdentifier(z),
          f.createIdentifier("custom")
        ),
        [
          f.createTypeReferenceNode(
            f.createIdentifier("Promise"),
            typeNode.type.typeArguments.map((typeArg) =>
              f.createTypeReferenceNode(
                f.createIdentifier(typeArg.getText(sourceFile))
              )
            )
          ),
        ],
        [
          f.createArrowFunction(
            undefined,
            undefined,
            [],
            undefined,
            f.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
            innerSchema
          ),
        ]
      ) as ts.Expression;
    } else {
      // For non-Promise return types, use the normal approach
      returnType = buildZodPrimitive({
        z,
        typeNode: typeNode.type,
        jsDocTags,
        customJSDocFormatTypes,
        sourceFile,
        dependencies,
        getDependencyName,
        isOptional: false,
        skipParseJSDoc,
      }) as ts.Expression;
    }

    // Create the v4 function syntax: z.function({ input: [...], output: ... })
    const inputProperty = f.createPropertyAssignment(
      f.createIdentifier("input"),
      f.createArrayLiteralExpression(argsArray as ts.Expression[], false)
    );

    const outputProperty = f.createPropertyAssignment(
      f.createIdentifier("output"),
      returnType
    );

    const configObject = f.createObjectLiteralExpression(
      [inputProperty, outputProperty],
      false
    );

    const functionCall = f.createCallExpression(
      f.createPropertyAccessExpression(
        f.createIdentifier(z),
        f.createIdentifier("function")
      ),
      undefined,
      [configObject]
    );

    // Wrap with appropriate function helper for Zod v4 compatibility
    const wrapperFunction = isPromiseReturnType
      ? "createAsyncFunctionSchema"
      : "createFunctionSchema";
    const wrappedFunctionCall = f.createCallExpression(
      f.createIdentifier(wrapperFunction),
      undefined,
      [functionCall]
    );

    return withZodProperties(wrappedFunctionCall, zodProperties);
  }

  if (ts.isIndexedAccessTypeNode(typeNode)) {
    return withZodProperties(
      buildSchemaReference({
        node: typeNode,
        getDependencyName,
        sourceFile,
        dependencies,
      }),
      zodProperties
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
    case ts.SyntaxKind.NeverKeyword:
      return buildZodSchema(z, "never", [], zodProperties);
    case ts.SyntaxKind.UnknownKeyword:
      return buildZodSchema(z, "unknown", [], zodProperties);
    case ts.SyntaxKind.ObjectKeyword:
      return buildZodSchema(
        z,
        "record",
        [buildZodSchema(z, "any")],
        zodProperties
      );
  }

  if (ts.isTemplateLiteralTypeNode(typeNode)) {
    let ignoreNode = false;

    // Handling null outside of the template literal browsing
    let hasNull = false;

    // Extracting the values from the template literal
    const spanValues: string[][] = [];
    spanValues.push([typeNode.head.text]);

    typeNode.templateSpans.forEach((span) => {
      if (ts.isTypeReferenceNode(span.type)) {
        const targetNode = findNode(
          sourceFile,
          (n): n is ts.TypeAliasDeclaration | ts.EnumDeclaration => {
            return (
              ((ts.isTypeAliasDeclaration(n) && ts.isUnionTypeNode(n.type)) ||
                ts.isEnumDeclaration(n)) &&
              n.name.getText(sourceFile) ===
                (span.type as ts.TypeReferenceNode).typeName.getText(sourceFile)
            );
          }
        );

        if (targetNode) {
          if (
            ts.isTypeAliasDeclaration(targetNode) &&
            ts.isUnionTypeNode(targetNode.type)
          ) {
            hasNull =
              hasNull ||
              Boolean(
                targetNode.type.types.find(
                  (i) =>
                    ts.isLiteralTypeNode(i) &&
                    i.literal.kind === ts.SyntaxKind.NullKeyword
                )
              );

            spanValues.push(
              targetNode.type.types
                .map((i) => {
                  if (ts.isLiteralTypeNode(i))
                    return extractLiteralValue(i.literal);
                  return "";
                })
                .filter((i) => i !== "")
            );
          } else if (ts.isEnumDeclaration(targetNode)) {
            spanValues.push(
              targetNode.members
                .map((i) => {
                  if (i.initializer) return extractLiteralValue(i.initializer);
                  else {
                    console.warn(
                      ` »   Warning: enum member without initializer '${targetNode.name.getText(
                        sourceFile
                      )}.${i.name.getText(sourceFile)}' is not supported.`
                    );
                    ignoreNode = true;
                  }
                  return "";
                })
                .filter((i) => i !== "")
            );
          }
        } else {
          console.warn(
            ` »   Warning: reference not found '${span.type.getText(
              sourceFile
            )}' in Template Literal.`
          );
          ignoreNode = true;
        }
        spanValues.push([span.literal.text]);
      } else {
        console.warn(
          ` »   Warning: node '${span.type.getText(
            sourceFile
          )}' not supported in Template Literal.`
        );
        ignoreNode = true;
      }
    });

    // Handling null value outside of the union type
    if (hasNull) {
      zodProperties.push({
        identifier: "nullable",
      });
    }

    if (!ignoreNode) {
      return buildZodSchema(
        z,
        "union",
        [
          f.createArrayLiteralExpression(
            generateCombinations(spanValues).map((v) =>
              buildZodSchema(z, "literal", [f.createStringLiteral(v)])
            )
          ),
        ],
        zodProperties
      );
    } else {
      console.warn(` »   ...falling back into 'z.string()' (template literal)`);
      return buildZodSchema(z, "string", [], zodProperties);
    }
  }

  const fallbackType = getSmartFallback(typeNode);
  console.warn(
    ` »   Warning: '${
      ts.SyntaxKind[typeNode.kind]
    }' is not supported, fallback into 'z.${fallbackType}()'`
  );
  return buildZodSchema(z, fallbackType, [], zodProperties);
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

function buildZodExtendedSchema(
  schemaList: SchemaExtensionClause[],
  sourceFile: ts.SourceFile,
  args?: ts.Expression[],
  properties?: ZodProperty[]
) {
  let zodCall = f.createIdentifier(
    schemaList[0].extendedSchemaName
  ) as ts.Expression;

  if (schemaList[0].omitOrPickType && schemaList[0].omitOrPickKeys) {
    const keys = schemaList[0].omitOrPickKeys;
    const omitOrPickIdentifierName = schemaList[0].omitOrPickType;
    zodCall = buildOmitPickObject(
      omitOrPickIdentifierName,
      keys,
      sourceFile,
      zodCall
    );
  }

  for (let i = 1; i < schemaList.length; i++) {
    const omitOrPickIdentifierName = schemaList[i].omitOrPickType;
    const keys = schemaList[i].omitOrPickKeys;

    if (omitOrPickIdentifierName && keys) {
      zodCall = f.createCallExpression(
        f.createPropertyAccessExpression(zodCall, f.createIdentifier("extend")),
        undefined,
        [
          f.createPropertyAccessExpression(
            buildOmitPickObject(
              omitOrPickIdentifierName,
              keys,
              sourceFile,
              f.createIdentifier(schemaList[i].extendedSchemaName)
            ),
            f.createIdentifier("shape")
          ),
        ]
      );
    } else {
      zodCall = f.createCallExpression(
        f.createPropertyAccessExpression(zodCall, f.createIdentifier("extend")),
        undefined,
        [
          f.createPropertyAccessExpression(
            f.createIdentifier(schemaList[i].extendedSchemaName),
            f.createIdentifier("shape")
          ),
        ]
      );
    }
  }

  if (args?.length) {
    zodCall = f.createCallExpression(
      f.createPropertyAccessExpression(zodCall, f.createIdentifier("extend")),
      undefined,
      args
    );
  }

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
  schemaExtensionClauses,
  skipParseJSDoc,
  customJSDocFormatTypes,
}: {
  typeNode: ts.TypeLiteralNode | ts.InterfaceDeclaration;
  z: string;
  dependencies: string[];
  sourceFile: ts.SourceFile;
  getDependencyName: Required<GenerateZodSchemaProps>["getDependencyName"];
  schemaExtensionClauses?: SchemaExtensionClause[];
  skipParseJSDoc: boolean;
  customJSDocFormatTypes: CustomJSDocFormatTypes;
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

  const parsedProperties =
    properties.length > 0
      ? buildZodProperties({
          members: properties,
          zodImportValue: z,
          sourceFile,
          dependencies,
          getDependencyName,
          skipParseJSDoc,
          customJSDocFormatTypes,
        })
      : new Map();

  if (schemaExtensionClauses && schemaExtensionClauses.length > 0) {
    objectSchema = buildZodExtendedSchema(
      schemaExtensionClauses,
      sourceFile,
      properties.length > 0
        ? [
            f.createObjectLiteralExpression(
              Array.from(parsedProperties.entries()).map(([key, tsCall]) => {
                return f.createPropertyAssignment(key, tsCall);
              }),
              true
            ),
          ]
        : undefined
    );
  } else if (properties.length > 0) {
    objectSchema = buildZodSchema(z, "object", [
      f.createObjectLiteralExpression(
        Array.from(parsedProperties.entries()).map(([key, tsCall]) => {
          return f.createPropertyAssignment(key, tsCall);
        }),
        true
      ),
    ]);
  }

  if (indexSignature) {
    if (schemaExtensionClauses) {
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
        skipParseJSDoc,
        customJSDocFormatTypes,
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
  return buildZodSchema(z, "object", [f.createObjectLiteralExpression()]);
}

/**
 * Build a schema reference from an IndexedAccessTypeNode
 *
 * example: Superman["power"]["fly"] -> SupermanSchema.shape.power.shape.fly
 */
function buildSchemaReference(
  {
    node,
    dependencies,
    sourceFile,
    getDependencyName,
  }: {
    node: ts.IndexedAccessTypeNode;
    dependencies: string[];
    sourceFile: ts.SourceFile;
    getDependencyName: Required<GenerateZodSchemaProps>["getDependencyName"];
  },
  path = ""
): ts.PropertyAccessExpression | ts.Identifier | ts.ElementAccessExpression {
  const indexTypeText = node.indexType.getText(sourceFile);
  const { indexTypeName, type: indexTypeType } = /^['"]([^'"]+)['"]$/.exec(
    indexTypeText
  )
    ? { type: "string" as const, indexTypeName: indexTypeText.slice(1, -1) }
    : { type: "number" as const, indexTypeName: indexTypeText };

  if (indexTypeName === "-1") {
    // Get the original type declaration
    // For nested access like Superman["powers"][-1][-1], we need to find the root type
    let rootObjectType = node.objectType;
    while (ts.isIndexedAccessTypeNode(rootObjectType)) {
      rootObjectType = rootObjectType.objectType;
    }

    const declaration = findNode(
      sourceFile,
      (n): n is ts.InterfaceDeclaration | ts.TypeAliasDeclaration => {
        return (
          (ts.isInterfaceDeclaration(n) || ts.isTypeAliasDeclaration(n)) &&
          ts.isIndexedAccessTypeNode(node.objectType) &&
          n.name.getText(sourceFile) === rootObjectType.getText(sourceFile)
        );
      }
    );

    if (declaration && ts.isIndexedAccessTypeNode(node.objectType)) {
      // For nested access, we need to find the property key, not the index
      // For Superman["powers"][-1][-1], we want "powers", not "-1"
      let keyAccessNode = node.objectType;
      while (ts.isIndexedAccessTypeNode(keyAccessNode.objectType)) {
        keyAccessNode = keyAccessNode.objectType;
      }
      const key = keyAccessNode.indexType.getText(sourceFile).slice(1, -1); // remove quotes
      const members =
        ts.isTypeAliasDeclaration(declaration) &&
        ts.isTypeLiteralNode(declaration.type)
          ? declaration.type.members
          : ts.isInterfaceDeclaration(declaration)
          ? declaration.members
          : [];

      const member = members.find((m) => m.name?.getText(sourceFile) === key);

      if (member && ts.isPropertySignature(member) && member.type) {
        // Array<type> or type[]
        if (
          (ts.isTypeReferenceNode(member.type) &&
            member.type.typeName.getText(sourceFile) === "Array") ||
          ts.isArrayTypeNode(member.type)
        ) {
          return buildSchemaReference(
            {
              node: node.objectType,
              dependencies,
              sourceFile,
              getDependencyName,
            },
            `element.${path}`
          );
        }
        // Record<string, type>
        if (
          ts.isTypeReferenceNode(member.type) &&
          member.type.typeName.getText(sourceFile) === "Record"
        ) {
          return buildSchemaReference(
            {
              node: node.objectType,
              dependencies,
              sourceFile,
              getDependencyName,
            },
            `valueType.${path}`
          );
        }

        console.warn(
          ` »   Warning: indexAccessType can't be resolved, fallback into 'unknown'`
        );
        return f.createPropertyAccessExpression(
          f.createIdentifier("z"),
          f.createIdentifier("unknown")
        );
      }
    }

    return f.createPropertyAccessExpression(
      f.createIdentifier("z"),
      f.createIdentifier("unknown")
    );
  } else if (
    indexTypeType === "number" &&
    ts.isIndexedAccessTypeNode(node.objectType)
  ) {
    return buildSchemaReference(
      { node: node.objectType, dependencies, sourceFile, getDependencyName },
      `def.items[${indexTypeName}].${path}`
    );
  }

  if (ts.isIndexedAccessTypeNode(node.objectType)) {
    return buildSchemaReference(
      { node: node.objectType, dependencies, sourceFile, getDependencyName },
      `shape.${indexTypeName}.${path}`
    );
  }

  if (ts.isTypeReferenceNode(node.objectType)) {
    const dependencyName = getDependencyName(
      node.objectType.typeName.getText(sourceFile)
    );
    dependencies.push(dependencyName);

    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(indexTypeName)) {
      return f.createPropertyAccessExpression(
        f.createIdentifier(dependencyName),
        f.createIdentifier(`shape.${indexTypeName}.${path}`.slice(0, -1))
      );
    }
    return f.createElementAccessExpression(
      f.createPropertyAccessExpression(
        f.createIdentifier(dependencyName),
        f.createIdentifier("shape")
      ),
      f.createStringLiteral(indexTypeName)
    );
  }

  throw new Error("Unknown IndexedAccessTypeNode.objectType type");
}

function buildOmitPickObject(
  omitOrPickIdentifierName: string,
  keys: ts.TypeNode,
  sourceFile: ts.SourceFile,
  zodCall: ts.Expression
) {
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
            `${omitOrPickIdentifierName}<T, K> unknown syntax: (${
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
      `${omitOrPickIdentifierName}<T, K> unknown syntax: (${
        ts.SyntaxKind[keys.kind]
      } as K not supported)`
    );
  }

  return f.createCallExpression(
    f.createPropertyAccessExpression(
      zodCall,
      f.createIdentifier(lower(omitOrPickIdentifierName))
    ),
    undefined,
    [parameters]
  );
}
