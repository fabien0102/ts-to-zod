import { camel } from "case";
import ts from "typescript";
import type { CustomJSDocFormatTypes } from "../config";
import { findNode } from "../utils/findNode";
import { generateZodSchemaVariableStatement } from "./generateZodSchema";

describe("generateZodSchema", () => {
  it("should generate a string schema", () => {
    const source = `export type MyHeroName = string;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const myHeroNameSchema = z.string();"`
    );
  });

  it("should generate a number schema", () => {
    const source = `export type MyHeroAge = number;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const myHeroAgeSchema = z.number();"`
    );
  });

  it("should generate an any schema", () => {
    const source = `export type MyHeroPower = any;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const myHeroPowerSchema = z.any();"`
    );
  });

  it("should generate a boolean schema", () => {
    const source = `export type HavePower = boolean;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const havePowerSchema = z.boolean();"`
    );
  });

  it("should generate an undefined schema", () => {
    const source = `export type Nothing = undefined;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const nothingSchema = z.undefined();"`
    );
  });

  it("should generate a null schema", () => {
    const source = `export type MyHeroWeakness = null;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const myHeroWeaknessSchema = z.null();"`
    );
  });

  it("should generate a void schema", () => {
    const source = `export type MyEnemyChance = void;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const myEnemyChanceSchema = z.void();"`
    );
  });

  it("should generate a bigint schema", () => {
    const source = `export type loisLaneCapturedCount = bigint;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const loisLaneCapturedCountSchema = z.bigint();"`
    );
  });

  it("should generate a date schema", () => {
    const source = `export type lastIncidentInMetropolis = Date;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const lastIncidentInMetropolisSchema = z.date();"`
    );
  });

  it("should generate a literal schema (string)", () => {
    const source = `export type Kryptonite = "kryptonite";`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const kryptoniteSchema = z.literal("kryptonite");"`
    );
  });

  it("should generate a literal schema (number)", () => {
    const source = `export type IdentitiesCount = 2;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const identitiesCountSchema = z.literal(2);"`
    );
  });

  it("should generate a literal schema (zero)", () => {
    const source = `export type IdentitiesCount = 0;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const identitiesCountSchema = z.literal(0);"`
    );
  });

  it("should generate a literal schema (negative number)", () => {
    const source = `export type IdentitiesCount = -1;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const identitiesCountSchema = z.literal(-1);"`
    );
  });

  it("should generate a literal schema (true)", () => {
    const source = `export type IsSuperman = true;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const isSupermanSchema = z.literal(true);"`
    );
  });

  it("should generate a literal schema (false)", () => {
    const source = `export type CanBeatZod = false;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const canBeatZodSchema = z.literal(false);"`
    );
  });

  it("should generate a literal schema (enum)", () => {
    const source = `
    export type BestSuperhero = {
      superhero: Superhero.Superman
    };
    `;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const bestSuperheroSchema = z.object({
          superhero: z.literal(Superhero.Superman)
      });"
    `);
  });

  it("should generate a nativeEnum schema", () => {
    const source = `export enum Superhero = {
      Superman = "superman",
      ClarkKent = "clark_kent",
    };`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const superheroSchema = z.nativeEnum(Superhero);"`
    );
  });

  it("should generate a never", () => {
    const source = `export type CanBeatZod = never;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const canBeatZodSchema = z.never();"`
    );
  });

  it("should map unknown type correctly", () => {
    const source = `export type T = unknown;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const tSchema = z.unknown();"`
    );
  });

  it("should generate an array schema (T[] notation)", () => {
    const source = `export type Villains = string[];`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const villainsSchema = z.array(z.string());"`
    );
  });

  it("should generate an array schema (Array<T> notation)", () => {
    const source = `export type Villains = Array<string>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const villainsSchema = z.array(z.string());"`
    );
  });

  it("should generate a tuple schema", () => {
    const source = `export type Life = [LoisLane, Problem[]];`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const lifeSchema = z.tuple([loisLaneSchema, z.array(problemSchema)]);"`
    );
  });

  it("should generate a tuple schema (named)", () => {
    const source = `export type Story = [subject: string, problems: string[]];`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const storySchema = z.tuple([z.string(), z.array(z.string())]);"`
    );
  });

  it("should generate a tuple schema with rest operator", () => {
    const source = `export type Life = [LoisLane, ...Problem[]];`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const lifeSchema = z.tuple([loisLaneSchema]).rest(problemSchema);"`
    );
  });

  it("should generate an object schema", () => {
    const source = `export type Superman = {
     name: "superman";
     weakness: Kryptonite;
     age: number;
     enemies: Array<string>;
   };`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const supermanSchema = z.object({
          name: z.literal("superman"),
          weakness: kryptoniteSchema,
          age: z.number(),
          enemies: z.array(z.string())
      });"
    `);
  });

  it("should generate a numerical key", () => {
    const source = `export type responses = {
     200: {
      content: {
        "application/json": {
          id: string
        }
      }
     }
   };`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const responsesSchema = z.object({
          200: z.object({
              content: z.object({
                  "application/json": z.object({
                      id: z.string()
                  })
              })
          })
      });"
    `);
  });

  it("should generate a promise schema", () => {
    const source = `export type KrytonResponse = Promise<boolean>`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const krytonResponseSchema = z.promise(z.boolean());"`
    );
  });

  it("should generate a referenced schema", () => {
    const source = `export type Villain = BadGuy;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const villainSchema = badGuySchema;"`
    );
  });

  it("should generate a union schema", () => {
    const source = `export type Identity = "superman" | "clark kent";`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const identitySchema = z.union([z.literal("superman"), z.literal("clark kent")]);"`
    );
  });

  it("should generate a literal schema for a single union", () => {
    const source = `export type Identity = | "superman";`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const identitySchema = z.literal("superman");"`
    );
  });

  it("should generate two joined schemas", () => {
    const source = `export type SupermanWithWeakness = Superman & { weakness: Kryptonite };`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const supermanWithWeaknessSchema = supermanSchema.and(z.object({
          weakness: kryptoniteSchema
      }));"
    `);
  });

  it("should generate a record schema", () => {
    const source = `export type EnemiesPowers = Record<string, Power>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const enemiesPowersSchema = z.record(powerSchema);"`
    );
  });

  it("should generate a set schema", () => {
    const source = `export type EnemiesPowers = Set<string>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const enemiesPowersSchema = z.set(z.string());"`
    );
  });

  it("should generate a function schema", () => {
    const source = `export type KillSuperman = (withKryptonite: boolean, method: string) => Promise<boolean>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const killSupermanSchema = z.function().args(z.boolean(), z.string()).returns(z.promise(z.boolean()));"`
    );
  });

  it("should generate a function with optional parameter", () => {
    const source = `export type GetSupermanSkill = (
      key: string,
      params?: Record<string, string | number>
    ) => string`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const getSupermanSkillSchema = z.function().args(z.string(), z.record(z.union([z.string(), z.number()])).optional()).returns(z.string());"`
    );
  });

  it("should generate a function schema (with `any` fallback on param)", () => {
    const source = `export type KillSuperman = (withKryptonite: boolean, method) => Promise<boolean>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const killSupermanSchema = z.function().args(z.boolean(), z.any()).returns(z.promise(z.boolean()));"`
    );
  });

  it("should throw on not supported key in omit", () => {
    const source = `export type UnsupportedType = Omit<Superman, Krytonite>;`;
    expect(() => generate(source)).toThrowErrorMatchingInlineSnapshot(
      `"Omit<T, K> unknown syntax: (TypeReference as K not supported)"`
    );
  });

  it("should throw on not supported interface with extends and index signature", () => {
    const source = `export interface Superman extends Clark {
     [key: string]: any;
   };`;

    expect(() => generate(source)).toThrowErrorMatchingInlineSnapshot(
      `"interface with \`extends\` and index signature are not supported!"`
    );
  });

  it("should throw on not supported key in omit (union)", () => {
    const source = `export type UnsupportedType = Omit<Superman, Krytonite | LoisLane>;`;
    expect(() => generate(source)).toThrowErrorMatchingInlineSnapshot(
      `"Omit<T, K> unknown syntax: (TypeReference as K union part not supported)"`
    );
  });

  it("should throw on not supported key in pick", () => {
    const source = `export type UnsupportedType = Pick<Superman, Krytonite>;`;
    expect(() => generate(source)).toThrowErrorMatchingInlineSnapshot(
      `"Pick<T, K> unknown syntax: (TypeReference as K not supported)"`
    );
  });

  it("should throw on not supported key in pick (union)", () => {
    const source = `export type UnsupportedType = Pick<Superman, Krytonite | LoisLane>;`;
    expect(() => generate(source)).toThrowErrorMatchingInlineSnapshot(
      `"Pick<T, K> unknown syntax: (TypeReference as K union part not supported)"`
    );
  });

  it("should fallback on the original type for Readonly<T>", () => {
    const source = `export type ReadonlySuperman = Readonly<Superman>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const readonlySupermanSchema = supermanSchema;"`
    );
  });

  it("should fallback on Array for ReadonlyArray<T>", () => {
    const source = `export type ReadonlySupermen = ReadonlyArray<Superman>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const readonlySupermenSchema = z.array(supermanSchema);"`
    );
  });

  it("should generate a partial schema", () => {
    const source = `export type SupermanUnderKryptonite = Partial<Hero>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanUnderKryptoniteSchema = heroSchema.partial();"`
    );
  });

  it("should generate a required schema", () => {
    const source = `export type IDidFindYou = Required<VillainLocation>;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const iDidFindYouSchema = villainLocationSchema.required();"`
    );
  });

  it("should generate a schema with omit ", () => {
    const source = `export type InvincibleSuperman = Omit<Superman, "weakness">;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const invincibleSupermanSchema = supermanSchema.omit({ "weakness": true });"`
    );
  });

  it("should generate a schema with omit (multiple keys)", () => {
    const source = `export type VeryInvincibleSuperman = Omit<Superman, "weakness" | "wife">;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const veryInvincibleSupermanSchema = supermanSchema.omit({ "weakness": true, "wife": true });"`
    );
  });

  it("should generate a schema with omit in interface extension clause", () => {
    const source = `export interface Superman extends Omit<Clark, "weakness"> {
     withPower: boolean;
   }`;
    expect(generate(source)).toMatchInlineSnapshot(`
    "export const supermanSchema = clarkSchema.omit({ "weakness": true }).extend({
        withPower: z.boolean()
    });"
  `);
  });

  it("should generate a schema with pick", () => {
    const source = `export type YouJustKnowMyName = Pick<SecretIdentity, "name">;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const youJustKnowMyNameSchema = secretIdentitySchema.pick({ "name": true });"`
    );
  });

  it("should generate a schema with pick (multiple keys)", () => {
    const source = `export type YouKnowTooMuch = Pick<SecretIdentity, "name" | "location">;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const youKnowTooMuchSchema = secretIdentitySchema.pick({ "name": true, "location": true });"`
    );
  });

  it("should generate a complex schema from an interface", () => {
    const source = `export interface Superman {
     name: "superman" | "clark kent" | "kal-l";
     enemies: Record<string, Enemy>;
     age: number;
     underKryptonite?: boolean;
     needGlasses: true | null;
   };`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const supermanSchema = z.object({
          name: z.union([z.literal("superman"), z.literal("clark kent"), z.literal("kal-l")]),
          enemies: z.record(enemySchema),
          age: z.number(),
          underKryptonite: z.boolean().optional(),
          needGlasses: z.literal(true).nullable()
      });"
    `);
  });

  it("should generate an extended schema", () => {
    const source = `export interface Superman extends Clark {
     withPower: boolean;
   }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const supermanSchema = clarkSchema.extend({
          withPower: z.boolean()
      });"
    `);
  });

  it("should generate an variable assignment if an extending type has no new fields", () => {
    const source = "export interface Superman extends Clark {}";
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanSchema = clarkSchema;"`
    );
  });

  it("should generate a merged schema when two extends are used", () => {
    const source = `export interface Superman extends Clark extends KalL {
        withPower: boolean;
     };`;

    expect(generate(source)).toMatchInlineSnapshot(`
        "export const supermanSchema = clarkSchema.extend(kalLSchema.shape).extend({
            withPower: z.boolean()
        });"
      `);
  });

  it("should generate a merged schema when extending with two comma-separated interfaces", () => {
    const source = `export interface Superman extends Clark, KalL {
        withPower: boolean;
     };`;

    expect(generate(source)).toMatchInlineSnapshot(`
        "export const supermanSchema = clarkSchema.extend(kalLSchema.shape).extend({
            withPower: z.boolean()
        });"
      `);
  });

  it("should generate a merged schema when extending with multiple comma-separated interfaces", () => {
    const source = `export interface Superman extends Clark, KalL, Kryptonian {
        withPower: boolean;
     };`;

    expect(generate(source)).toMatchInlineSnapshot(`
        "export const supermanSchema = clarkSchema.extend(kalLSchema.shape).extend(kryptonianSchema.shape).extend({
            withPower: z.boolean()
        });"
      `);
  });

  it("should generate a schema with omit in interface extension clause and multiple clauses", () => {
    const source = `export interface Superman extends KalL, Omit<Clark, "weakness">, Kryptonian {
     withPower: boolean;
   }`;
    expect(generate(source)).toMatchInlineSnapshot(`
    "export const supermanSchema = kalLSchema.extend(clarkSchema.omit({ "weakness": true }).shape).extend(kryptonianSchema.shape).extend({
        withPower: z.boolean()
    });"
  `);
  });

  it("should deal with literal keys", () => {
    const source = `export interface Villain {
     "i.will.kill.everybody": true;
   };`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const villainSchema = z.object({
          "i.will.kill.everybody": z.literal(true)
      });"
    `);
  });

  it("should deal with index access type (1st level)", () => {
    const source = `export type SupermanName = Superman["name"]`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanNameSchema = supermanSchema.shape.name;"`
    );
  });

  it("should deal with index access type (nested level)", () => {
    const source = `export type SupermanFlyPower = Superman["power"]["fly"]`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanFlyPowerSchema = supermanSchema.shape.power.shape.fly;"`
    );
  });

  it("should deal with index access type (array item)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1];

    export type Superman = {
      powers: Array<Power>
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.element;"`
    );
  });

  it("should deal with index access type (array item bis)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1];

    export type Superman = {
      powers: Power[]
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.element;"`
    );
  });

  it("should deal with index access type (record item)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1];

    export type Superman = {
      powers: Record<string, Power>
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.valueSchema;"`
    );
  });

  it("should deal with index access type (record item) (interface)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1];

    export interface Superman {
      powers: Record<string, Power>
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.valueSchema;"`
    );
  });

  it("should deal with nullable index access type (1st level)", () => {
    const source = `export type SupermanName = Superman["name"] | null`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanNameSchema = supermanSchema.shape.name.nullable();"`
    );
  });

  it("should deal with optional index access type (1st level)", () => {
    const source = `export type SupermanName = {
      name?: Superman["name"]
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const supermanNameSchema = z.object({
          name: supermanSchema.shape.name.optional()
      });"
      `);
  });

  it("should deal with index access type using single quote (1st level)", () => {
    const source = `export type SupermanName = {
      name?: Superman['name']
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const supermanNameSchema = z.object({
          name: supermanSchema.shape.name.optional()
      });"
      `);
  });

  it("should deal with index access type with element access expression (1st level)", () => {
    const source = `export type SupermanName = {
      firstName: Superman["name.firstName"]
      lastName: Superman["name-lastName"]
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const supermanNameSchema = z.object({
          firstName: supermanSchema.shape["name.firstName"],
          lastName: supermanSchema.shape["name-lastName"]
      });"
      `);
  });

  it("should deal with record with a union as key", () => {
    const source = `
    export type AvailablePower = Record<Power, boolean>;
    `;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const availablePowerSchema = z.record(powerSchema, z.boolean());"`
    );
  });

  it("should deal with index access type (tuple)", () => {
    const source = `export type SupermanPower = Superman["powers"][1];

    export type Superman = {
      powers: ["fly", "burnStuff"]
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.items[1];"`
    );
  });

  // TODO
  it.skip("should deal with index access type (nested array item)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1][-1];

    export type Superman = {
      powers: Power[][]
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.element.element;"`
    );
  });

  it("should deal with index access type (inline array item)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1];

    export type Superman = {
      powers: Array<{type: string}>
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.element;"`
    );
  });

  it("should deal with index access type (inline array item bis)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1];

    export type Superman = {
      powers: {type: string}[]
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.element;"`
    );
  });

  it("should deal with index access type (inline record)", () => {
    const source = `export type SupermanPower = Superman["powers"][-1];

    export type Superman = {
      powers: Record<string, {type: string}>
    };`;

    expect(generate(source)).toMatchInlineSnapshot(
      `"export const supermanPowerSchema = supermanSchema.shape.powers.valueSchema;"`
    );
  });

  it("should deal with parenthesized schema type", () => {
    const source = `export type SecretVillain = (NormalGuy | Villain);`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const secretVillainSchema = z.union([normalGuySchema, villainSchema]);"`
    );
  });

  it("should deal with parenthesized type or null", () => {
    const source = `export type SecretVillain = (NormalGuy | Villain) | null;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const secretVillainSchema = z.union([normalGuySchema, villainSchema]).nullable();"`
    );
  });

  it("should deal with literal parenthesized type or null", () => {
    const source = `export type Example = ("A" | "B") | null;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const exampleSchema = z.union([z.literal("A"), z.literal("B")]).nullable();"`
    );
  });

  it("should deal with joined schema parenthesized type or null", () => {
    const source = `export type person = (NormalGuy & BadGuy & randomGuy) | null;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const personSchema = normalGuySchema.and(badGuySchema).and(randomGuySchema).nullable();"`
    );
  });

  it("should deal with index signature", () => {
    const source = `export type Movies = {[title: string]: Movie};`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const moviesSchema = z.record(movieSchema);"`
    );
  });

  it("should deal with composed index signature", () => {
    const source = `export type Movies = {
      "Man of Steel": Movie & {title: "Man of Steel"};
      [title: string]: Movie;
    };`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const moviesSchema = z.record(movieSchema).and(z.object({
          "Man of Steel": movieSchema.and(z.object({
              title: z.literal("Man of Steel")
          }))
      }));"
    `);
  });

  it("should deal with optional index signature", () => {
    const source = `export interface Collection {
      movies?: {[title: string] : Movie}
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const collectionSchema = z.object({
          movies: z.record(movieSchema).optional()
      });"
    `);
  });

  it("should deal with optional array", () => {
    const source = `export interface Collection {
      movies?: Array<string>
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const collectionSchema = z.object({
          movies: z.array(z.string()).optional()
      });"
    `);
  });

  it("should generate an empty object schema", () => {
    const source = `export type Empty = {};`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const emptySchema = z.object({});"`
    );
  });

  it("should generate an object schema", () => {
    const source = `export type Object = object;`;
    expect(generate(source)).toMatchInlineSnapshot(
      `"export const objectSchema = z.record(z.any());"`
    );
  });

  it("should generate custom validators based on jsdoc tags", () => {
    const source = `export interface HeroContact {
      /**
       * The email of the hero.
       *
       * @format email
       */
      email: string;

      /**
       * The name of the hero.
       *
       * @minLength 2
       * @maxLength 50
       */
      name: string;

      /**
       * The phone number of the hero.
       *
       * @pattern ^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$
       */
      phoneNumber: string;

      /**
       * Does the hero has super power?
       *
       * @default true
       */
      hasSuperPower?: boolean;

      /**
       * The age of the hero
       *
       * @minimum 0
       * @maximum 500
       */
      age: number;

      /**
       * Hero last seen.
       *
       * @format date-time
       */
      lastSeen: string;

      /**
       * The hero's birthday.
       *
       * @format date
       */
      birthday: string;

      /**
       * The hero's wakeup-time.
       *
       * @format time
       */
      wakeupTime: string;

      /**
       * The hero's super power boost duration.
       *
       * @format duration
       */
      boost: string;

      /**
       * The hero's ipv4 address.
       *
       * @format ipv4
       */
      ipv4: string;

      /**
       * The hero's ipv6 address.
       *
       * @format ipv6
       */
      ipv6: string;

      /**
       * The hero's ip address.
       *
       * @format ip
       */
      ip: string;

      /**
       * The hero's known IPs
       *
       * @elementFormat ip
       * @maxLength 5
       */
      knownIps: Array<string>;

      /**
       * The hero's last ping times
       *
       * @elementMinimum 0
       * @elementMaximum 100
       * @minLength 1
       * @maxLength 10
       */
      pingTimes: number[];

      /**
       * The hero's blocked phone numbers.
       *
       * @elementPattern ^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$
       * @minLength 56
       * @maxLength 123
       */
      blockedPhoneNumbers: string[];

      /**
       * The angle of the hero's raised or furrowed eyebrow.
       *
       * @minimum -45 @maximum -5 @default -20
       */
      eyebrowAngle: number;
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const heroContactSchema = z.object({
          /**
           * The email of the hero.
           *
           * @format email
           */
          email: z.string().email(),
          /**
           * The name of the hero.
           *
           * @minLength 2
           * @maxLength 50
           */
          name: z.string().min(2).max(50),
          /**
           * The phone number of the hero.
           *
           * @pattern ^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$
           */
          phoneNumber: z.string().regex(/^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$/),
          /**
           * Does the hero has super power?
           *
           * @default true
           */
          hasSuperPower: z.boolean().optional().default(true),
          /**
           * The age of the hero
           *
           * @minimum 0
           * @maximum 500
           */
          age: z.number().min(0).max(500),
          /**
           * Hero last seen.
           *
           * @format date-time
           */
          lastSeen: z.string().datetime(),
          /**
           * The hero's birthday.
           *
           * @format date
           */
          birthday: z.string().date(),
          /**
           * The hero's wakeup-time.
           *
           * @format time
           */
          wakeupTime: z.string().time(),
          /**
           * The hero's super power boost duration.
           *
           * @format duration
           */
          boost: z.string().duration(),
          /**
           * The hero's ipv4 address.
           *
           * @format ipv4
           */
          ipv4: z.string().ip({ version: "v4" }),
          /**
           * The hero's ipv6 address.
           *
           * @format ipv6
           */
          ipv6: z.string().ip({ version: "v6" }),
          /**
           * The hero's ip address.
           *
           * @format ip
           */
          ip: z.string().ip(),
          /**
           * The hero's known IPs
           *
           * @elementFormat ip
           * @maxLength 5
           */
          knownIps: z.array(z.string().ip()).max(5),
          /**
           * The hero's last ping times
           *
           * @elementMinimum 0
           * @elementMaximum 100
           * @minLength 1
           * @maxLength 10
           */
          pingTimes: z.array(z.number().min(0).max(100)).min(1).max(10),
          /**
           * The hero's blocked phone numbers.
           *
           * @elementPattern ^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$
           * @minLength 56
           * @maxLength 123
           */
          blockedPhoneNumbers: z.array(z.string().regex(/^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$/)).min(56).max(123),
          /**
           * The angle of the hero's raised or furrowed eyebrow.
           *
           * @minimum -45 @maximum -5 @default -20
           */
          eyebrowAngle: z.number().min(-45).max(-5).default(-20)
      });"
    `);
  });

  it("should append schema based on `schema` tag", () => {
    const source = `export interface HeroContact {
      /**
       * The email of the hero.
       *
       * @schema .trim().catch('hello@world.com')
       */
      email: string;
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const heroContactSchema = z.object({
          /**
           * The email of the hero.
           *
           * @schema .trim().catch('hello@world.com')
           */
          email: z.string().trim().catch('hello@world.com')
      });"
    `);
  });

  it("should overrride schema based on `schema` tag", () => {
    const source = `export interface HeroContact {
      /**
       * The email of the hero.
       *
       * @schema coerce.int()
       */
      age: number;
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const heroContactSchema = z.object({
          /**
           * The email of the hero.
           *
           * @schema coerce.int()
           */
          age: z.coerce.int()
      });"
    `);
  });

  it("should generate custom error message for `format` tag", () => {
    const source = `export interface HeroContact {
      /**
       * The email of the hero.
       *
       * @format email Should be an email
       */
      heroEmail: string;

      /**
       * The email of the enemy.
       *
       * @format email, "Should be an email"
       */
      enemyEmail: string;

      /**
       * The email of the superman.
       *
       * @format email "Should be an email"
       */
      supermanEmail: string;

      /**
       * The hero's ipv6 address.
       *
       * @format ipv6 Must be an ipv6 address
       */
      ipv6: string;

      /**
       * The hero's ip address.
       *
       * @format ip "Must be a ipv4 or an ipv6 address"
       */
      ip: string;
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const heroContactSchema = z.object({
          /**
           * The email of the hero.
           *
           * @format email Should be an email
           */
          heroEmail: z.string().email("Should be an email"),
          /**
           * The email of the enemy.
           *
           * @format email, "Should be an email"
           */
          enemyEmail: z.string().email("Should be an email"),
          /**
           * The email of the superman.
           *
           * @format email "Should be an email"
           */
          supermanEmail: z.string().email("Should be an email"),
          /**
           * The hero's ipv6 address.
           *
           * @format ipv6 Must be an ipv6 address
           */
          ipv6: z.string().ip({ version: "v6", message: "Must be an ipv6 address" }),
          /**
           * The hero's ip address.
           *
           * @format ip "Must be a ipv4 or an ipv6 address"
           */
          ip: z.string().ip("Must be a ipv4 or an ipv6 address")
      });"
    `);
  });

  it("should generate custom error message based on jsdoc tags", () => {
    const source = `export interface HeroContact {
      /**
       * The email of the hero.
       *
       * @format email should be an email
       */
      email: string;

      /**
       * The name of the hero.
       *
       * @minLength 2, should be more than 2
       * @maxLength 50 should be less than 50
       */
      name: string;

      /**
       * The age of the hero
       *
       * @minimum 0 you are too young
       * @maximum 500, "you are too old"
       */
      age: number;
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const heroContactSchema = z.object({
          /**
           * The email of the hero.
           *
           * @format email should be an email
           */
          email: z.string().email("should be an email"),
          /**
           * The name of the hero.
           *
           * @minLength 2, should be more than 2
           * @maxLength 50 should be less than 50
           */
          name: z.string().min(2, "should be more than 2").max(50, "should be less than 50"),
          /**
           * The age of the hero
           *
           * @minimum 0 you are too young
           * @maximum 500, "you are too old"
           */
          age: z.number().min(0, "you are too young").max(500, "you are too old")
      });"
    `);
  });

  it("should generate custom error messages for custom jsdoc format types", () => {
    const source = `export interface Info {
      /**
       * A birthday.
       *
       * @format date
       */
      birthday: string;

      /**
       * A phone number.
       *
       * @format phone-number
       */
      phoneNumber: string;

      /**
       * A price.
       *
       * @format price Must start with "$" and end with cents.
       */
      cost: string;
    }`;
    expect(
      generate(source, undefined, undefined, {
        date: {
          regex: "^\\d{4}-\\d{2}-\\d{2}$",
          errorMessage: "Must be in YYYY-MM-DD format.",
        },

        "phone-number": "^\\d{3}-\\d{3}-\\d{4}$",
        price: "^$\\d+.\\d{2}$",
      })
    ).toMatchInlineSnapshot(`
      "export const infoSchema = z.object({
          /**
           * A birthday.
           *
           * @format date
           */
          birthday: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/, "Must be in YYYY-MM-DD format."),
          /**
           * A phone number.
           *
           * @format phone-number
           */
          phoneNumber: z.string().regex(/^\\d{3}-\\d{3}-\\d{4}$/),
          /**
           * A price.
           *
           * @format price Must start with "$" and end with cents.
           */
          cost: z.string().regex(/^$\\d+.\\d{2}$/, "Must start with \\"$\\" and end with cents.")
      });"
    `);
  });

  it("should generate validator on top-level types", () => {
    const source = `/**
    * @minLength 1
    */
    export type NonEmptyString = string;`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "/**
          * @minLength 1
          */
      export const nonEmptyStringSchema = z.string().min(1);"
    `);
  });

  it("should generate add strict() validation when @strict is used", () => {
    const source = `/**
    * @strict
    */
    export type Superman = {
      name: "superman";
      weakness: Kryptonite;
      age: number;
      enemies: Array<string>;
    };`;
    expect(generate(source)).toMatchInlineSnapshot(`
       "/**
           * @strict
           */
       export const supermanSchema = z.object({
           name: z.literal("superman"),
           weakness: kryptoniteSchema,
           age: z.number(),
           enemies: z.array(z.string())
       }).strict();"
     `);
  });

  it("should add strict() validation when @strict is used on subtype", () => {
    const source = `export interface A {
      /** @strict */
      a: {
        b: number
      }
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          /** @strict */
          a: z.object({
              b: z.number()
          }).strict()
      });"
    `);
  });

  it("should add strict() before optional() validation when @strict is used on optional subtype", () => {
    const source = `export interface A {
      /** @strict */
      a?: {
        b: number
      }
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          /** @strict */
          a: z.object({
              b: z.number()
          }).strict().optional()
      });"
    `);
  });

  it("should add strict() before nullable() validation when @strict is used on nullable subtype", () => {
    const source = `export interface A {
      /** @strict */
      a: {
        b: number
      } | null
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          /** @strict */
          a: z.object({
              b: z.number()
          }).strict().nullable()
      });"
    `);
  });

  it("should add describe() when @description is used (top-level)", () => {
    const source = `/**
    * @description Originally Superman could leap, but not fly.
    */
    export type Superman = {
      name: "superman";
      weakness: Kryptonite;
      age: number;
      enemies: Array<string>;
    };`;
    expect(generate(source)).toMatchInlineSnapshot(`
       "/**
           * @description Originally Superman could leap, but not fly.
           */
       export const supermanSchema = z.object({
           name: z.literal("superman"),
           weakness: kryptoniteSchema,
           age: z.number(),
           enemies: z.array(z.string())
       }).describe("Originally Superman could leap, but not fly.");"
     `);
  });

  it("should add describe() when @description is used (property-level)", () => {
    const source = `
    export type Superman = {
      name: "superman";
      weakness: Kryptonite;
      age: number;
      /**
        * @description Lex Luthor, Branaic, etc.
        */
      enemies: Array<string>;
    };`;
    expect(generate(source)).toMatchInlineSnapshot(`
       "export const supermanSchema = z.object({
           name: z.literal("superman"),
           weakness: kryptoniteSchema,
           age: z.number(),
           /**
             * @description Lex Luthor, Branaic, etc.
             */
           enemies: z.array(z.string()).describe("Lex Luthor, Branaic, etc.")
       });"
     `);
  });

  it("should add describe() when @description is used (array elements)", () => {
    const source = `
    export type Superman = {
      name: "superman";
      weakness: Kryptonite;
      age: number;
      /**
        * @elementDescription Name of an enemy
        */
      enemies: Array<string>;
    };`;
    expect(generate(source)).toMatchInlineSnapshot(`
       "export const supermanSchema = z.object({
           name: z.literal("superman"),
           weakness: kryptoniteSchema,
           age: z.number(),
           /**
             * @elementDescription Name of an enemy
             */
           enemies: z.array(z.string().describe("Name of an enemy"))
       });"
     `);
  });

  it("should deal with nullable", () => {
    const source = `export interface A {
      /** @minimum 0 */
      a: number | null;
      /** @minLength 1 */
      b: string | null;
      /** @pattern ^c$ */
      c: string | null;
    }
    `;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          /** @minimum 0 */
          a: z.number().min(0).nullable(),
          /** @minLength 1 */
          b: z.string().min(1).nullable(),
          /** @pattern ^c$ */
          c: z.string().regex(/^c$/).nullable()
      });"
    `);
  });

  it("should allow nullable on optional properties", () => {
    const source = `export interface A {
      a?: number | null;
    }
    `;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          a: z.number().optional().nullable()
      });"
    `);
  });

  it("should deal with array of null or null", () => {
    const source = `export type Example = {
        field?: Array<string | null> | null
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const exampleSchema = z.object({
          field: z.array(z.string().nullable()).optional().nullable()
      });"
    `);
  });

  it("should deal with partial or null", () => {
    const source = `export type Example = {
        field: Partial<{foo: string}> | null
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const exampleSchema = z.object({
          field: z.object({
              foo: z.string()
          }).partial().nullable()
      });"
    `);
  });

  it("should deal with optional partial", () => {
    const source = `export type Example = {
        field?: Partial<{foo: string}>
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const exampleSchema = z.object({
          field: z.object({
              foo: z.string()
          }).partial().optional()
      });"
    `);
  });

  it("should deal with ReadonlyArray or null", () => {
    const source = `export type Example = {
        field: ReadonlyArray<"foo" | "bar"> | null
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const exampleSchema = z.object({
          field: z.array(z.union([z.literal("foo"), z.literal("bar")])).nullable()
      });"
    `);
  });

  it("should deal with Record or null", () => {
    const source = `export type Example = {
        field: Record<string, string> | null
    }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const exampleSchema = z.object({
          field: z.record(z.string()).nullable()
      });"
    `);
  });

  it("should allow nullable on union properties", () => {
    const source = `export interface A {
      a: number | string | null;
    }
    `;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          a: z.union([z.number(), z.string()]).nullable()
      });"
    `);
  });

  it("should handle parenthesis type nodes", () => {
    const source = `export interface A {
      a: (number) | string | null;
      b: (string)
      c: (number | string)
    }
    `;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          a: z.union([z.number(), z.string()]).nullable(),
          b: z.string(),
          c: z.union([z.number(), z.string()])
      });"
    `);
  });

  it("should allow nullable on optional union properties", () => {
    const source = `export interface A {
      a?: number | string | null;
    }
    `;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          a: z.union([z.number(), z.string()]).optional().nullable()
      });"
    `);
  });

  it("should generate a discriminatedUnion when @discriminator is used", () => {
    const source = `
    /**
     * @discriminator id
     **/
    export type A = { id: "1"; name: string; } | { id: "2"; age: number; }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "/**
       * @discriminator id
       **/
      export const aSchema = z.discriminatedUnion("id", [z.object({
              id: z.literal("1"),
              name: z.string()
          }), z.object({
              id: z.literal("2"),
              age: z.number()
          })]);"
    `);
  });

  it("should generate a discriminatedUnion with a referenced type", () => {
    const source = `
    /**
     * @discriminator id
     **/
    export type Foo = { id: "1"; name: string; } | Bar`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "/**
       * @discriminator id
       **/
      export const fooSchema = z.discriminatedUnion("id", [z.object({
              id: z.literal("1"),
              name: z.string()
          }), barSchema]);"
    `);
  });

  it("should fall back to union when types are not discriminated", () => {
    const source = `
    /**
     * @discriminator id
     **/
    export type A = { id: "1"; name: string; } | string`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "/**
       * @discriminator id
       **/
      export const aSchema = z.union([z.object({
              id: z.literal("1"),
              name: z.string()
          }), z.string()]);"
    `);
  });

  it("should fall back to union when discriminator is missing", () => {
    const source = `
    /**
     * @discriminator id
     **/
    export type A = { name: string; } | { id: "2"; age: number; }`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "/**
       * @discriminator id
       **/
      export const aSchema = z.union([z.object({
              name: z.string()
          }), z.object({
              id: z.literal("2"),
              age: z.number()
          })]);"
    `);
  });

  it("should deal with @default with all types", () => {
    const source = `export interface WithDefaults {
     /**
      * @default 42
      */
      theAnswerToTheUltimateQuestionOfLife: number;
      /**
       * @default false
       */
      isVulnerable: boolean;
      /**
       * @default clark
       */
      name: "clark" | "superman" | "kal-l";
      /**
       * @default The Answer to the Ultimate Question of Life
       */
      theMeaningOf42: string;
      /**
       * @default ""
       */
      emptyString: string;
      /**
       * @default "true"
       */
      booleanAsString: string;
   }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const withDefaultsSchema = z.object({
          /**
           * @default 42
           */
          theAnswerToTheUltimateQuestionOfLife: z.number().default(42),
          /**
           * @default false
           */
          isVulnerable: z.boolean().default(false),
          /**
           * @default clark
           */
          name: z.union([z.literal("clark"), z.literal("superman"), z.literal("kal-l")]).default("clark"),
          /**
           * @default The Answer to the Ultimate Question of Life
           */
          theMeaningOf42: z.string().default("The Answer to the Ultimate Question of Life"),
          /**
           * @default ""
           */
          emptyString: z.string().default(""),
          /**
           * @default "true"
           */
          booleanAsString: z.string().default("true")
      });"
    `);
  });

  it("should deal with @default null value", () => {
    const source = `export interface WithDefaults {
      /**
       * @default null
       */
      nonNullableString: string;
      /**
       * @default null
       */
      nullableString: string | null;
      /**
       * @default "null"
       */
      nonNullableStringWithStringAsDefault: string;
   }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const withDefaultsSchema = z.object({
          /**
           * @default null
           */
          nonNullableString: z.string().nullable().default(null),
          /**
           * @default null
           */
          nullableString: z.string().nullable().default(null),
          /**
           * @default "null"
           */
          nonNullableStringWithStringAsDefault: z.string().default("null")
      });"
    `);
  });

  it("should deal with @default with array value", () => {
    const source = `export interface WithArrayDefault {
      /**
       * @default ["superman", "batman", "wonder woman"]
       */
      justiceLeague: string[];
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const withArrayDefaultSchema = z.object({
          /**
           * @default ["superman", "batman", "wonder woman"]
           */
          justiceLeague: z.array(z.string()).default(["superman", "batman", "wonder woman"])
      });"
    `);
  });

  it("should deal with @default with object value", () => {
    const source = `export interface WithObjectDefault {
      /**
       * @default { "name": "Clark Kent", "age": 30, "isHero": true }
       */
      superman: { name: string; age: number; isHero: boolean };
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const withObjectDefaultSchema = z.object({
          /**
           * @default { "name": "Clark Kent", "age": 30, "isHero": true }
           */
          superman: z.object({
              name: z.string(),
              age: z.number(),
              isHero: z.boolean()
          }).default({ "name": "Clark Kent", "age": 30, "isHero": true })
      });"
    `);
  });

  it("should deal with @default with nested array and object values", () => {
    const source = `export interface WithNestedDefault {
      /**
       * @default { "heroes": ["superman", "batman"], "villains": [{ "name": "Lex Luthor", "age": 40 }] }
       */
      dcUniverse: { heroes: string[]; villains: { name: string; age: number }[] };
    }`;
    expect(generate(source)).toMatchInlineSnapshot(`
      "export const withNestedDefaultSchema = z.object({
          /**
           * @default { "heroes": ["superman", "batman"], "villains": [{ "name": "Lex Luthor", "age": 40 }] }
           */
          dcUniverse: z.object({
              heroes: z.array(z.string()),
              villains: z.array(z.object({
                  name: z.string(),
                  age: z.number()
              }))
          }).default({ "heroes": ["superman", "batman"], "villains": [{ "name": "Lex Luthor", "age": 40 }] })
      });"
    `);
  });

  it("should ignore unknown/broken jsdoc format", () => {
    const source = `export interface Hero {
     /**
      * @secret
      * @format
      * @pattern
      */
     secretIdentity: string;
     /**
      * @maximum infinity
      */
     age: number;
     /**
      * My super power
      */
     power: Power;
   };`;

    expect(generate(source)).toMatchInlineSnapshot(`
      "export const heroSchema = z.object({
          /**
           * @secret
           * @format
           * @pattern
           */
          secretIdentity: z.string(),
          /**
           * @maximum infinity
           */
          age: z.number(),
          /**
           * My super power
           */
          power: powerSchema
      });"
    `);
  });

  it("should throw on interface with generics", () => {
    const source = `export interface Villain<TPower> {
     powers: TPower[]
   }`;
    expect(() => generate(source)).toThrowErrorMatchingInlineSnapshot(
      `"Interface with generics are not supported!"`
    );
  });

  it("should throw on type with generics", () => {
    const source = `export type SecretVillain<T> = RandomPeople<T>`;
    expect(() => generate(source)).toThrowErrorMatchingInlineSnapshot(
      `"Type with generics are not supported!"`
    );
  });

  it("should be able to override the zod import value", () => {
    const source = `export type TheLastTest = true`;

    expect(generate(source, "zod")).toMatchInlineSnapshot(
      `"export const theLastTestSchema = zod.literal(true);"`
    );
  });

  it("should not generate any zod validation if `skipParseJSDoc` is `true`", () => {
    const source = `export interface A {
      /** @minimum 0 */
      a: number | null;
      /** @minLength 1 */
      b: string | null;
      /** @pattern ^c$ */
      c: string | null;
    }`;

    expect(generate(source, "z", true)).toMatchInlineSnapshot(`
      "export const aSchema = z.object({
          /** @minimum 0 */
          a: z.number().nullable(),
          /** @minLength 1 */
          b: z.string().nullable(),
          /** @pattern ^c$ */
          c: z.string().nullable()
      });"
    `);
  });
});

/**
 * Wrapper to generate a zod schema from a string.
 *
 * @param sourceText Typescript interface or type
 * @returns Generated Zod schema
 */
function generate(
  sourceText: string,
  z?: string,
  skipParseJSDoc?: boolean,
  customJSDocFormatTypes: CustomJSDocFormatTypes = {}
) {
  const sourceFile = ts.createSourceFile(
    "index.ts",
    sourceText,
    ts.ScriptTarget.Latest
  );
  const declaration = findNode(
    sourceFile,
    (
      node
    ): node is
      | ts.InterfaceDeclaration
      | ts.TypeAliasDeclaration
      | ts.EnumDeclaration =>
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)
  );
  if (!declaration) {
    throw new Error("No `type` or `interface` found!");
  }
  const interfaceName = declaration.name.text;
  const zodConstName = `${camel(interfaceName)}Schema`;

  const zodSchema = generateZodSchemaVariableStatement({
    zodImportValue: z,
    node: declaration,
    sourceFile,
    varName: zodConstName,
    skipParseJSDoc,
    customJSDocFormatTypes,
  });

  return ts
    .createPrinter({ newLine: ts.NewLineKind.LineFeed })
    .printNode(ts.EmitHint.Unspecified, zodSchema.statement, sourceFile);
}
