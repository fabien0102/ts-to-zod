export declare type Config = {
  /**
   * Path of the input file (types source)
   */
  input?: string;

  /**
   * Path of the output file (generated zod schemas)
   */
  output?: string;

  /**
   * Path of the types integration tests
   */
  tests?: string;
  /**
   * Max iteration number to resolve the declaration order.
   */
  maxRun?: number;

  /**
   * Filter function on type/interface name.
   */
  nameFilter?: (name: string) => boolean;

  /**
   * Schema name generator.
   */
  getSchemaName?: (identifier: string) => string;

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
