import { Command, Flags, Errors, Args, Interfaces } from "@oclif/core";
import chokidar from "chokidar";
import { existsSync, outputFile, readFile } from "fs-extra";
import inquirer from "inquirer";
import ora from "ora";
import { join, parse, relative } from "path";
import prettier from "prettier";
import slash from "slash";
import ts from "typescript";
import { Config, TsToZodConfig, InputOutputMapping } from "./config";
import {
  getSchemaNameSchema,
  nameFilterSchema,
  tsToZodConfigSchema,
} from "./config.zod";
import { GenerateProps, generate } from "./core/generate";
import { createConfig } from "./createConfig";
import { getImportPath } from "./utils/getImportPath";
import * as worker from "./worker";

let config: TsToZodConfig | undefined;
let haveMultiConfig = false;
const configKeys: string[] = [];

function isEsm() {
  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const rawPackageJson = require(slash(relative(__dirname, packageJsonPath)));
    return rawPackageJson.type === "module";
  } catch (e) {}
  return false;
}

// Try to load `ts-to-zod.config.c?js`
// We are doing this here to be able to infer the `flags` & `usage` in the cli help
const fileExtension = isEsm() ? "cjs" : "js";
const tsToZodConfigFileName = `ts-to-zod.config.${fileExtension}`;
const configPath = join(process.cwd(), tsToZodConfigFileName);
try {
  if (existsSync(configPath)) {
    const rawConfig = require(slash(relative(__dirname, configPath)));
    config = tsToZodConfigSchema.parse(rawConfig);
    if (Array.isArray(config)) {
      haveMultiConfig = true;
      configKeys.push(...config.map((c) => c.name));
    }
  }
} catch (e) {
  if (e instanceof Error) {
    Errors.error(
      `"${tsToZodConfigFileName}" invalid:
    ${e.message}
  
    Please fix the invalid configuration
    You can generate a new config with --init`,
      { exit: false }
    );
  }
  process.exit(2);
}

class TsToZod extends Command {
  static description = "Generate Zod schemas from a Typescript file";

  static usage = haveMultiConfig
    ? [
        "--all",
        ...configKeys.map(
          (key) => `--config ${key.includes(" ") ? `"${key}"` : key}`
        ),
      ]
    : undefined;

  static flags = {
    version: Flags.version({ char: "v" }),
    help: Flags.help({ char: "h" }),
    keepComments: Flags.boolean({
      char: "k",
      description: "Keep parameters comments",
    }),
    init: Flags.boolean({
      char: "i",
      description: `Create a ${tsToZodConfigFileName} file`,
    }),
    skipParseJSDoc: Flags.boolean({
      default: false,
      description: "Skip the creation of zod validators from JSDoc annotations",
    }),
    skipValidation: Flags.boolean({
      default: false,
      description: "Skip the validation step (not recommended)",
    }),
    inferredTypes: Flags.string({
      description: "Path of z.infer<> types file",
    }),
    watch: Flags.boolean({
      char: "w",
      default: false,
      description: "Watch input file(s) for changes and re-run related task",
    }),
    // -- Multi config flags --
    config: Flags.string({
      char: "c",
      options: configKeys,
      description: "Execute one config",
      hidden: !haveMultiConfig,
    }),
    all: Flags.boolean({
      char: "a",
      default: false,
      description: "Execute all configs",
      hidden: !haveMultiConfig,
    }),
  };

  static args = {
    input: Args.file({
      description: "input file (typescript)",
    }),
    output: Args.file({
      description: "output file (zod schemas)",
    }),
  };

  async run() {
    const { args, flags } = await this.parse(TsToZod);
    if (flags.init) {
      (await createConfig(configPath, tsToZodConfigFileName))
        ? this.log(`🧐 ${tsToZodConfigFileName} created!`)
        : this.log(`Nothing changed!`);
      return;
    }

    const fileConfig = await this.loadFileConfig(config, flags);

    const ioMappings = getInputOutputMappings(config);

    if (Array.isArray(fileConfig)) {
      if (args.input || args.output) {
        this.error(`INPUT and OUTPUT arguments are not compatible with --all`);
      }
      try {
        await Promise.all(
          fileConfig.map(async (config) => {
            this.log(`Generating "${config.name}"`);
            const result = await this.generate(args, config, flags, ioMappings);
            if (result.success) {
              this.log(` 🎉 Zod schemas generated!`);
            } else {
              this.error(result.error, { exit: false });
            }
            this.log(); // empty line between configs
          })
        );
      } catch (e) {
        const error =
          typeof e === "string" || e instanceof Error ? e : JSON.stringify(e);
        this.error(error);
      }
    } else {
      const result = await this.generate(args, fileConfig, flags, ioMappings);
      if (result.success) {
        this.log(`🎉 Zod schemas generated!`);
      } else {
        this.error(result.error);
      }
    }

    if (flags.watch) {
      const inputs = Array.isArray(fileConfig)
        ? fileConfig.map((i) => i.input)
        : fileConfig?.input || args.input || [];

      this.log("\nWatching for changes…");
      chokidar.watch(inputs).on("change", async (path) => {
        console.clear();
        this.log(`Changes detected in "${slash(path)}"`);
        const config = Array.isArray(fileConfig)
          ? fileConfig.find((i) => i.input === slash(path))
          : fileConfig;

        const result = await this.generate(args, config, flags, ioMappings);
        if (result.success) {
          this.log(`🎉 Zod schemas generated!`);
        } else {
          this.error(result.error);
        }
        this.log("\nWatching for changes…");
      });
    }
  }

