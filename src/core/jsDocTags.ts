import ts from "typescript";
import { getJsDoc } from "tsutils";
const { factory: f } = ts;

/**
 * List of formats that can be translated in zod functions.
 */
const formats = [
  "email" as const,
  "uuid" as const,
  // "uri" as const,
  "url" as const,
  // "date" as const,
  // "date-time" as const,
];

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
  format?: TagWithError<typeof formats[-1]>;
  pattern?: string;
}

/**
 * Typeguard to filter supported JSDoc tag key.
 *
 * @param tagName
 */
function isJSDocTagKey(tagName: string): tagName is keyof JSDocTags {
  const keys: Array<keyof JSDocTags> = [
    "minimum",
    "maximum",
    "default",
    "minLength",
    "maxLength",
    "format",
    "pattern",
  ];
  return (keys as string[]).includes(tagName);
}

/**
 * Typeguard to filter supported JSDoc format tag values.
 *
 * @param format
 */
function isSupportedFormat(
  format = ""
): format is Required<JSDocTags>["format"]["value"] {
  return (formats as string[]).includes(format);
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
            if (isSupportedFormat(value)) {
              jsDocTags[tagName] = { value, errorMessage };
            }
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

export function zodPropertyIsOptional() {
  return {
    identifier: "optional",
  };
}

export function zodPropertyIsNullable() {
  return {
    identifier: "nullable",
  };
}

export function zodPropertyIsPartial() {
  return {
    identifier: "partial",
  };
}

export function zodPropertyIsRequired() {
  return {
    identifier: "required",
  };
}

/**
 * Convert a set of jsDocTags to zod properties
 *
 * @param jsDocTags
 * @param isOptional
 * @param isPartial
 * @param isRequired
 * @param isNullable
 */
export function jsDocTagToZodProperties(
  jsDocTags: JSDocTags,
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
  if (jsDocTags.format) {
    zodProperties.push({
      identifier: jsDocTags.format.value,
      expressions: jsDocTags.format.errorMessage
        ? [f.createStringLiteral(jsDocTags.format.errorMessage)]
        : undefined,
    });
  }
  if (jsDocTags.pattern) {
    zodProperties.push({
      identifier: "regex",
      expressions: [f.createRegularExpressionLiteral(`/${jsDocTags.pattern}/`)],
    });
  }
  if (isOptional) {
    zodProperties.push(zodPropertyIsOptional());
  }
  if (isNullable) {
    zodProperties.push(zodPropertyIsNullable());
  }
  if (isPartial) {
    zodProperties.push(zodPropertyIsPartial());
  }
  if (isRequired) {
    zodProperties.push(zodPropertyIsRequired());
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

function withErrorMessage(expression: ts.Expression, errorMessage?: string) {
  if (errorMessage) {
    return [expression, f.createStringLiteral(errorMessage)];
  }
  return [expression];
}
