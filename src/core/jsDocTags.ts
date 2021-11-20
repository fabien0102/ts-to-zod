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

/**
 * JSDoc special tags that can be converted in zod flags.
 */
export interface JSDocTags {
  minimum?: number;
  maximum?: number;
  default?: number | string | boolean;
  minLength?: number;
  maxLength?: number;
  format?: typeof formats[-1];
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
): format is Required<JSDocTags>["format"] {
  return (formats as string[]).includes(format);
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
        switch (tagName) {
          case "minimum":
          case "maximum":
          case "minLength":
          case "maxLength":
            if (tag.comment && !Number.isNaN(parseInt(tag.comment))) {
              jsDocTags[tagName] = parseInt(tag.comment);
            }
            break;
          case "pattern":
            if (tag.comment) {
              jsDocTags[tagName] = tag.comment;
            }
            break;
          case "format":
            if (isSupportedFormat(tag.comment)) {
              jsDocTags[tagName] = tag.comment;
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
      expressions: [f.createNumericLiteral(jsDocTags.minimum)],
    });
  }
  if (jsDocTags.maximum !== undefined) {
    zodProperties.push({
      identifier: "max",
      expressions: [f.createNumericLiteral(jsDocTags.maximum)],
    });
  }
  if (jsDocTags.minLength !== undefined) {
    zodProperties.push({
      identifier: "min",
      expressions: [f.createNumericLiteral(jsDocTags.minLength)],
    });
  }
  if (jsDocTags.maxLength !== undefined) {
    zodProperties.push({
      identifier: "max",
      expressions: [f.createNumericLiteral(jsDocTags.maxLength)],
    });
  }
  if (jsDocTags.format) {
    zodProperties.push({
      identifier: jsDocTags.format,
    });
  }
  if (jsDocTags.pattern) {
    zodProperties.push({
      identifier: "regex",
      expressions: [f.createRegularExpressionLiteral(`/${jsDocTags.pattern}/`)],
    });
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
