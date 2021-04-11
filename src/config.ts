export type GetSchemaName = (identifier: string) => string;
export type NameFilter = (name: string) => boolean;

export type Config = {
  /**
   * Path of the input file (types source)
   */
  input?: string;

  /**
   * Path of the output file (generated zod schemas)
   */
  output?: string;

  /**
   * Skip the validation step (not recommended)
   */
  skipValidation?: boolean;

  /**
   * Max iteration number to resolve the declaration order.
   */
  maxRun?: number;

  /**
   * Filter function on type/interface name.
   */
  nameFilter?: NameFilter;

  /**
   * Schema name generator.
   */
  getSchemaName?: GetSchemaName;

  /**
   * Keep parameters comments.
   * @default false
   */
  keepComments?: boolean;
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
