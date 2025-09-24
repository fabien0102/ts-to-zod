import ts from "typescript";
import { SimplifiedJSDocTag } from "../config.js";

/**
 * Get a simplified version of a node JSDocTags.
 *
 * @param jsDocs
 */
export function getSimplifiedJsDocTags(
  jsDocs: ts.JSDoc[]
): SimplifiedJSDocTag[] {
  const tags: SimplifiedJSDocTag[] = [];
  jsDocs.forEach((jsDoc) => {
    (jsDoc.tags || []).forEach((tag) => {
      const name = tag.tagName.escapedText.toString();
      const value = typeof tag.comment === "string" ? tag.comment : undefined;
      tags.push({ name, value });
    });
  });

  return tags;
}
