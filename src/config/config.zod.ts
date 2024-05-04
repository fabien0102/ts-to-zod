// Generated by ts-to-zod
import { z } from "zod";

export const simplifiedJSDocTagSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
});

export const getSchemaNameSchema = z
  .function()
  .args(z.string())
  .returns(z.string());

export const nameFilterSchema = z
  .function()
  .args(z.string())
  .returns(z.boolean());

export const jSDocTagFilterSchema = z
  .function()
  .args(z.array(simplifiedJSDocTagSchema))
  .returns(z.boolean());

export const customJSDocFormatTypeAttributesSchema = z.object({
  regex: z.string(),
  errorMessage: z.string().optional(),
});

export const customJSDocFormatTypeSchema = z.string();

export const customJSDocFormatTypesSchema = z.record(
  customJSDocFormatTypeSchema,
  z.union([z.string(), customJSDocFormatTypeAttributesSchema])
);

export const configSchema = z.object({
  input: z.string(),
  output: z.string(),
  skipValidation: z.boolean().optional(),
  nameFilter: nameFilterSchema.optional(),
  jsDocTagFilter: jSDocTagFilterSchema.optional(),
  getSchemaName: getSchemaNameSchema.optional(),
  keepComments: z.boolean().optional().default(false),
  skipParseJSDoc: z.boolean().optional().default(false),
  inferredTypes: z.string().optional(),
  customJSDocFormatTypes: customJSDocFormatTypesSchema.optional(),
});

export const configsSchema = z.array(
  configSchema.and(
    z.object({
      name: z.string(),
    })
  )
);

export const inputOutputMappingSchema = configSchema.pick({
  input: true,
  output: true,
  getSchemaName: true,
});

export const tsToZodConfigSchema = z.union([configSchema, configsSchema]);