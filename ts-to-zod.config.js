/**
 * ts-to-zod configuration.
 *
 * @type {import("./src/config").TsToZodConfig}
 */
module.exports = [
  {
    name: "example",
    input: "example/heros.ts",
    output: "example/heros.zod.ts",
    maybeTypeNames: ["Maybe"],
  },
  { name: "config", input: "src/config.ts", output: "src/config.zod.ts" },
];