  /**
   * Generate on zod schema file.
   * @param args
   * @param fileConfig
   * @param Flags
   * @param inputOutputMappings
   */
  async generate(
    args: { input?: string; output?: string },
    fileConfig: Config | undefined,
    Flags: Interfaces.InferredFlags<typeof TsToZod.flags>,
    inputOutputMappings: InputOutputMapping[]
  ): Promise<{ success: true } | { success: false; error: string }> {
    const input = args.input || fileConfig?.input;
    const output = args.output || fileConfig?.output;

    if (!input) {
      return {
        success: false,
        error: `Missing 1 required arg:
${TsToZod.args.input.description}
See more help with --help`,
      };
    }

    const inputPath = join(process.cwd(), input);
    const outputPath = join(process.cwd(), output || input);

    const relativeIOMappings = inputOutputMappings.map((io) => {
      const relativeInput = getImportPath(inputPath, io.input);
      const relativeOutput = getImportPath(outputPath, io.output);

      return {
        input: relativeInput,
        output: relativeOutput,
        getSchemaName: io.getSchemaName,
      };
    });

    // Check args/flags file extensions
    const extErrors: { path: string; expectedExtensions: string[] }[] = [];
    if (!hasExtensions(input, typescriptExtensions)) {
      extErrors.push({
        path: input,
        expectedExtensions: typescriptExtensions,
      });
    }
    if (
      output &&
      !hasExtensions(output, [...typescriptExtensions, ...javascriptExtensions])
    ) {
      extErrors.push({
        path: output,
        expectedExtensions: [...typescriptExtensions, ...javascriptExtensions],
      });
    }

    if (extErrors.length) {
      return {
        success: false,
        error: `Unexpected file extension:\n${extErrors
          .map(
            ({ path, expectedExtensions }) =>
              `"${path}" must be ${expectedExtensions
                .map((i) => `"${i}"`)
                .join(", ")}`
          )
          .join("\n")}`,
      };
    }

    const sourceText = await readFile(inputPath, "utf-8");

    const generateOptions: GenerateProps = {
      sourceText,
      inputOutputMappings: relativeIOMappings,
      ...fileConfig,
    };
    if (typeof Flags.keepComments === "boolean") {
      generateOptions.keepComments = Flags.keepComments;
    }
    if (typeof Flags.skipParseJSDoc === "boolean") {
      generateOptions.skipParseJSDoc = Flags.skipParseJSDoc;
    }
    if (typeof Flags.inferredTypes === "string") {
      generateOptions.inferredTypes = Flags.inferredTypes;
    }

    const {
      errors,
      transformedSourceText,
      getZodSchemasFile,
      getIntegrationTestFile,
      getInferredTypes,
      hasCircularDependencies,
    } = generate(generateOptions);

    if (hasCircularDependencies && !output) {
      return {
        success: false,
        error:
          "--output= must also be provided when input files have some circular dependencies",
      };
    }

    errors.map(this.warn.bind(this));

    if (!Flags.skipValidation) {
      const validatorSpinner = ora("Validating generated types").start();
      if (Flags.all) validatorSpinner.indent = 1;

      const extraFiles = [];
      for (const io of inputOutputMappings) {
        if (getImportPath(inputPath, io.input) !== "/") {
          try {
            const fileInputPath = join(process.cwd(), io.input);
            const inputFile = await readFile(fileInputPath, "utf-8");
            extraFiles.push({
              sourceText: inputFile,
              relativePath: getImportPath(inputPath, io.input) + ".ts",
            });
          } catch {
            validatorSpinner.warn(`File "${io.input}" not found`);
          }

          try {
            const fileOutputPath = join(process.cwd(), io.output);
            const outputFile = await readFile(fileOutputPath, "utf-8");
            extraFiles.push({
              sourceText: outputFile,
              relativePath: getImportPath(outputPath, io.output) + ".ts",
            });
          } catch {
            validatorSpinner.warn(
              `File "${io.output}" not found: maybe it hasn't been validated yet?`
            );
          }
        }
      }

      const generationErrors = await worker.validateGeneratedTypesInWorker({
        sourceTypes: {
          sourceText: transformedSourceText,
          relativePath: "./source.ts",
        },
        integrationTests: {
          sourceText: getIntegrationTestFile("./source", "./source.zod"),
          relativePath: "./source.integration.ts",
        },
        zodSchemas: {
          sourceText: getZodSchemasFile("./source"),
          relativePath: "./source.zod.ts",
        },
        skipParseJSDoc: Boolean(generateOptions.skipParseJSDoc),
        extraFiles,
      });

      generationErrors.length
        ? validatorSpinner.fail()
        : validatorSpinner.succeed();

      if (generationErrors.length > 0) {
        return {
          success: false,
          error: generationErrors.join("\n"),
        };
      }
    }

    const zodSchemasFile = getZodSchemasFile(
      getImportPath(outputPath, inputPath)
    );

    const prettierConfig = await prettier.resolveConfig(process.cwd());

    if (generateOptions.inferredTypes) {
      const zodInferredTypesFile = getInferredTypes(
        getImportPath(generateOptions.inferredTypes, outputPath)
      );
      await outputFile(
        generateOptions.inferredTypes,
        await prettier.format(
          hasExtensions(generateOptions.inferredTypes, javascriptExtensions)
            ? ts.transpileModule(zodInferredTypesFile, {
                compilerOptions: {
                  target: ts.ScriptTarget.Latest,
                  module: ts.ModuleKind.ESNext,
                  newLine: ts.NewLineKind.LineFeed,
                },
              }).outputText
            : zodInferredTypesFile,
          { parser: "babel-ts", ...prettierConfig }
        )
      );
    }

    if (output && hasExtensions(output, javascriptExtensions)) {
      await outputFile(
        outputPath,
        await prettier.format(
          ts.transpileModule(zodSchemasFile, {
            compilerOptions: {
              target: ts.ScriptTarget.Latest,
              module: ts.ModuleKind.ESNext,
              newLine: ts.NewLineKind.LineFeed,
            },
          }).outputText,
          { parser: "babel-ts", ...prettierConfig }
        )
      );
    } else {
      await outputFile(
        outputPath,
        await prettier.format(zodSchemasFile, {
          parser: "babel-ts",
          ...prettierConfig,
        })
      );
    }
    return { success: true };
  }

