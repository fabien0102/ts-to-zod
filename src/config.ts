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

export type TsToZodConfig = z.infer<typeof configSchema>;
