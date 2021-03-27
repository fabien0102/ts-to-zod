import { Command, flags } from "@oclif/command";
import { readFileSync, outputFileSync } from "fs-extra";
import { join, relative, parse } from "path";
import slash from "slash";
import { generate } from "./core/generate";

class TsToZod extends Command {
  static description = "Generate Zod schemas from a Typescript file";

  static flags = {
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    tests: flags.string({
      char: "t",
      description: "generate integration tests",
    }),
    maxRun: flags.integer({
      hidden: true,
      default: 10,
      description: "max iteration number to resolve the declaration order",
    }),
  };

  static args = [
    { name: "input", description: "input file (typescript)", required: true },
    {
      name: "output",
      description: "output file (zod schemas)",
      required: true,
    },
  ];

  async run() {
    const { args, flags } = this.parse(TsToZod);
    const inputPath = join(process.cwd(), args.input);
    const outputPath = join(process.cwd(), args.output);

    // Check args/flags file extensions
    const extErrors = [args.input, args.output, flags.tests].reduce<string[]>(
      (errors, path) => {
        if (path && !hasTypescriptExtension(path)) {
          return [...errors, path];
        }
        return errors;
      },
      []
    );
    if (extErrors.length) {
      this.error(
        `Unexpected file format:\n${extErrors
          .map((path) => `"${path}" need to have .ts or .tsx extension`)
          .join("\n")}`
      );
    }

    const sourceText = readFileSync(inputPath, "utf-8");

    const { errors, getZodSchemasFile, getIntegrationTestFile } = generate({
      sourceText,
      maxRun: flags.maxRun,
    });

    errors.map(this.warn);

    outputFileSync(
      outputPath,
      getZodSchemasFile(getImportPath(outputPath, inputPath))
    );
    this.log(`🎉 Zod schemas generated!`);

    if (flags.tests) {
      const testsPath = join(process.cwd(), flags.tests);
      outputFileSync(
        testsPath,
        getIntegrationTestFile(
          getImportPath(testsPath, inputPath),
          getImportPath(testsPath, outputPath)
        )
      );
      this.log(`🤓 Integration tests generated!`);
    }
  }
}

/**
 * Resolve the path of an import.
 *
 * @param from path of the current file
 * @param to path of the import file
 * @returns relative path without extension
 */
function getImportPath(from: string, to: string) {
  const relativePath = slash(relative(from, to).slice(1));
  const { dir, name } = parse(relativePath);

  return `${dir}/${name}`;
}

/**
 * Validate if the file extension is ts or tsx.
 *
 * @param path relative path
 * @returns true if the extension is valid
 */
function hasTypescriptExtension(path: string) {
  const { ext } = parse(path);
  return [".ts", ".tsx"].includes(ext);
}

export = TsToZod;
