/**
 * ts-to-zod configuration.
 *
 * @type {import("./src/config").TsToZodConfig}
 */
module.exports = [
  {
    name: 'example',
    input: 'example/heros.ts',
    output: 'example/heros.zod.ts',
    inferredTypes: 'example/heros.types.ts',
    customJSDocFormatTypes: {
      date: {
        regex: '^\\d{4}-\\d{2}-\\d{2}$',
        errorMessage: 'Must be in YYYY-MM-DD format.',
      },
    },
  },
  {
    name: 'example/person',
    input: 'example/person.ts',
    output: 'example/person.zod.ts',
  },
  { name: 'config', input: 'src/config.ts', output: 'src/config.zod.ts' },
];
