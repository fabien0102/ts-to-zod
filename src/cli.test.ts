import { test } from "@oclif/test";

/**
 * For the CLI tests to run, we need to run them in a Node environment with
 * the NODE_OPTIONS=--experimental-vm-modules flag. This is because Jest ships
 * with experimental support for ECMAScript Modules (ESM).
 * See: https://jestjs.io/docs/ecmascript-modules
 */
describe("CLI Tests", () => {
  describe("--help flag", () => {
    test
      .stdout()
      .command([".", "--help"])

      // --help flag works with an early exit so we need to catch it first
      // See: https://github.com/oclif/test/issues/40#issuecomment-1299565083
      .catch(/EEXIT: 0/)
      .it("should provide the right help message", (ctx) => {
        expect(ctx.stdout).toMatchInlineSnapshot(`
      "Generate Zod schemas from a Typescript file
      
      USAGE
        $ ts-to-zod  --all
        $ ts-to-zod  --config example
        $ ts-to-zod  --config example/person
        $ ts-to-zod  --config config

      ARGUMENTS
        INPUT   input file (typescript)
        OUTPUT  output file (zod schemas)
      
      FLAGS
        -a, --all                    Execute all configs
        -c, --config=<option>        Execute one config
                                     <options: example|example/person|config>
        -h, --help                   Show CLI help.
        -i, --init                   Create a ts-to-zod.config.js file
        -k, --keepComments           Keep parameters comments
        -v, --version                Show CLI version.
        -w, --watch                  Watch input file(s) for changes and re-run
                                     related task
            --inferredTypes=<value>  Path of z.infer<> types file
            --skipParseJSDoc         Skip the creation of zod validators from JSDoc
                                     annotations
            --skipValidation         Skip the validation step (not recommended)
      
      DESCRIPTION
        Generate Zod schemas from a Typescript file
      
      EXAMPLES
        $ ts-to-zod src/types.ts src/types.zod.ts

      "
      `);
      });
  });
});