  /**
   * Load user config from `ts-to-zod.config.c?js`
   */
  async loadFileConfig(
    config: TsToZodConfig | undefined,
    flags: Interfaces.InferredFlags<typeof TsToZod.flags>
  ): Promise<TsToZodConfig | undefined> {
    if (!config) {
      return undefined;
    }
    if (Array.isArray(config)) {
      if (!flags.all && !flags.config) {
        const { mode } = await inquirer.prompt<{
          mode: "none" | "multi" | `single-${string}`;
        }>([
          {
            name: "mode",
            message: `You have multiple configs available in "${tsToZodConfigFileName}"\n What do you want?`,
            type: "list",
            choices: [
              {
                value: "multi",
                name: `${TsToZod.flags.all.description} (--all)`,
              },
              ...configKeys.map((key) => ({
                value: `single-${key}`,
                name: `Execute "${key}" config (--config=${key})`,
              })),
              { value: "none", name: "Don't use the config" },
            ],
          },
        ]);
        if (mode.startsWith("single-")) {
          flags.config = mode.slice("single-".length);
        } else if (mode === "multi") {
          flags.all = true;
        }
      }
      if (flags.all) {
        return config;
      }
      if (flags.config) {
        const selectedConfig = config.find((c) => c.name === flags.config);
        if (!selectedConfig) {
          this.error(`${flags.config} configuration not found!`);
        }
        return selectedConfig;
      }
      return undefined;
    }

    return {
      ...config,
      getSchemaName: config.getSchemaName
        ? getSchemaNameSchema.implement(config.getSchemaName)
        : undefined,
      nameFilter: config.nameFilter
        ? nameFilterSchema.implement(config.nameFilter)
        : undefined,
    };
  }
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

function getInputOutputMappings(
  config: TsToZodConfig | undefined
): InputOutputMapping[] {
  if (!config) {
    return [];
  }

  if (Array.isArray(config)) {
    return config.map((c) => {
      const { input, output, getSchemaName } = c;
      return { input, output, getSchemaName };
    });
  }

  const { input, output, getSchemaName } = config as Config;
  return [{ input, output, getSchemaName }];
}

export = TsToZod;
