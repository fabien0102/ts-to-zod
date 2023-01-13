import { Command, flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser";
import { error as oclifError } from "@oclif/errors";
import { readFile, outputFile, existsSync } from "fs-extra";
import { join, relative, parse } from "path";
import slash from "slash";
import ts from "typescript";
import { generate, GenerateProps } from "./core/generate";
import { TsToZodConfig, Config, MaybeConfig } from "./config";
import {
  tsToZodConfigSchema,
  getSchemaNameSchema,
  nameFilterSchema,
} from "./config.zod";
import { getImportPath } from "./utils/getImportPath";
import ora from "ora";
import prettier from "prettier";
import * as worker from "./worker";
import inquirer from "inquirer";
import { eachSeries } from "async";
import { createConfig } from "./createConfig";
import chokidar from "chokidar";

// Try to load `ts-to-zod.config.js`
// We are doing this here to be able to infer the `flags` & `usage` in the cli help
const tsToZodConfigJs = "ts-to-zod.config.js";
const configPath = join(process.cwd(), tsToZodConfigJs);
let config: TsToZodConfig | undefined;
let haveMultiConfig = false;
const configKeys: string[] = [];

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
    oclifError(
      `"${tsToZodConfigJs}" invalid:
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
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    maxRun: flags.integer({
      hidden: true,
      default: 10,
      description: "max iteration number to resolve the declaration order",
    }),
    keepComments: flags.boolean({
      char: "k",
      description: "Keep parameters comments",
    }),
    maybeOptional: flags.boolean({
      description:
        "treat Maybe<T> as optional (can be undefined). Can be combined with maybeNullable",
    }),
    maybeNullable: flags.boolean({
      description:
        "treat Maybe<T> as nullable (can be null). Can be combined with maybeOptional",
    }),
    maybeTypeName: flags.string({
      multiple: true,
      description:
        "determines the name of the types to treat as 'Maybe'. Can be multiple.",
    }),
    init: flags.boolean({
      char: "i",
      description: "Create a ts-to-zod.config.js file",
    }),
    skipParseJSDoc: flags.boolean({
      default: false,
      description: "Skip the creation of zod validators from JSDoc annotations",
    }),
    skipValidation: flags.boolean({
      default: false,
      description: "Skip the validation step (not recommended)",
    }),
    watch: flags.boolean({
      char: "w",
      default: false,
      description: "Watch input file(s) for changes and re-run related task",
    }),
    // -- Multi config flags --
    config: flags.enum({
      char: "c",
      options: configKeys,
      description: "Execute one config",
      hidden: !haveMultiConfig,
    }),
    all: flags.boolean({
      char: "a",
      default: false,
      description: "Execute all configs",
      hidden: !haveMultiConfig,
    }),
  };

  static args = [
    { name: "input", description: "input file (typescript)" },
    {
      name: "output",
      description: "output file (zod schemas)",
    },
  ];

  async run() {
    const { args, flags } = this.parse(TsToZod);
    if (flags.init) {
      (await createConfig(configPath))
        ? this.log(`🧐 ts-to-zod.config.js created!`)
        : this.log(`Nothing changed!`);
      return;
    }

    const fileConfig = await this.loadFileConfig(config, flags);

    if (Array.isArray(fileConfig)) {
      if (args.input || args.output) {
        this.error(`INPUT and OUTPUT arguments are not compatible with --all`);
      }
      await eachSeries(fileConfig, async (config) => {
        this.log(`Generating "${config.name}"`);
        const result = await this.generate(args, config, flags);
        if (result.success) {
          this.log(` 🎉 Zod schemas generated!`);
        } else {
          this.error(result.error, { exit: false });
        }
        this.log(); // empty line between configs
      }).catch((e) => this.error(e, { exit: false }));
    } else {
      const result = await this.generate(args, fileConfig, flags);
      if (result.success) {
        this.log(`🎉 Zod schemas generated!`);
      } else {
        this.error(result.error);
      }
    }

    if (flags.watch) {
      const inputs = Array.isArray(fileConfig)
        ? fileConfig.map((i) => i.input)
        : fileConfig?.input || args.input;

      this.log("\nWatching for changes…");
      chokidar.watch(inputs).on("change", async (path) => {
        console.clear();
        this.log(`Changes detected in "${slash(path)}"`);
        const config = Array.isArray(fileConfig)
          ? fileConfig.find((i) => i.input === slash(path))
          : fileConfig;

        const result = await this.generate(args, config, flags);
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
   * @param flags
   */
  async generate(
    args: { input?: string; output?: string },
    fileConfig: Config | undefined,
    flags: OutputFlags<typeof TsToZod.flags>
  ): Promise<{ success: true } | { success: false; error: string }> {
    const input = args.input || fileConfig?.input;
    const output = args.output || fileConfig?.output;

    if (!input) {
      return {
        success: false,
        error: `Missing 1 required arg:
${TsToZod.args[0].description}
See more help with --help`,
      };
    }

    const inputPath = join(process.cwd(), input);
    const outputPath = join(process.cwd(), output || input);

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

    const generateOptions = this.extractGenerateOptions(
      sourceText,
      fileConfig,
      flags
    );

    const {
      errors,
      transformedSourceText,
      getZodSchemasFile,
      getIntegrationTestFile,
      hasCircularDependencies,
    } = generate(generateOptions);

    if (hasCircularDependencies && !output) {
      return {
        success: false,
        error:
          "--output= must also be provided when input file have some circular dependencies",
      };
    }

    errors.map(this.warn);

    if (!flags.skipValidation) {
      const validatorSpinner = ora("Validating generated types").start();
      if (flags.all) validatorSpinner.indent = 1;
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

    if (output && hasExtensions(output, javascriptExtensions)) {
      await outputFile(
        outputPath,
        prettier.format(
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
        prettier.format(zodSchemasFile, {
          parser: "babel-ts",
          ...prettierConfig,
        })
      );
    }
    return { success: true };
  }

  private extractGenerateOptions(
    sourceText: string,
    givenFileConfig: Config | undefined,
    flags: OutputFlags<typeof TsToZod.flags>
  ) {
    const { maybeOptional, maybeNullable, maybeTypeNames, ...fileConfig } =
      givenFileConfig || {};

    const maybeConfig: MaybeConfig = {
      optional: maybeOptional ?? true,
      nullable: maybeNullable ?? true,
      typeNames: new Set(maybeTypeNames ?? []),
    };
    if (typeof flags.maybeTypeName === "string" && flags.maybeTypeName) {
      maybeConfig.typeNames = new Set([flags.maybeTypeName]);
    }
    if (
      flags.maybeTypeName &&
      Array.isArray(flags.maybeTypeName) &&
      flags.maybeTypeName.length
    ) {
      maybeConfig.typeNames = new Set(flags.maybeTypeName);
    }
    if (typeof flags.maybeOptional === "boolean") {
      maybeConfig.optional = flags.maybeOptional;
    }
    if (typeof flags.maybeNullable === "boolean") {
      maybeConfig.nullable = flags.maybeNullable;
    }

    const generateOptions: GenerateProps = {
      sourceText,
      maybeConfig,
      ...fileConfig,
    };

    if (typeof flags.maxRun === "number") {
      generateOptions.maxRun = flags.maxRun;
    }
    if (typeof flags.keepComments === "boolean") {
      generateOptions.keepComments = flags.keepComments;
    }
    if (typeof flags.skipParseJSDoc === "boolean") {
      generateOptions.skipParseJSDoc = flags.skipParseJSDoc;
    }
    return generateOptions;
  }

  /**
   * Load user config from `ts-to-zod.config.js`
   */
  async loadFileConfig(
    config: TsToZodConfig | undefined,
    flags: OutputFlags<typeof TsToZod.flags>
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
            message: `You have multiple configs available in "${tsToZodConfigJs}"\n What do you want?`,
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

export = TsToZod;
