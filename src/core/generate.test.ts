import { InputOutputMapping } from "../config";
import { generate } from "./generate";

describe("generate", () => {
  describe("simple case", () => {
    const sourceText = `
      export type Name = "superman" | "clark kent" | "kal-l";

      // Note that the Superman is declared after
      export type BadassSuperman = Omit<Superman, "underKryptonite">;

      export interface Superman {
        name: Name;
        age: number;
        underKryptonite?: boolean;
        /**
         * @format email
         **/
        email: string;
      }

      const fly = () => console.log("I can fly!");
      `;

    const { getZodSchemasFile, getIntegrationTestFile, errors } = generate({
      sourceText,
    });

    it("should generate the zod schemas", () => {
      expect(getZodSchemasFile("./hero")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        export const nameSchema = z.union([z.literal("superman"), z.literal("clark kent"), z.literal("kal-l")]);

        export const supermanSchema = z.object({
            name: nameSchema,
            age: z.number(),
            underKryptonite: z.boolean().optional(),
            email: z.string().email()
        });

        export const badassSupermanSchema = supermanSchema.omit({ "underKryptonite": true });
        "
      `);
    });

    it("should generate the integration tests", () => {
      expect(getIntegrationTestFile("./hero", "hero.zod"))
        .toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import * as spec from "./hero";
        import * as generated from "hero.zod";

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function expectType<T>(_: T) {
          /* noop */
        }

        export type nameSchemaInferredType = z.infer<typeof generated.nameSchema>;

        export type supermanSchemaInferredType = z.infer<typeof generated.supermanSchema>;

        export type badassSupermanSchemaInferredType = z.infer<typeof generated.badassSupermanSchema>;

        expectType<spec.Name>({} as nameSchemaInferredType)
        expectType<nameSchemaInferredType>({} as spec.Name)
        expectType<spec.Superman>({} as supermanSchemaInferredType)
        expectType<supermanSchemaInferredType>({} as spec.Superman)
        expectType<spec.BadassSuperman>({} as badassSupermanSchemaInferredType)
        expectType<badassSupermanSchemaInferredType>({} as spec.BadassSuperman)
        "
      `);
    });
    it("should not have any errors", () => {
      expect(errors.length).toBe(0);
    });
  });

  describe("with enums", () => {
    const sourceText = `
      export enum Superhero {
        Superman = "superman"
        ClarkKent = "clark-kent"
      };

      export type FavoriteSuperhero = {
        superhero: Superhero.Superman
      };
      `;

    const { getZodSchemasFile, getIntegrationTestFile, errors } = generate({
      sourceText,
    });

    it("should generate the zod schemas", () => {
      expect(getZodSchemasFile("./superhero")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";
        import { Superhero } from "./superhero";

        export const superheroSchema = z.nativeEnum(Superhero);

        export const favoriteSuperheroSchema = z.object({
            superhero: z.literal(Superhero.Superman)
        });
        "
      `);
    });

    it("should generate the integration tests", () => {
      expect(getIntegrationTestFile("./superhero", "superhero.zod"))
        .toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import * as spec from "./superhero";
        import * as generated from "superhero.zod";

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function expectType<T>(_: T) {
          /* noop */
        }

        export type superheroSchemaInferredType = z.infer<typeof generated.superheroSchema>;

        export type favoriteSuperheroSchemaInferredType = z.infer<typeof generated.favoriteSuperheroSchema>;

        expectType<spec.Superhero>({} as superheroSchemaInferredType)
        expectType<superheroSchemaInferredType>({} as spec.Superhero)
        expectType<spec.FavoriteSuperhero>({} as favoriteSuperheroSchemaInferredType)
        expectType<favoriteSuperheroSchemaInferredType>({} as spec.FavoriteSuperhero)
        "
      `);
    });

    it("should not have any errors", () => {
      expect(errors.length).toBe(0);
    });
  });

  describe("with circular references", () => {
    const sourceText = `
      export interface Villain {
        name: string;
        powers: string[];
        friends: Villain[];
      }

      export interface EvilPlan {
        owner: Villain;
        description: string;
        details: EvilPlanDetails;
      }

      export interface EvilPlanDetails {
        parent: EvilPlan;
        steps: string[];
      }

      export interface IHaveUnknownDependency {
        dep: UnknownDependency; // <- Missing dependency
      }
      `;

    const { getZodSchemasFile, getIntegrationTestFile, errors } = generate({
      sourceText,
    });

    it("should generate the zod schemas", () => {
      expect(getZodSchemasFile("./villain")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";
        import { Villain, EvilPlan, EvilPlanDetails } from "./villain";

        export const villainSchema: z.ZodSchema<Villain> = z.lazy(() => z.object({
            name: z.string(),
            powers: z.array(z.string()),
            friends: z.array(villainSchema)
        }));

        export const evilPlanSchema: z.ZodSchema<EvilPlan> = z.lazy(() => z.object({
            owner: villainSchema,
            description: z.string(),
            details: evilPlanDetailsSchema
        }));

        export const evilPlanDetailsSchema: z.ZodSchema<EvilPlanDetails> = z.lazy(() => z.object({
            parent: evilPlanSchema,
            steps: z.array(z.string())
        }));
        "
      `);
    });

    it("should generate the integration tests", () => {
      expect(getIntegrationTestFile("./villain", "villain.zod"))
        .toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import * as spec from "./villain";
        import * as generated from "villain.zod";

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function expectType<T>(_: T) {
          /* noop */
        }

        export type villainSchemaInferredType = z.infer<typeof generated.villainSchema>;

        export type evilPlanSchemaInferredType = z.infer<typeof generated.evilPlanSchema>;

        export type evilPlanDetailsSchemaInferredType = z.infer<typeof generated.evilPlanDetailsSchema>;

        expectType<spec.Villain>({} as villainSchemaInferredType)
        expectType<villainSchemaInferredType>({} as spec.Villain)
        expectType<spec.EvilPlan>({} as evilPlanSchemaInferredType)
        expectType<evilPlanSchemaInferredType>({} as spec.EvilPlan)
        expectType<spec.EvilPlanDetails>({} as evilPlanDetailsSchemaInferredType)
        expectType<evilPlanDetailsSchemaInferredType>({} as spec.EvilPlanDetails)
        "
      `);
    });

    it("should have some errors", () => {
      expect(errors).toMatchInlineSnapshot(`
        [
          "Some schemas can't be generated due to direct or indirect missing dependencies:
        iHaveUnknownDependencySchema",
        ]
      `);
    });
  });

  describe("with options", () => {
    const sourceText = `export interface Superman {
      /**
       * Name of superman
       */
      name: string;
    }

    export interface Villain {
      name: string;
      didKillSuperman: true;
    }
    `;

    const { getZodSchemasFile } = generate({
      sourceText,
      nameFilter: (id) => id === "Superman",
      getSchemaName: (id) => id.toLowerCase(),
      keepComments: true,
    });

    it("should generate superman schema", () => {
      expect(getZodSchemasFile("./hero")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        export const superman = z.object({
            /**
             * Name of superman
             */
            name: z.string()
        });
        "
      `);
    });
  });

  describe("inheritance and reference type search", () => {
    const sourceText = `
    export type Name = "superman" | "clark kent" | "kal-l";
    export interface Superman {
      name: Name;
    }`;

    const { getZodSchemasFile } = generate({
      sourceText,
      nameFilter: (id) => id === "Superman",
      getSchemaName: (id) => id.toLowerCase(),
      keepComments: true,
    });

    it("should generate superman schema", () => {
      expect(getZodSchemasFile("./hero")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        export const name = z.union([z.literal("superman"), z.literal("clark kent"), z.literal("kal-l")]);

        export const superman = z.object({
            name: name
        });
        "
      `);
    });
  });

  describe("with jsdocTags filter", () => {
    it("should generate only types with @zod", () => {
      const sourceText = `
      /**
       * @zod
       **/
      export type Name = "superman" | "clark kent" | "kal-l";

      /**
       * @nop
       */
      export type BadassSuperman = Omit<Superman, "underKryptonite">;

      /**
       * Only this interface should be generated
       *
       * @zod
       */
      export interface Superman {
        name: Name;
        age: number;
        underKryptonite?: boolean;
        /**
         * @format email
         **/
        email: string;
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
        jsDocTagFilter: (tags) => tags.map((tag) => tag.name).includes("zod"),
      });

      expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        export const nameSchema = z.union([z.literal("superman"), z.literal("clark kent"), z.literal("kal-l")]);

        export const supermanSchema = z.object({
            name: nameSchema,
            age: z.number(),
            underKryptonite: z.boolean().optional(),
            email: z.string().email()
        });
        "
      `);
    });
  });

  describe("with non-exported types", () => {
    it("should generate tests for exported schemas", () => {
      const sourceText = `
      export type Name = "superman" | "clark kent" | "kal-l";

      // Note that the Superman is declared after
      export type BadassSuperman = Omit<Superman, "underKryptonite">;

      interface Superman {
        name: Name;
        age: number;
        underKryptonite?: boolean;
        /**
         * @format email
         **/
        email: string;
      }
      `;

      const { getIntegrationTestFile } = generate({
        sourceText,
      });

      expect(getIntegrationTestFile("./source", "./source.zod"))
        .toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import * as spec from "./source";
        import * as generated from "./source.zod";

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function expectType<T>(_: T) {
          /* noop */
        }

        export type nameSchemaInferredType = z.infer<typeof generated.nameSchema>;

        export type badassSupermanSchemaInferredType = z.infer<typeof generated.badassSupermanSchema>;

        expectType<spec.Name>({} as nameSchemaInferredType)
        expectType<nameSchemaInferredType>({} as spec.Name)
        expectType<spec.BadassSuperman>({} as badassSupermanSchemaInferredType)
        expectType<badassSupermanSchemaInferredType>({} as spec.BadassSuperman)
        "
      `);
    });
  });

  describe("with namespace", () => {
    const sourceText = `
      export namespace Metropolis {
        export type Name = "superman" | "clark kent" | "kal-l";

        // Note that the Superman is declared after
        export type BadassSuperman = Omit<Superman, "underKryptonite">;

        export interface Superman {
          name: Name;
          age: number;
          underKryptonite?: boolean;
          /**
           * @format email
           **/
          email: string;
        }

        const fly = () => console.log("I can fly!");
      }
      `;

    const { getZodSchemasFile, getIntegrationTestFile, errors } = generate({
      sourceText,
    });

    it("should generate the zod schemas", () => {
      expect(getZodSchemasFile("./hero")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        export const metropolisNameSchema = z.union([z.literal("superman"), z.literal("clark kent"), z.literal("kal-l")]);

        export const metropolisSupermanSchema = z.object({
            name: metropolisNameSchema,
            age: z.number(),
            underKryptonite: z.boolean().optional(),
            email: z.string().email()
        });

        export const metropolisBadassSupermanSchema = metropolisSupermanSchema.omit({ "underKryptonite": true });
        "
      `);
    });

    it("should generate the integration tests", () => {
      expect(getIntegrationTestFile("./hero", "hero.zod"))
        .toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import * as spec from "./hero";
        import * as generated from "hero.zod";

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        function expectType<T>(_: T) {
          /* noop */
        }

        export type metropolisNameSchemaInferredType = z.infer<typeof generated.metropolisNameSchema>;

        export type metropolisSupermanSchemaInferredType = z.infer<typeof generated.metropolisSupermanSchema>;

        export type metropolisBadassSupermanSchemaInferredType = z.infer<typeof generated.metropolisBadassSupermanSchema>;

        expectType<spec.MetropolisName>({} as metropolisNameSchemaInferredType)
        expectType<metropolisNameSchemaInferredType>({} as spec.MetropolisName)
        expectType<spec.MetropolisSuperman>({} as metropolisSupermanSchemaInferredType)
        expectType<metropolisSupermanSchemaInferredType>({} as spec.MetropolisSuperman)
        expectType<spec.MetropolisBadassSuperman>({} as metropolisBadassSupermanSchemaInferredType)
        expectType<metropolisBadassSupermanSchemaInferredType>({} as spec.MetropolisBadassSuperman)
        "
      `);
    });
    it("should not have any errors", () => {
      expect(errors).toEqual([]);
    });
  });

  describe("with @strict tag", () => {
    it("should generate strict keyword", () => {
      const sourceText = `
      /**
       * @strict
       */
      export interface Superman {
        name: string;
        age: number;
      }

      export interface Villain {
        name: string;
        /**
         * @strict
         */
        nemesis: {
          name: string;
          ref: Superman
        };
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
      });

      expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
      "// Generated by ts-to-zod
      import { z } from "zod";

      export const supermanSchema = z.object({
          name: z.string(),
          age: z.number()
      }).strict();

      export const villainSchema = z.object({
          name: z.string(),
          nemesis: z.object({
              name: z.string(),
              ref: supermanSchema
          }).strict()
      });
      "
      `);
    });
  });

  describe("with import statements", () => {
    describe("single import", () => {
      const sourceText = `
      import Villain from "@project/villain-module";
  
      export interface Superman {
        nemesis: Villain;
        id: number
      }
      `;

      const { getZodSchemasFile, getIntegrationTestFile, errors } = generate({
        sourceText,
      });

      it("should generate the zod schemas", () => {
        expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
      "// Generated by ts-to-zod
      import { z } from "zod";

      const villainSchema = z.any();

      export const supermanSchema = z.object({
          nemesis: villainSchema,
          id: z.number()
      });
      "
      `);
      });

      it("should generate the integration tests", () => {
        expect(getIntegrationTestFile("./hero", "hero.zod"))
          .toMatchInlineSnapshot(`
      "// Generated by ts-to-zod
      import { z } from "zod";

      import * as spec from "./hero";
      import * as generated from "hero.zod";

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      function expectType<T>(_: T) {
        /* noop */
      }

      export type supermanSchemaInferredType = z.infer<typeof generated.supermanSchema>;

      expectType<spec.Superman>({} as supermanSchemaInferredType)
      expectType<supermanSchemaInferredType>({} as spec.Superman)
      "
      `);
      });

      it("should not have any errors", () => {
        expect(errors.length).toBe(0);
      });
    });

    describe("multiple imports", () => {
      const sourceText = `
      import { Name } from "nameModule";
      import * as Person from "person-module";
      import Villain from "@project/villain-module";
  
      export interface Superman {
        name: Name;
        person: Person;
        nemesis: Villain;
        id: number
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
      });

      it("should generate the zod schemas", () => {
        expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
      "// Generated by ts-to-zod
      import { z } from "zod";

      const nameSchema = z.any();

      const personSchema = z.any();

      const villainSchema = z.any();

      export const supermanSchema = z.object({
          name: nameSchema,
          person: personSchema,
          nemesis: villainSchema,
          id: z.number()
      });
      "
      `);
      });
    });

    describe("multiple imports from single module", () => {
      const sourceText = `
      import { Name, Person, Villain } from "./module";
  
      export interface Superman {
        name: Name;
        person: Person;
        nemesis: Villain;
        id: number
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
      });

      it("should generate the zod schemas", () => {
        expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
      "// Generated by ts-to-zod
      import { z } from "zod";

      const nameSchema = z.any();

      const personSchema = z.any();

      const villainSchema = z.any();

      export const supermanSchema = z.object({
          name: nameSchema,
          person: personSchema,
          nemesis: villainSchema,
          id: z.number()
      });
      "
      `);
      });
    });

    describe("import as extend", () => {
      const sourceText = `
      import * as Person from "person-module";
  
      export interface Superman extends Person{
        id: number
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
      });

      it("should generate the zod schemas", () => {
        expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
      "// Generated by ts-to-zod
      import { z } from "zod";

      const personSchema = z.any();

      export const supermanSchema = personSchema.extend({
          id: z.number()
      });
      "
      `);
      });
    });

    describe("import as union", () => {
      const sourceText = `
      import { Hero, Villain } from "module"
    
      export interface Person {
        id: number
        type: Hero | Villain
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
      });

      it("should generate the zod schemas", () => {
        expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        const heroSchema = z.any();

        const villainSchema = z.any();

        export const personSchema = z.object({
            id: z.number(),
            type: z.union([heroSchema, villainSchema])
        });
        "
      `);
      });
    });

    describe("import as union with object literal", () => {
      const sourceText = `
      import { Hero } from "module"
    
      export type Person = Hero | { name: string }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
      });

      it("should generate the zod schemas", () => {
        expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        const heroSchema = z.any();

        export const personSchema = z.union([heroSchema, z.object({
                name: z.string()
            })]);
        "
      `);
      });
    });

    describe("import as array of union of imported types", () => {
      const sourceText = `
      import { Hero } from "module"
    
      import { Villain } from "module"
    
      export type Person = (Hero | Villain)[]
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
      });

      it("should generate the zod schemas", () => {
        expect(getZodSchemasFile("./source")).toMatchInlineSnapshot(`
      "// Generated by ts-to-zod
      import { z } from "zod";

      const heroSchema = z.any();

      const villainSchema = z.any();

      export const personSchema = z.array(z.union([heroSchema, villainSchema]));
      "
      `);
      });
    });
  });

  describe("with input/output mappings to manage imports", () => {
    describe("one import in one statement", () => {
      const input = "./hero";
      const output = "./hero.zod";
      const inputOutputMappings = [{ input, output }];

      const sourceText = `
      import { Hero } from "${input}"
    
      export interface Person {
        id: number
        hero: Hero
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
        inputOutputMappings,
      });

      it("should generate the zod schemas with right import", () => {
        expect(getZodSchemasFile(input)).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import { heroSchema } from "${output}";

        export const personSchema = z.object({
            id: z.number(),
            hero: heroSchema
        });
        "
      `);
      });
    });

    describe("multiple imports from one statement", () => {
      const input = "./hero";
      const output = "./hero.zod";
      const inputOutputMappings = [{ input, output }];

      const sourceText = `
      import { Hero, Villain} from "${input}"
    
      export interface Person {
        id: number
        hero: Hero
        villain: Villain
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
        inputOutputMappings,
      });

      it("should generate the zod schemas with right import", () => {
        expect(getZodSchemasFile(input)).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import { heroSchema, villainSchema } from "${output}";

        export const personSchema = z.object({
            id: z.number(),
            hero: heroSchema,
            villain: villainSchema
        });
        "
      `);
      });
    });

    describe("imports from multiple statement", () => {
      const input = "./hero";
      const output = "./hero.zod";
      const input2 = "./villain";
      const output2 = "./villain.zod";
      const inputOutputMappings = [
        { input, output },
        { input: input2, output: output2 },
      ];

      const sourceText = `
      import { Hero } from "${input}"
      import Villain from "${input2}"
    
      export interface Person {
        id: number
        hero: Hero
        villain: Villain
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
        inputOutputMappings,
      });

      it("should generate the zod schemas with right import", () => {
        expect(getZodSchemasFile(input)).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import { heroSchema } from "${output}";
        import { villainSchema } from "${output2}";

        export const personSchema = z.object({
            id: z.number(),
            hero: heroSchema,
            villain: villainSchema
        });
        "
      `);
      });
    });

    describe("one import in one statement, alternate getSchemaName for mapping", () => {
      const input = "./hero";
      const output = "./hero.zod";
      const inputOutputMappings: InputOutputMapping[] = [
        { input, output, getSchemaName: (id) => `z${id}` },
      ];

      const sourceText = `
      import { Hero } from "${input}"
    
      export interface Person {
        id: number
        hero: Hero
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
        inputOutputMappings,
      });

      it("should generate the zod schemas with right import", () => {
        expect(getZodSchemasFile(input)).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import { zHero } from "${output}";

        export const personSchema = z.object({
            id: z.number(),
            hero: zHero
        });
        "
      `);
      });
    });

    describe("one import in one statement, alternate getSchemaName for generate", () => {
      const input = "./hero";
      const output = "./hero.zod";
      const inputOutputMappings: InputOutputMapping[] = [{ input, output }];

      const sourceText = `
      import { Hero } from "${input}"
    
      export interface Person {
        id: number
        hero: Hero
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
        inputOutputMappings,
        getSchemaName: (id) => `z${id}`, // should be used only for Person
      });

      it("should generate the zod schemas with right import", () => {
        expect(getZodSchemasFile(input)).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";

        import { zHero } from "${output}";

        export const zPerson = z.object({
            id: z.number(),
            hero: zHero
        });
        "
      `);
      });
    });

    describe("mixed imports, 3rd party & zod", () => {
      const input = "./hero";
      const output = "./hero.zod";
      const inputOutputMappings: InputOutputMapping[] = [{ input, output }];

      const sourceText = `
      import { Hero } from "${input}"

      import Villain from "module"
    
      export interface Person {
        id: number
        hero: Hero
        villain: Villain
      }
      `;

      const { getZodSchemasFile } = generate({
        sourceText,
        inputOutputMappings,
      });

      it("should generate the zod schemas with right import", () => {
        expect(getZodSchemasFile(input)).toMatchInlineSnapshot(`
        "// Generated by ts-to-zod
        import { z } from "zod";
        
        import { heroSchema } from "${output}";
        
        const villainSchema = z.any();
        
        export const personSchema = z.object({
            id: z.number(),
            hero: heroSchema,
            villain: villainSchema
        });
        "
      `);
      });
    });
  });
});
