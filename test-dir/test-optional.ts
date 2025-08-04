import {
  testFunctionSchema,
  testAsyncFunctionSchema,
} from "./test-function.zod";
import { z } from "zod";

// Test that .optional() works on wrapped function schemas
export const optionalFunctionSchema = testFunctionSchema.optional();
export const optionalAsyncFunctionSchema = testAsyncFunctionSchema.optional();

// Test that we can create an object schema with optional function properties
export const configSchema = z.object({
  syncHandler: testFunctionSchema.optional(),
  asyncHandler: testAsyncFunctionSchema.optional(),
  required: z.string(),
});
