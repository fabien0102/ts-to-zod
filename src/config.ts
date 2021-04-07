import { z } from "zod";

export const getSchemaNameSchema = z
  .function()
  .args(z.string())
  .returns(z.string());

export const nameFilterSchema = z
  .function()
  .args(z.string())
  .returns(z.boolean());

export const configSchema = z
  .object({
    maxRun: z.number(),
    nameFilter: nameFilterSchema,
    getSchemaName: getSchemaNameSchema,
    keepComments: z.boolean(),
    input: z.string(),
    output: z.string(),
  })
  .partial();

export const configsSchema = z.array(
  configSchema.and(z.object({ name: z.string() }))
);

export const tsToZodconfigSchema = z.union([configSchema, configsSchema]);

export type Config = z.infer<typeof configSchema>;
export type Configs = z.infer<typeof configsSchema>;
export type TsToZodConfig = z.infer<typeof tsToZodconfigSchema>;
