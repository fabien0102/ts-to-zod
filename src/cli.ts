import { Command, flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser";
import { readFile, outputFile, existsSync } from "fs-extra";
import { join, relative, parse } from "path";
import slash from "slash";
import ts from "typescript";
import { generate, GenerateProps } from "./core/generate";
import {
  tsToZodconfigSchema,
  getSchemaNameSchema,
  nameFilterSchema,
  TsToZodConfig,
  createConfig,
  Config,
} from "./config";
import { getImportPath } from "./utils/getImportPath";
import ora from "ora";
import prettier from "prettier";
import * as worker from "./worker";
import inquirer from "inquirer";
import { eachSeries } from "async";

// Try to load `ts-to-zod.config.js`
// We are doing this here to be able to infer the `flags` & `usage` in the cli help
const tsToZodConfigJs = "ts-to-zod.config.js";
const configPath = join(process.cwd(), tsToZodConfigJs);
let parsedConfig: ReturnType<typeof tsToZodconfigSchema.safeParse> | undefined;
let haveMultiConfig = false;
const configKeys: string[] = [];

try {
  if (existsSync(configPath)) {
    const rawConfig = require(slash(relative(__dirname, configPath)));
    parsedConfig = tsToZodconfigSchema.safeParse(rawConfig);
    if (parsedConfig.success && Array.isArray(parsedConfig.data)) {
      haveMultiConfig = true;
      configKeys.push(...parsedConfig.data.map((c) => c.name));
    }
  }
} catch (e) {
  console.log(`"${tsToZodConfigJs}" can't be loaded:\n  ${e.message}\n`);
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
    init: flags.boolean({
      char: "i",
      description: "Create a ts-to-zod.config.js file",
    }),
    skipValidation: flags.boolean({
      default: false,
      description: "Skip the validation step (not recommended)",
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

    const fileConfig = await this.loadFileConfig(parsedConfig, flags);

    if (Array.isArray(fileConfig)) {
      eachSeries(fileConfig, async (config) => {
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
  }

  /**
   * Generate on zod schema file.
   * @param args
   * @param fileConfig
   * @param flags
   */
  async generate(
    args: { input?: string; output?: string },
    fileConfig: Config,
    flags: OutputFlags<typeof TsToZod.flags>
  ): Promise<{ success: true } | { success: false; error: string }> {
    const input = args.input || fileConfig.input;
    const output = args.output || fileConfig.output;

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

    const generateOptions: GenerateProps = {
      sourceText,
      ...fileConfig,
    };
    if (typeof flags.maxRun === "number") {
      generateOptions.maxRun = flags.maxRun;
    }
    if (typeof flags.keepComments === "boolean") {
      generateOptions.keepComments = flags.keepComments;
    }

    const {
      errors,
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
          sourceText,
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
          { parser: "babel-ts" }
        )
      );
    } else {
      await outputFile(
        outputPath,
        prettier.format(zodSchemasFile, { parser: "babel-ts" })
      );
    }
    return { success: true };
  }

  /**
   * Load user config from `ts-to-zod.config.js`
   */
  async loadFileConfig(
    config: typeof parsedConfig,
    flags: OutputFlags<typeof TsToZod.flags>
  ): Promise<TsToZodConfig> {
    if (!config) {
      return {};
    }
    if (!config.success) {
      this.error(`"${tsToZodConfigJs}" invalid:\n${config.error.message}`);
    }
    if (Array.isArray(config.data)) {
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
        return config.data;
      }
      if (flags.config) {
        const selectedConfig = config.data.find((c) => c.name === flags.config);
        if (!selectedConfig) {
          this.error(`${flags.config} configuration not found!`);
        }
        return selectedConfig;
      }
      return {};
    }

    return {
      ...config.data,
      getSchemaName: config.data.getSchemaName
        ? getSchemaNameSchema.implement(config.data.getSchemaName)
        : undefined,
      nameFilter: config.data.nameFilter
        ? nameFilterSchema.implement(config.data.nameFilter)
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
