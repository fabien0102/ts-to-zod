import { Command, flags } from "@oclif/command";
import { readFile, outputFile, existsSync } from "fs-extra";
import { join, relative, parse } from "path";
import slash from "slash";
import ts from "typescript";
import { generate, GenerateProps } from "./core/generate";
import inquirer from "inquirer";
import {
  configSchema,
  getSchemaNameSchema,
  nameFilterSchema,
  TsToZodConfig,
} from "./config";
import { getImportPath } from "./utils/getImportPath";
import ora from "ora";
import * as worker from "./worker";

class TsToZod extends Command {
  static description = "Generate Zod schemas from a Typescript file";

  static flags = {
    version: flags.version({ char: "v" }),
    help: flags.help({ char: "h" }),
    maxRun: flags.integer({
      hidden: true,
      default: 10,
      description: "max iteration number to resolve the declaration order",
    }),
    keepComments: flags.boolean({
      char: "c",
      description: "Keep parameters comments",
    }),
    init: flags.boolean({
      description: "Create a ts-to-zod.config.js file",
    }),
    skipValidation: flags.boolean({
      default: false,
      description: "Skip the validation step (not recommended)",
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
      (await init())
        ? this.log(`🧐 ts-to-zod.config.js created!`)
        : this.log(`Nothing changed!`);
      return;
    }

    // Retrieve ts-to-zod.config.js values and consolidate with cli flags.
    const {
      input: fileConfigInput,
      output: fileConfigOutput,
      ...fileConfig
    } = loadUserConfig();

    const input = args.input || fileConfigInput;
    const output = args.output || fileConfigOutput;

    if (!input) {
      this.error(`Missing 1 required arg:
${TsToZod.args[0].description}
See more help with --help`);
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
      this.error(
        "--output= must also be provided when input file have some circular dependencies"
      );
    }

    errors.map(this.warn);

    if (!flags.skipValidation) {
      const validatorSpinner = ora("Validating generated types").start();
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

      generationErrors.map((e) => this.error(e));
    }

    const zodSchemasFile = getZodSchemasFile(
      getImportPath(outputPath, inputPath)
    );

    if (output && hasExtensions(output, javascriptExtensions)) {
      await outputFile(
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
      await outputFile(outputPath, zodSchemasFile);
    }
    this.log(`🎉 Zod schemas generated!`);
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

const configPath = join(process.cwd(), "ts-to-zod.config.js");

/**
 * Load user config from `ts-to-zod.config.js`
 */
function loadUserConfig(): TsToZodConfig {
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
  } else {
    return {};
  }
}

/**
 * Initialize ts-to-zod.config.js file.
 *
 * @returns `true` if the file was created
 */
async function init() {
  if (existsSync(configPath)) {
    const { answer } = await inquirer.prompt<{ answer: boolean }>({
      type: "confirm",
      name: "answer",
      message:
        "ts-to-zod.config.js already exists, do you want to override it?",
    });
    if (!answer) {
      return false;
    }
  }
  const configTemplate = `/**
 * ts-to-zod configuration.
 *
 * @type {import("ts-to-zod").TsToZodConfig}
 */
module.exports = {
  
};
`;

  outputFile(configPath, configTemplate, "utf-8");
  return true;
}

export = TsToZod;
