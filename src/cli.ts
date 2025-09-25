import { Command, Flags, Errors, Args, type Interfaces } from "@oclif/core";
import { Listr, ListrTask } from "listr2";

import chokidar from "chokidar";
import { writeFile, readFile, rename } from "node:fs/promises";
import { existsSync } from "node:fs";
import * as prompt from "@clack/prompts";
import { join, normalize, parse, relative } from "path";
import slash from "slash";
import ts from "typescript";
import type { Config, TsToZodConfig, InputOutputMapping } from "./config.js";
import {
  getSchemaNameSchema,
  nameFilterSchema,
  tsToZodConfigSchema,
} from "./config.zod.js";
import { type GenerateProps, generate } from "./core/generate.js";
import { createConfig } from "./createConfig.js";
import {
  areImportPathsEqualIgnoringExtension,
  getImportPath,
} from "./utils/getImportPath.js";
import * as worker from "./worker/index.js";

let config: TsToZodConfig | undefined;
let haveMultiConfig = false;
const configKeys: string[] = [];

// eslint-disable-next-line prefer-const
let { tsToZodConfigFileName, configPath, hasConfigFile } = findConfigFile();

// Propose migration if the config is with .js instead of .mjs/.cjs
if (configPath.endsWith(".js")) {
  const format = await prompt.select({
    message: `Your config file is using .js and need to be updated.\nWhat format do you prefer?`,
    options: [
      { label: "Transform to esm (.mjs)", value: "mjs" },
      { label: "Transform to cjs (.cjs)", value: "cjs" },
    ],
  });
  if (prompt.isCancel(format)) {
    prompt.cancel("Operation cancelled");
    process.exit(0);
  }
  const newConfigPath = configPath.replace(/.js$/, `.${format}`);
  const newTsToZodConfigFileName = tsToZodConfigFileName.replace(
    /.js$/,
    `.${format}`
  );
  await rename(configPath, newConfigPath);
  prompt.log.success(
    `${tsToZodConfigFileName} has been renamed to ${newTsToZodConfigFileName}`
  );
  configPath = newConfigPath;
  tsToZodConfigFileName = newTsToZodConfigFileName;

  if (format === "mjs") {
    const oldConfig = await readFile(configPath, "utf-8");
    await writeFile(
      configPath,
      oldConfig.replace(/module\.exports =/, "export default")
    );
    prompt.log.success(`${tsToZodConfigFileName} has been converted to esm`);
  }
}

