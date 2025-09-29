import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as prompt from "@clack/prompts";

/**
 * Create `ts-to-zod.config.js` file.
 *
 * @param path
 * @returns `true` if the file was created
 */
export async function createConfig(
  configPath: string,
  tsToZodConfigFileName: string
) {
  if (existsSync(configPath)) {
    const shouldOverride = await prompt.confirm({
      message: `${tsToZodConfigFileName} already exists, do you want to override it?`,
    });
    if (prompt.isCancel(shouldOverride) || shouldOverride === false) {
      return false;
    }
  }

  const project = join(import.meta.dirname, "../tsconfig.json");
  const isDev = existsSync(project);

  const configs: Array<{ input: string; output: string; name: string }> = [];

  while (true) {
    const input = await ask("Where is your file with types?");
    const output = await ask(
      "Where do you want to save the generated zod schemas?",
      { initialValue: input.replace(/\.ts(x)?$/, ".zod.ts$1") }
    );
    const name = await ask("How should we call your configuration?");
    configs.push({ name, input, output });

    const more = await prompt.confirm({
      message: "Do you want to add another config?",
      initialValue: false,
    });

    if (more !== true) {
      break;
    }
  }

  const header = `/**
 * ts-to-zod configuration.
 *
 * @type {${
   isDev ? 'import("./src/config")' : 'import("ts-to-zod")'
 }.TsToZodConfig}
 */
export default `;

  if (configs.length > 0) {
    await writeFile(
      configPath,
      header + JSON.stringify(configs.length === 1 ? configs[0] : configs),
      "utf-8"
    );
    return true;
  }

  return false;
}

/**
 * Ask a question to the user (and deal with cancel state)
 */
async function ask(message: string, opt?: Omit<prompt.TextOptions, "message">) {
  const answer = await prompt.text({ message, ...opt });
  if (prompt.isCancel(answer)) {
    prompt.cancel("Operation cancelled");
    process.exit(0);
  }
  return answer;
}
