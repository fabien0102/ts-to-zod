import { generate, GenerateProps } from "./core/generate";
export { generate, GenerateProps };

export {
  generateZodInferredType,
  GenerateZodInferredTypeProps,
} from "./core/generateZodInferredType";

export {
  generateZodSchemaVariableStatement,
  GenerateZodSchemaProps,
} from "./core/generateZodSchema";

export { generateIntegrationTests } from "./core/generateIntegrationTests";

export type TsToZodConfig = Omit<GenerateProps, "sourceText">;
