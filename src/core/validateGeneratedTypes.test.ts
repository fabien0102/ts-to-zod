import { validateGeneratedTypes } from "./validateGeneratedTypes";

describe("validateGeneratedTypes", () => {
  it("should return no error if the types match", () => {
    const sourceTypes = {
      sourceText: `
      export type MyNumber = number;
    `,
      relativePath: "source.ts",
    };

    const zodSchemas = {
      sourceText: `// Generated by ts-to-zod
    import { z } from "zod";
    export const myNumberSchema = z.number();
    `,
      relativePath: "source.zod.ts",
    };

    const integrationTests = {
      sourceText: `// Generated by ts-to-zod
      import { z } from "zod";
      
      import * as spec from "./${sourceTypes.relativePath.slice(0, -3)}";
      import * as generated from "./${zodSchemas.relativePath.slice(0, -3)}";
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function expectType<T>(_: T) {
        /* noop */
      }

      export type myNumberSchemaInferredType = z.infer<typeof generated.myNumberSchema>;

      expectType<myNumberSchemaInferredType>({} as spec.MyNumber);
      expectType<spec.MyNumber>({} as myNumberSchemaInferredType);
  `,
      relativePath: "source.integration.ts",
    };

    const errors = validateGeneratedTypes({
      sourceTypes,
      zodSchemas,
      integrationTests,
      skipParseJSDoc: false,
    });

    expect(errors).toEqual([]);
  });

  it("should return an error if the types doesn't match", () => {
    const sourceTypes = {
      sourceText: `
      export type MyNumber = number;
    `,
      relativePath: "source.ts",
    };

    const zodSchemas = {
      sourceText: `// Generated by ts-to-zod
      import { z } from "zod";
      export const myStringSchema = z.string();
      `,
      relativePath: "source.zod.ts",
    };

    const integrationTests = {
      sourceText: `// Generated by ts-to-zod
        import { z } from "zod";
        
        import * as spec from "./${sourceTypes.relativePath.slice(0, -3)}";
        import * as generated from "./${zodSchemas.relativePath.slice(0, -3)}";
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function expectType<T>(_: T) {
          /* noop */
        }

        export type myStringSchemaInferredType = z.infer<typeof generated.myStringSchema>;

        expectType<myStringSchemaInferredType>({} as spec.MyNumber);
        expectType<spec.MyNumber>({} as myStringSchemaInferredType);
    `,
      relativePath: "source.integration.ts",
    };

    const errors = validateGeneratedTypes({
      sourceTypes,
      zodSchemas,
      integrationTests,
      skipParseJSDoc: false,
    });

    expect(errors).toMatchInlineSnapshot(`
      Array [
        "'MyNumber' is not compatible with 'myStringSchema':
      Argument of type 'number' is not assignable to parameter of type 'string'.",
        "'myStringSchema' is not compatible with 'MyNumber':
      Argument of type 'string' is not assignable to parameter of type 'number'.",
      ]
    `);
  });

  it("should deal with optional value with default", () => {
    const sourceTypes = {
      sourceText: `
      export interface Citizen {
        /**
         * @default true
         */
        isVillain?: boolean;
      };
    `,
      relativePath: "source.ts",
    };

    const zodSchemas = {
      sourceText: `// Generated by ts-to-zod
    import { z } from "zod";
    export const citizenSchema = z.object({
      isVillain: z.boolean().optional().default(true)
    });
    `,
      relativePath: "source.zod.ts",
    };

    const integrationTests = {
      sourceText: `// Generated by ts-to-zod
      import { z } from "zod";
      
      import * as spec from "./${sourceTypes.relativePath.slice(0, -3)}";
      import * as generated from "./${zodSchemas.relativePath.slice(0, -3)}";
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function expectType<T>(_: T) {
        /* noop */
      }

      export type CitizenInferredType = z.infer<typeof generated.citizenSchema>;

      expectType<CitizenInferredType>({} as spec.Citizen);
      expectType<spec.Citizen>({} as CitizenInferredType);
  `,
      relativePath: "source.integration.ts",
    };

    const errors = validateGeneratedTypes({
      sourceTypes,
      zodSchemas,
      integrationTests,
      skipParseJSDoc: false,
    });

    expect(errors).toEqual([]);
  });

  it("should skip defaults if `skipParseJSDoc` is `true`", () => {
    const sourceTypes = {
      sourceText: `
      export interface Citizen {
        /**
         * @default true
         */
        isVillain?: boolean;
      };
    `,
      relativePath: "source.ts",
    };

    const zodSchemas = {
      sourceText: `// Generated by ts-to-zod
    import { z } from "zod";
    export const citizenSchema = z.object({
      isVillain: z.boolean().optional()
    });
    `,
      relativePath: "source.zod.ts",
    };

    const integrationTests = {
      sourceText: `// Generated by ts-to-zod
      import { z } from "zod";
      
      import * as spec from "./${sourceTypes.relativePath.slice(0, -3)}";
      import * as generated from "./${zodSchemas.relativePath.slice(0, -3)}";
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function expectType<T>(_: T) {
        /* noop */
      }

      export type CitizenInferredType = z.infer<typeof generated.citizenSchema>;

      expectType<CitizenInferredType>({} as spec.Citizen);
      expectType<spec.Citizen>({} as CitizenInferredType);
  `,
      relativePath: "source.integration.ts",
    };

    const errors = validateGeneratedTypes({
      sourceTypes,
      zodSchemas,
      integrationTests,
      skipParseJSDoc: true,
    });

    expect(errors).toEqual([]);
  });
});
