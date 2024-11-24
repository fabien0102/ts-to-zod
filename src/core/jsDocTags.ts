import { getJsDoc } from "tsutils";
import ts, { factory as f } from "typescript";
import type { ZodString } from "zod";
import { CustomJSDocFormatType, CustomJSDocFormatTypes } from "../config";

/**
 * List of formats that can be translated in zod functions.
 */
const builtInJSDocFormatsTypes = [
  "date-time",
  "date",
  "time",
  "duration",
  "email",
  "ip",
  "ipv4",
  "ipv6",
  "url",
  "uuid",
  // "uri",
] as const;

type BuiltInJSDocFormatsType = (typeof builtInJSDocFormatsTypes)[number];

type JsonPrimitive = string | number | boolean | null;
type JsonArray = JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * Type guard to filter supported JSDoc format tag values (built-in).
 *
 * @param formatType
 */
function isBuiltInFormatType(
  formatType = ""
): formatType is BuiltInJSDocFormatsType {
  return builtInJSDocFormatsTypes.map(String).includes(formatType);
}

/**
 * Type guard to filter supported JSDoc format tag values (custom).
 *
 * @param formatType
 * @param customFormatTypes
 */
function isCustomFormatType(
  formatType = "",
  customFormatTypes: Array<keyof CustomJSDocFormatTypes>
): formatType is CustomJSDocFormatType {
  return customFormatTypes.includes(formatType);
}

type TagWithError<T> = {
  value: T;
  errorMessage?: string;
};

/**
 * JSDoc special tags that can be converted in zod flags.
 */
export interface JSDocTagsBase {
  description?: string;
  minimum?: TagWithError<number>;
  maximum?: TagWithError<number>;
  default?: JsonValue;
  minLength?: TagWithError<number>;
  maxLength?: TagWithError<number>;
  format?: TagWithError<BuiltInJSDocFormatsType | CustomJSDocFormatType>;
  /**
   * Due to parsing ambiguities, `@pattern`
   * does not support custom error messages.
   */
  pattern?: string;
  strict?: boolean;
  schema?: string;
  discriminator?: string;
}

export type ElementJSDocTags = Pick<
  JSDocTagsBase,
  | "description"
  | "minimum"
  | "maximum"
  | "minLength"
  | "maxLength"
  | "pattern"
  | "format"
>;

export type JSDocTags = JSDocTagsBase & {
  [K in keyof ElementJSDocTags as `element${Capitalize<K>}`]: ElementJSDocTags[K];
};

const jsDocTagKeys: Array<keyof JSDocTags> = [
  "description",
  "minimum",
  "maximum",
  "default",
  "minLength",
  "maxLength",
  "format",
  "pattern",
  "schema",
  "elementDescription",
  "elementMinimum",
  "elementMaximum",
  "elementMinLength",
  "elementMaxLength",
  "elementPattern",
  "elementFormat",
  "discriminator",
];

/**
 * Type guard to filter supported JSDoc tag key.
 *
 * @param tagName
 */
function isJSDocTagKey(tagName: string): tagName is keyof JSDocTags {
  return jsDocTagKeys.map(String).includes(tagName);
}

/**
 * Parse js doc comment.
 *
 * @example
 * parseJsDocComment("email should be an email");
 * // {value: "email", errorMessage: "should be an email"}
 *
 * @param comment
 */
