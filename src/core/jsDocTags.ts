import { getJsDoc } from "tsutils";
import ts from "typescript";
import type { ZodString } from "zod";
import { CustomJSDocFormatType, CustomJSDocFormatTypes } from "../config";
const { factory: f } = ts;

/**
 * List of formats that can be translated in zod functions.
 */
const builtInJSDocFormatsTypes = [
  "date-time",
  "email",
  "ip",
  "ipv4",
  "ipv6",
  "url",
  "uuid",
  // "uri",
  // "date",
] as const;

type BuiltInJSDocFormatsType = typeof builtInJSDocFormatsTypes[number];

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
export interface JSDocTags {
  minimum?: TagWithError<number>;
  maximum?: TagWithError<number>;
  default?: number | string | boolean;
  minLength?: TagWithError<number>;
  maxLength?: TagWithError<number>;
  format?: TagWithError<BuiltInJSDocFormatsType | CustomJSDocFormatType>;
  /**
   * Due to parsing ambiguities, `@pattern`
   * does not support custom error messages.
   */
  pattern?: string;
  strict?: boolean;
}

const jsDocTagKeys: Array<keyof JSDocTags> = [
  "minimum",
  "maximum",
  "default",
  "minLength",
  "maxLength",
  "format",
  "pattern",
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
function parseJsDocComment(
  comment: string
): { value: string; errorMessage?: string } {
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
            if (value && !Number.isNaN(parseInt(value))) {
              jsDocTags[tagName] = { value: parseInt(value), errorMessage };
            }
            break;
          case "pattern":
            if (tag.comment) {
              jsDocTags[tagName] = tag.comment;
            }
            break;
          case "format":
            jsDocTags[tagName] = { value, errorMessage };
            break;
          case "default":
            if (
              tag.comment &&
              !tag.comment.includes('"') &&
              !Number.isNaN(parseInt(tag.comment))
            ) {
              // number
              jsDocTags[tagName] = parseInt(tag.comment);
            } else if (tag.comment && ["false", "true"].includes(tag.comment)) {
              // boolean
              jsDocTags[tagName] = tag.comment === "true";
            } else if (
              tag.comment &&
              tag.comment.startsWith('"') &&
              tag.comment.endsWith('"')
            ) {
              // string with double quotes
              jsDocTags[tagName] = tag.comment.slice(1, -1);
            } else if (tag.comment) {
              // string without quotes
              jsDocTags[tagName] = tag.comment;
            }
            break;
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
        f.createNumericLiteral(jsDocTags.minimum.value),
        jsDocTags.minimum.errorMessage
      ),
    });
  }
  if (jsDocTags.maximum !== undefined) {
    zodProperties.push({
      identifier: "max",
      expressions: withErrorMessage(
        f.createNumericLiteral(jsDocTags.maximum.value),
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
  if (isOptional) {
    zodProperties.push({
      identifier: "optional",
    });
  }
  if (isNullable) {
    zodProperties.push({
      identifier: "nullable",
    });
  }
  if (isPartial) {
    zodProperties.push({
      identifier: "partial",
    });
  }
  if (isRequired) {
    zodProperties.push({
      identifier: "required",
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
          ? [f.createNumericLiteral(jsDocTags.default)]
          : [f.createStringLiteral(jsDocTags.default)],
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
