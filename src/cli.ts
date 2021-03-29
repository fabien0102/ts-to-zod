import { Command, flags } from "@oclif/command";
import { readFileSync, outputFileSync, existsSync } from "fs-extra";
import { join, relative, parse } from "path";
import slash from "slash";
import ts from "typescript";
import { generate } from "./core/generate";
import { z } from "zod";

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
      required: false,
    },
  ];

  async run() {
    const { args, flags } = this.parse(TsToZod);
    const inputPath = join(process.cwd(), args.input);
    const outputPath = join(process.cwd(), args.output || args.input);

    // Check args/flags file extensions
    const extErrors: { path: string; expectedExtensions: string[] }[] = [];
    if (!hasExtensions(args.input, typescriptExtensions)) {
      extErrors.push({
        path: args.input,
        expectedExtensions: typescriptExtensions,
      });
    }
    if (
      args.output &&
      !hasExtensions(args.output, [
        ...typescriptExtensions,
        ...javascriptExtensions,
      ])
    ) {
      extErrors.push({
        path: args.output,
        expectedExtensions: [...typescriptExtensions, ...javascriptExtensions],
      });
    }
    if (flags.tests && !hasExtensions(flags.tests, typescriptExtensions)) {
      extErrors.push({
        path: flags.tests,
        expectedExtensions: typescriptExtensions,
      });
    }

    if (extErrors.length) {
      this.error(
        `Unexpected file extension:\n${extErrors
          .map(
            ({ path, expectedExtensions }) =>
              `"${path}" must be ${expectedExtensions
                .map((i) => `"${i}"`)
                .join(", ")}`
          )
          .join("\n")}`
      );
    }

    const sourceText = readFileSync(inputPath, "utf-8");

    const userConfig = loadUserConfig();

    const {
      errors,
      getZodSchemasFile,
      getIntegrationTestFile,
      hasCircularDependencies,
    } = generate({
      sourceText,
      maxRun: flags.maxRun,
      ...userConfig,
    });

    if (hasCircularDependencies && !args.output) {
      this.error(
        "--output= must also be provided when input file have some circular dependencies"
      );
    }

    errors.map(this.warn);

    const zodSchemasFile = getZodSchemasFile(
      getImportPath(outputPath, inputPath)
    );

    if (args.output && hasExtensions(args.output, javascriptExtensions)) {
      outputFileSync(
        outputPath,
        ts.transpileModule(zodSchemasFile, {
          compilerOptions: {
            target: ts.ScriptTarget.Latest,
            module: ts.ModuleKind.ESNext,
            newLine: ts.NewLineKind.LineFeed,
          },
        }).outputText
      );
    } else {
      outputFileSync(outputPath, zodSchemasFile);
    }
    this.log(`🎉 Zod schemas generated!`);

    if (flags.tests) {
      if (!args.output) {
        this.error("output must also be provided when using --tests=");
      }
      if (hasExtensions(args.output, javascriptExtensions)) {
        this.error(
          "Javascript format for --output is not compatible with --tests"
        );
      }
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

const typescriptExtensions = [".ts", ".tsx"];
const javascriptExtensions = [".js", ".jsx"];

/**
 * Validate if the file extension is ts or tsx.
 *
 * @param path relative path
 * @param extensions list of allowed extensions
 * @returns true if the extension is valid
 */
function hasExtensions(path: string, extensions: string[]) {
  const { ext } = parse(path);
  return extensions.includes(ext);
}

/**
 * Load user config from `ts-to-zod.config.js`
 */
function loadUserConfig() {
  const configPath = join(process.cwd(), "ts-to-zod.config.js");
  if (existsSync(configPath)) {
    const config = require(slash(relative(__dirname, configPath)));
    const parsedConfig = configSchema.strict().parse(config);

    return {
      ...parsedConfig,
      getSchemaName: parsedConfig.getSchemaName
        ? getSchemaNameSchema.implement(parsedConfig.getSchemaName)
        : undefined,
      nameFilter: parsedConfig.nameFilter
        ? nameFilterSchema.implement(parsedConfig.nameFilter)
        : undefined,
    };
  }
}

/**
 * Zod schemas to validate the user configuration
 */
const getSchemaNameSchema = z.function().args(z.string()).returns(z.string());
const nameFilterSchema = z.function().args(z.string()).returns(z.boolean());
const configSchema = z
  .object({
    maxRun: z.number(),
    nameFilter: nameFilterSchema,
    getSchemaName: getSchemaNameSchema,
  })
  .partial();

export = TsToZod;
