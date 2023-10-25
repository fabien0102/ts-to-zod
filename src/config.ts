export interface SimplifiedJSDocTag {
  /**
   * Name of the tag
   *
   * @ref tag.tagName.escapedText.toString()
   */
  name: string;

  /**
   * Value of the tag
   *
   * @ref tag.comment
   */
  value?: string;
}

export type GetSchemaName = (identifier: string) => string;
export type NameFilter = (name: string) => boolean;
export type JSDocTagFilter = (tags: SimplifiedJSDocTag[]) => boolean;

/**
 * @example
 *  {
 *    regex: "^\\d{4}-\\d{2}-\\d{2}$",
 *    errorMessage: "Must be in YYYY-MM-DD format."
 *  }
 */
export type CustomJSDocFormatTypeAttributes = {
  regex: string;
  errorMessage?: string;
};

export type CustomJSDocFormatType = string;

/**
 * @example
 *  {
 *    "phone-number": "^\\d{3}-\\d{3}-\\d{4}$",
 *    date: {
 *      regex: "^\\d{4}-\\d{2}-\\d{2}$",
 *      errorMessage: "Must be in YYYY-MM-DD format."
 *    }
 * }
 */
export type CustomJSDocFormatTypes = Record<
  CustomJSDocFormatType,
  string | CustomJSDocFormatTypeAttributes
>;

export type Config = {
  /**
   * Path of the input file (types source)
   */
  input: string;

  /**
   * Path of the output file (generated zod schemas)
   */
  output: string;

  /**
   * Skip the validation step (not recommended)
   */
  skipValidation?: boolean;

  /**
   * Filter on type/interface name.
   */
  nameFilter?: NameFilter;

  /**
   * Filter on JSDocTag.
   */
  jsDocTagFilter?: JSDocTagFilter;

  /**
   * Schema name generator.
   */
  getSchemaName?: GetSchemaName;

  /**
   * Keep parameters comments.
   * @default false
   */
  keepComments?: boolean;

  /**
   * Skip the creation of zod validators from JSDoc annotations
   *
   * @default false
   */
  skipParseJSDoc?: boolean;

  /**
   * Path of z.infer<> types file.
   */
  inferredTypes?: string;

  /**
   * A record of custom `@format` types with their corresponding regex patterns.
   */
  customJSDocFormats?: CustomJSDocFormatTypes;
};

export type Configs = Array<
  Config & {
    /**
     * Name of the config.
     *
     * Usage: `ts-to-zod --config {name}`
     */
    name: string;
  }
>;

export type TsToZodConfig = Config | Configs;
