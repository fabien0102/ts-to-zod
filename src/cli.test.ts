import { runCommand } from "@oclif/test";
import fs from "fs";
import { sep, posix, join } from "path";

/**
 * For the CLI tests to run, we need to run them in a Node environment with
 * the NODE_OPTIONS=--experimental-vm-modules flag. This is because Jest ships
 * with experimental support for ECMAScript Modules (ESM).
 * See: https://jestjs.io/docs/ecmascript-modules
 */

describe("Oclif-provided Flags Tests", () => {
  describe("--help flag", () => {
    it("should provide the right help message", async () => {
      const { stdout } = await runCommand([".", "--help"]);

      expect(stdout).toMatchInlineSnapshot(`
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

// describe("Ts-to-zod flags Tests", () => {});
// describe("EXIT codes Tests", () => {});

describe("Config Prompt Tests", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stdin: any;
  beforeEach(() => {
    stdin = require("mock-stdin").stdin();
  });
  describe("Skip config prompt", () => {
    it("should have selected the right option and generated the file not in the config", async () => {
      const basicInputPath = makePosixPath("src/cli/fixtures/basic/input.ts");
      const basicSnapshotPath = makePosixPath(
        "src/cli/fixtures/basic/output.zod.snapshot.ts"
      );
      const basicOutputPath = makePosixPath(
        "src/cli/fixtures/basic/output.zod.ts"
      );

      // Up Arrow key code \u001B[A + ENTER key code \n with a delay of 2000ms
      setTimeout(() => stdin.send("\u001B[A\n"), 2000);

      const { stdout, stderr } = await runCommand([
        ".",
        basicInputPath,
        basicOutputPath,
      ]);

      expect(
        replaceAngleBracket(normalizeLineEndings(stdout))
      ).toMatchSnapshot();

      // Ora spinner outputs to stderr by default, we
      expect(stderr).toContain("- Validating generated types");
      expect(stderr).toContain("✔ Validating generated types");

      expect(readFileCrossEnv(basicOutputPath)).toEqual(
        readFileCrossEnv(basicSnapshotPath)
      );

      removeFile(basicOutputPath);
    });
  });
  afterEach(() => {
    stdin.restore();
  });
});

function removeFile(filePath: string) {
  fs.unlinkSync(filePath);
}

function makePosixPath(str: string) {
  return str.split(sep).join(posix.sep);
}

function normalizeLineEndings(content: string) {
  return content.replace(/\r\n/g, "\n"); // Replace Windows (\r\n) with Unix (\n)
}

/**
 * Angle brackets from inquirer prompts are not the same in Windows & Unix
 * This function replaces them with a consistent character
 */
function replaceAngleBracket(content: string) {
  return content.replace(/>/g, "❯");
}

/**
 * Gets the string content of a file and normalizes a few things to make it comparable to snapshots
 */
function readFileCrossEnv(path: string) {
  return replaceAngleBracket(
    normalizeLineEndings(fs.readFileSync(path, "utf-8").toString())
  );
}