function parseJsDocComment(comment: string): {
  value: string;
  errorMessage?: string;
} {
  const [value, ...rest] = comment.split(" ");
  const errorMessage =
    rest.join(" ").replace(/(^["']|["']$)/g, "") || undefined;

  return {
    value: value.replace(",", "").replace(/(^["']|["']$)/g, ""),
    errorMessage,
  };
}

/**
 * Return parsed JSTags.
 *
 * This function depends on `customJSDocFormatTypeContext`. Before
 * calling it, make sure the context has been supplied the expected value.
 *
 * @param nodeType
 * @param sourceFile
 * @returns Tags list
 */
export function getJSDocTags(nodeType: ts.Node, sourceFile: ts.SourceFile) {
  const jsDoc = getJsDoc(nodeType, sourceFile);
  const jsDocTags: JSDocTags = {};
  if (jsDoc.length) {
    jsDoc.forEach((doc) => {
      (doc.tags || []).forEach((tag) => {
        const tagName = tag.tagName.escapedText.toString();

        // Handling "unary operator" tag first (no tag.comment part needed)
        if (tagName === "strict") {
          jsDocTags[tagName] = true;
          return;
        }

        if (!isJSDocTagKey(tagName) || typeof tag.comment !== "string") return;
        const { value, errorMessage } = parseJsDocComment(tag.comment);

        switch (tagName) {
          case "minimum":
          case "maximum":
          case "minLength":
          case "maxLength":
          case "elementMinLength":
          case "elementMaxLength":
          case "elementMinimum":
          case "elementMaximum":
            if (value && !Number.isNaN(parseInt(value))) {
              jsDocTags[tagName] = { value: parseInt(value), errorMessage };
            }
            break;
          case "description":
          case "elementDescription":
          case "schema":
          case "pattern":
          case "elementPattern":
            if (tag.comment) {
              jsDocTags[tagName] = tag.comment;
            }
            break;
          case "format":
          case "elementFormat":
            jsDocTags[tagName] = { value, errorMessage };
            break;
          case "default":
            if (tag.comment) {
              try {
                // Attempt to parse as JSON
                const parsedValue = JSON.parse(tag.comment);
                jsDocTags[tagName] = parsedValue;
              } catch (e) {
                // If JSON parsing fails, handle as before
                jsDocTags[tagName] = tag.comment;
              }
            }
            break;
          case "discriminator":
            jsDocTags[tagName] = tag.comment;
            break;
          case "strict":
            break;
          default:
            tagName satisfies never;
        }
      });
    });
  }

  return jsDocTags;
}

export type ZodProperty = {
  identifier: string;
  expressions?: ts.Expression[];
};

/**
 * Convert a set of JSDoc tags to zod properties.
 *
 * @param jsDocTags
 * @param customJSDocFormats
 * @param isOptional
 * @param isPartial
 * @param isRequired
 * @param isNullable
 */
export function jsDocTagToZodProperties(
  jsDocTags: JSDocTags,
  customJSDocFormats: CustomJSDocFormatTypes,
  isOptional: boolean,
  isPartial: boolean,
  isRequired: boolean,
  isNullable: boolean
) {
  const zodProperties: ZodProperty[] = [];
  if (jsDocTags.minimum !== undefined) {
    zodProperties.push({
      identifier: "min",
      expressions: withErrorMessage(
        jsDocTags.minimum.value < 0
          ? f.createPrefixUnaryExpression(
              ts.SyntaxKind.MinusToken,
              f.createNumericLiteral(Math.abs(jsDocTags.minimum.value))
            )
          : f.createNumericLiteral(jsDocTags.minimum.value),
        jsDocTags.minimum.errorMessage
      ),
    });
  }
  if (jsDocTags.maximum !== undefined) {
    zodProperties.push({
      identifier: "max",
      expressions: withErrorMessage(
        jsDocTags.maximum.value < 0
          ? f.createPrefixUnaryExpression(
              ts.SyntaxKind.MinusToken,
              f.createNumericLiteral(Math.abs(jsDocTags.maximum.value))
            )
          : f.createNumericLiteral(jsDocTags.maximum.value),
        jsDocTags.maximum.errorMessage
      ),
    });
  }
  if (jsDocTags.minLength !== undefined) {
    zodProperties.push({
      identifier: "min",
      expressions: withErrorMessage(
        f.createNumericLiteral(jsDocTags.minLength.value),
        jsDocTags.minLength.errorMessage
      ),
    });
  }
  if (jsDocTags.maxLength !== undefined) {
    zodProperties.push({
      identifier: "max",
      expressions: withErrorMessage(
        f.createNumericLiteral(jsDocTags.maxLength.value),
        jsDocTags.maxLength.errorMessage
      ),
    });
  }
  if (
    jsDocTags.format &&
    (isBuiltInFormatType(jsDocTags.format.value) ||
      isCustomFormatType(
        jsDocTags.format.value,
        Object.keys(customJSDocFormats)
      ))
  ) {
    zodProperties.push(
      formatToZodProperty(jsDocTags.format, customJSDocFormats)
    );
  }
  if (jsDocTags.pattern) {
    zodProperties.push(createZodRegexProperty(jsDocTags.pattern));
  }
  // strict() must be before optional() and nullable()
  if (jsDocTags.strict) {
    zodProperties.push({ identifier: "strict" });
  }
  // partial() must be before optional() and nullable()
  if (isPartial) {
    zodProperties.push({
      identifier: "partial",
    });
  }
  if (isOptional) {
    zodProperties.push({
      identifier: "optional",
    });
  }
  if (isNullable || jsDocTags.default === null) {
    zodProperties.push({
      identifier: "nullable",
    });
  }
  if (isRequired) {
    zodProperties.push({
      identifier: "required",
    });
  }
  if (jsDocTags.description !== undefined) {
    zodProperties.push({
      identifier: "describe",
      expressions: [f.createStringLiteral(jsDocTags.description)],
    });
  }

  if (jsDocTags.default !== undefined) {
    zodProperties.push({
      identifier: "default",
      expressions:
        jsDocTags.default === true
          ? [f.createTrue()]
          : jsDocTags.default === false
          ? [f.createFalse()]
          : typeof jsDocTags.default === "number"
          ? jsDocTags.default < 0
            ? [
                f.createPrefixUnaryExpression(
                  ts.SyntaxKind.MinusToken,
                  f.createNumericLiteral(Math.abs(jsDocTags.default))
                ),
              ]
            : [f.createNumericLiteral(jsDocTags.default)]
          : jsDocTags.default === null
          ? [f.createNull()]
          : Array.isArray(jsDocTags.default)
          ? [createArrayLiteralExpression(jsDocTags.default)]
          : typeof jsDocTags.default === "object"
          ? [createObjectLiteralExpression(jsDocTags.default)]
          : [f.createStringLiteral(String(jsDocTags.default))],
    });
  }

  return zodProperties;
}

/**
 * Converts the given JSDoc format to the corresponding Zod
 * string validation function call represented by a {@link ZodProperty}.
 *
 * @param format The format to be converted.
 * @returns A ZodProperty representing a Zod string validation function call.
 */
function formatToZodProperty(
  format: Required<JSDocTags>["format"],
  customFormatTypes: CustomJSDocFormatTypes
): ZodProperty {
  if (isCustomFormatType(format.value, Object.keys(customFormatTypes))) {
    const rule = customFormatTypes[format.value];
    const regex = typeof rule === "string" ? rule : rule.regex;
    const errorMessage =
      typeof rule === "string" ? undefined : rule.errorMessage;

    return createZodRegexProperty(regex, format.errorMessage ?? errorMessage);
  }

  const identifier = builtInFormatTypeToZodPropertyIdentifier(format.value);
  const expressions = builtInFormatTypeToZodPropertyArguments(
    format.value,
    format.errorMessage
  );
  return { identifier, expressions };
}

/**
 * Maps the given JSDoc format type to its corresponding
 * Zod string validation function name.
 *
 * @param formatType The format type to be converted.
 * @returns The name of a Zod string validation function.
 */
function builtInFormatTypeToZodPropertyIdentifier(
  formatType: BuiltInJSDocFormatsType
): keyof ZodString {
  switch (formatType) {
    case "date-time":
      return "datetime";
    case "ipv4":
    case "ipv6":
    case "ip":
      return "ip";
    default:
      return formatType as keyof ZodString;
  }
}

/**
 * Maps the given JSDoc format type and error message to the
 * expected Zod string validation function arguments.
 *
 * @param formatType The format type to be converted.
 * @param errorMessage The error message to display if validation fails.
 * @returns A list of expressions which represent function arguments.
 */
function builtInFormatTypeToZodPropertyArguments(
  formatType: BuiltInJSDocFormatsType,
  errorMessage?: string
): ts.Expression[] | undefined {
  switch (formatType) {
    case "ipv4":
      return createZodStringIpArgs("v4", errorMessage);
    case "ipv6":
      return createZodStringIpArgs("v6", errorMessage);
    default:
      return errorMessage ? [f.createStringLiteral(errorMessage)] : undefined;
  }
}

/**
 * Constructs a list of expressions which represent the arguments
 * for `ip()` string validation function.
 *
 * @param version The IP version to use.
 * @param errorMessage The error message to display if validation fails.
 * @returns A list of expressions which represent the function arguments.
 */
function createZodStringIpArgs(
  version: "v4" | "v6",
  errorMessage?: string
): ts.Expression[] {
  const propertyAssignments: ts.ObjectLiteralElementLike[] = [
    f.createPropertyAssignment("version", f.createStringLiteral(version)),
  ];

  if (errorMessage) {
    propertyAssignments.push(
      f.createPropertyAssignment("message", f.createStringLiteral(errorMessage))
    );
  }

  return [f.createObjectLiteralExpression(propertyAssignments)];
}

/**
 * Constructs a ZodProperty that represents a call to
 * `.regex()` with the given regular expression.
 *
 * @param regex The regular expression to match.
 * @param errorMessage The error message to display if validation fails.
 * @returns A ZodProperty representing a `.regex()` call.
 */
function createZodRegexProperty(
  regex: string,
  errorMessage?: string
): ZodProperty {
  return {
    identifier: "regex",
    expressions: withErrorMessage(
      f.createRegularExpressionLiteral(`/${regex}/`),
      errorMessage
    ),
  };
}

function withErrorMessage(expression: ts.Expression, errorMessage?: string) {
  if (errorMessage) {
    return [expression, f.createStringLiteral(errorMessage)];
  }
  return [expression];
}

// Helper function to create an array literal expression
function createArrayLiteralExpression(
  arr: JsonValue[]
): ts.ArrayLiteralExpression {
  const elements = arr.map((item) => {
    if (typeof item === "string") return f.createStringLiteral(item);
    if (typeof item === "number") return f.createNumericLiteral(item);
    if (typeof item === "boolean")
      return item ? f.createTrue() : f.createFalse();
    if (item === null) return f.createNull();
    if (Array.isArray(item)) return createArrayLiteralExpression(item);
    if (typeof item === "object") return createObjectLiteralExpression(item);
    return f.createStringLiteral(String(item));
  });
  return f.createArrayLiteralExpression(elements);
}

// Helper function to create an object literal expression
function createObjectLiteralExpression(
  obj: Record<string, JsonValue>
): ts.ObjectLiteralExpression {
  const properties = Object.entries(obj).map(([key, value]) => {
    const propertyName = f.createStringLiteral(key);
    if (typeof value === "string")
      return f.createPropertyAssignment(
        propertyName,
        f.createStringLiteral(value)
      );
    if (typeof value === "number")
      return f.createPropertyAssignment(
        propertyName,
        f.createNumericLiteral(value)
      );
    if (typeof value === "boolean")
      return f.createPropertyAssignment(
        propertyName,
        value ? f.createTrue() : f.createFalse()
      );
    if (value === null)
      return f.createPropertyAssignment(propertyName, f.createNull());
    if (Array.isArray(value))
      return f.createPropertyAssignment(
        propertyName,
        createArrayLiteralExpression(value)
      );
    if (typeof value === "object")
      return f.createPropertyAssignment(
        propertyName,
        createObjectLiteralExpression(value)
      );
    return f.createPropertyAssignment(
      propertyName,
      f.createStringLiteral(String(value))
    );
  });
  return f.createObjectLiteralExpression(properties);
}