try {
  // Try to load `ts-to-zod.config.(mjs|cjs)`
  // We are doing this here to be able to infer the `flags` & `usage` in the cli help
  if (hasConfigFile) {
    const rawConfig = await import(
      slash(relative(import.meta.dirname, configPath))
    );
    config = tsToZodConfigSchema.parse(rawConfig.default);
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

  static examples: Command.Example[] = [
    `$ ts-to-zod src/types.ts src/types.zod.ts`,
  ];

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
    const tasks = new Listr<void>([]);

    if (Array.isArray(fileConfig)) {
      if (args.input || args.output) {
        this.error(`INPUT and OUTPUT arguments are not compatible with --all`);
      }
      tasks.add(
        fileConfig.map((config) => ({
          title: `Generate "${config.name}"`,
          task: async (_, task) =>
            task.newListr(this.generate(args, config, flags, ioMappings), {
              rendererOptions: {
                collapseSubtasks: false,
              },
            }),
        }))
      );
    } else {
      tasks.add(this.generate(args, fileConfig, flags, ioMappings));
    }
    try {
      await tasks.run();
      this.log("🎉 Zod schemas generated!");
    } catch (e) {
      const error =
        typeof e === "string" || e instanceof Error ? e : JSON.stringify(e);
      this.error(error);
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

        const tasks = new Listr(this.generate(args, config, flags, ioMappings));
        try {
          await tasks.run();
          this.log("🎉 Zod schemas generated!");
        } catch (e) {
          const error =
            typeof e === "string" || e instanceof Error ? e : JSON.stringify(e);
          this.error(error);
        }

        this.log("\nWatching for changes…");
      });
    }
  }

  /**
   * Generate a list of tasks.
   * @param args
   * @param fileConfig
   * @param Flags
   * @param inputOutputMappings
   */
  generate(
    args: { input?: string; output?: string },
    fileConfig: Config | undefined,
    Flags: Interfaces.InferredFlags<typeof TsToZod.flags>,
    inputOutputMappings: InputOutputMapping[]
  ): ListrTask[] {
    type ListrContext = {
      generateOptions?: GenerateProps;
      generatedOutput?: ReturnType<typeof generate>;
    };

    const input = args.input || fileConfig?.input;
    const output = args.output || fileConfig?.output;

    if (!input) {
      throw new Error(`Missing 1 required arg:
${TsToZod.args.input.description}
See more help with --help`);
    }

    const inputPath = join(process.cwd(), input);
    const outputPath = join(process.cwd(), output || input);

    const generateZodSchemasTask: ListrTask<ListrContext> = {
      title: "Generate zod schemas",
      task: async (ctx) => {
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
          !hasExtensions(output, [
            ...typescriptExtensions,
            ...javascriptExtensions,
          ])
        ) {
          extErrors.push({
            path: output,
            expectedExtensions: [
              ...typescriptExtensions,
              ...javascriptExtensions,
            ],
          });
        }

        if (extErrors.length) {
          throw new Error(
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

        const sourceText = await readFile(inputPath, "utf-8");

        const relativeIOMappings = inputOutputMappings.map((io) => {
          const relativeInput = getImportPath(inputPath, io.input);
          const relativeOutput = getImportPath(outputPath, io.output);

          return {
            input: relativeInput,
            output: relativeOutput,
            getSchemaName: io.getSchemaName,
          };
        });

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

        ctx.generateOptions = generateOptions;
        ctx.generatedOutput = generate(generateOptions);

        if (ctx.generatedOutput.hasCircularDependencies && !output) {
          throw new Error(
            "--output= must also be provided when input files have some circular dependencies"
          );
        }
      },
    };

    const validationTask: ListrTask<ListrContext> = {
      title: "Validate generated types",
      task: async (ctx) => {
        if (!ctx.generateOptions || !ctx.generatedOutput) {
          throw new Error(
            "Validation can only be perform after the generation"
          );
        }

        const { skipParseJSDoc } = ctx.generateOptions;
        const {
          transformedSourceText,
          getIntegrationTestFile,
          getZodSchemasFile,
        } = ctx.generatedOutput;

        const extraFiles = [];
        for (const io of inputOutputMappings) {
          if (getImportPath(inputPath, io.input) !== "/") {
            try {
              const fileInputPath = join(process.cwd(), io.input);
              const inputFile = await readFile(fileInputPath, "utf-8");
              extraFiles.push({
                sourceText: inputFile,
                relativePath: io.input,
              });
            } catch {
              throw new Error(`File "${io.input}" not found`);
            }

            try {
              const fileOutputPath = join(process.cwd(), io.output);
              const outputFile = await readFile(fileOutputPath, "utf-8");
              extraFiles.push({
                sourceText: outputFile,
                relativePath: io.output,
              });
            } catch {
              throw new Error(
                `File "${io.output}" not found: maybe it hasn't been generated yet?`
              );
            }
          }
        }

        let outputForValidation = output || "";

        // If we're generating over the same file, we need to set a fake output path for validation
        if (!output || areImportPathsEqualIgnoringExtension(input, output)) {
          const outputFileName = "source.zod.ts";
          const { dir } = parse(normalize(input));

          outputForValidation = join(dir, outputFileName);
        }

        const generationErrors = await worker.validateGeneratedTypesInWorker({
          sourceTypes: {
            sourceText: transformedSourceText,
            relativePath: input,
          },
          integrationTests: {
            sourceText: getIntegrationTestFile(
              getImportPath("./source.integration.ts", input),
              getImportPath("./source.integration.ts", outputForValidation)
            ),
            relativePath: "./source.integration.ts",
          },
          zodSchemas: {
            sourceText: getZodSchemasFile(
              getImportPath(outputForValidation, input)
            ),
            relativePath: outputForValidation,
          },
          skipParseJSDoc: Boolean(skipParseJSDoc),
          extraFiles,
        });

        if (generationErrors.length > 0) {
          throw new Error(generationErrors.join("\n"));
        }
      },
      enabled: !Flags.skipValidation,
    };

    const writingFilesTask: ListrTask<ListrContext> = {
      title: "Write files",
      task: async (ctx, task) => {
        if (!ctx.generateOptions || !ctx.generatedOutput) {
          throw new Error(
            "Writing files can only be perform after the generation"
          );
        }

        const { inferredTypes } = ctx.generateOptions;
        const { getZodSchemasFile, getInferredTypes } = ctx.generatedOutput;

        const subtasks = task.newListr([], {
          rendererOptions: {
            collapseSubtasks: false,
          },
        });

        const zodSchemasFile = getZodSchemasFile(
          getImportPath(outputPath, inputPath)
        );

        if (inferredTypes) {
          subtasks.add({
            title: `Write ${relative(process.cwd(), inferredTypes)}`,
            task: async () => {
              const zodInferredTypesFile = getInferredTypes(
                getImportPath(inferredTypes, outputPath)
              );
              await writeFile(
                inferredTypes,
                hasExtensions(inferredTypes, javascriptExtensions)
                  ? ts.transpileModule(zodInferredTypesFile, {
                      compilerOptions: {
                        target: ts.ScriptTarget.Latest,
                        module: ts.ModuleKind.ESNext,
                        newLine: ts.NewLineKind.LineFeed,
                      },
                    }).outputText
                  : zodInferredTypesFile,

                "utf-8"
              );
            },
          });
        }

        subtasks.add({
          title: `Write ${relative(process.cwd(), outputPath)}`,
          task: async () => {
            if (output && hasExtensions(output, javascriptExtensions)) {
              await writeFile(
                outputPath,
                ts.transpileModule(zodSchemasFile, {
                  compilerOptions: {
                    target: ts.ScriptTarget.Latest,
                    module: ts.ModuleKind.ESNext,
                    newLine: ts.NewLineKind.LineFeed,
                  },
                }).outputText,
                "utf-8"
              );
            } else {
              await writeFile(outputPath, zodSchemasFile, "utf-8");
            }
          },
        });

        return subtasks;
      },
    };

    return [generateZodSchemasTask, validationTask, writingFilesTask];
  }

  /**
   * Load user config from `ts-to-zod.config.mjs`
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
        const mode = await prompt.select({
          message: `You have multiple configs available in "${tsToZodConfigFileName}"\n What do you want?`,
          options: [
            {
              label: `${TsToZod.flags.all.description} (--all)`,
              value: "multi",
            },
            ...configKeys.map((key) => ({
              value: `single-${key}` as const,
              label: `Execute "${key}" config (--config=${key})`,
            })),
            { value: "none", label: "Don't use the config" },
          ],
        });

        if (prompt.isCancel(mode)) {
          this.error("Mode selection cancelled");
        }

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

function findConfigFile() {
  for (const ext of ["mjs", "cjs", "js"] as const) {
    const tsToZodConfigFileName = `ts-to-zod.config.${ext}`;
    const configPath = join(process.cwd(), tsToZodConfigFileName);
    if (existsSync(configPath)) {
      return { tsToZodConfigFileName, configPath, hasConfigFile: true };
    }
  }

  return {
    tsToZodConfigFileName: `ts-to-zod.config.mjs`,
    configPath: join(process.cwd(), `ts-to-zod.config.mjs`),
    hasConfigFile: false,
  };
}

export default TsToZod;
