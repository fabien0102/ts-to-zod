import { factory as f } from "typescript";

interface TestCase {
  zodType: string;
  tsType: string;
}

/**
 * Generate integration tests to validate if the generated zod schemas
 * are equals to the originals types.
 *
 * ```ts
 * expectType<${tsType}>({} as ${zodType})
 * expectType<${zodType}>({} as ${tsType})
 * ```
 */
export function generateIntegrationTests(testCases: TestCase[]) {
  return testCases
    .map((testCase) => [
      f.createCallExpression(
        f.createIdentifier("expectType"),
        [f.createTypeReferenceNode(testCase.tsType)],
        [
          f.createAsExpression(
            f.createObjectLiteralExpression(),
            f.createTypeReferenceNode(testCase.zodType)
          ),
        ]
      ),
      f.createCallExpression(
        f.createIdentifier("expectType"),
        [f.createTypeReferenceNode(testCase.zodType)],
        [
          f.createAsExpression(
            f.createObjectLiteralExpression(),
            f.createTypeReferenceNode(testCase.tsType)
          ),
        ]
      ),
    ])
    .reduce((mem, i) => [...mem, ...i], []);
}
