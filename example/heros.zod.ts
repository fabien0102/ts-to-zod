// Generated by ts-to-zod
import { z } from "zod";
import { EnemyPower, Villain, EvilPlan, EvilPlanDetails } from "./heros";

import { personSchema } from "./person.zod";

export const enemyPowerSchema = z.nativeEnum(EnemyPower);

export const skillsSpeedEnemySchema = z.object({
  power: z.literal(EnemyPower.Speed),
});

export const enemySchema = personSchema.extend({
  name: z.string(),
  powers: z.array(enemyPowerSchema),
  inPrison: z.boolean(),
});

export const supermanSchema = z.object({
  name: z.union([
    z.literal("superman"),
    z.literal("clark kent"),
    z.literal("kal-l"),
  ]),
  enemies: z.record(enemySchema),
  age: z.number(),
  underKryptonite: z.boolean().optional(),
  powers: z.tuple([
    z.literal("fly"),
    z.literal("laser"),
    z.literal("invincible"),
  ]),
});

export const villainSchema: z.ZodSchema<Villain> = z.lazy(() =>
  z.object({
    name: z.string(),
    powers: z.array(enemyPowerSchema),
    friends: z.array(villainSchema),
    canBeTrusted: z.never(),
  })
);

export const storySchema = z.tuple([z.string(), z.array(z.string())]);

export const krytonResponseSchema = z.promise(z.boolean());

export const killSupermanSchema = z
  .function()
  .args(z.boolean(), z.string())
  .returns(z.promise(z.boolean()));

export const withDefaultsSchema = z.object({
  theAnswerToTheUltimateQuestionOfLife: z.number().default(42),
  isVulnerable: z.boolean().default(false),
  name: z
    .union([z.literal("clark"), z.literal("superman"), z.literal("kal-l")])
    .default("clark"),
  theMeaningOf42: z
    .string()
    .default("The Answer to the Ultimate Question of Life"),
  emptyString: z.string().optional().default(""),
  booleanAsString: z.string().default("true"),
});

const nonExportedSchema = z.object({
  name: z.string(),
});

export const exportedSchema = z.object({
  a: nonExportedSchema,
  b: z.string(),
});

export const getSupermanSkillSchema = z
  .function()
  .args(z.string(), z.boolean().optional())
  .returns(z.string());

export const heroContactSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(50),
  phoneNumber: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
  hasSuperPower: z.boolean().optional().default(true),
  age: z.number().min(0).max(500),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in YYYY-MM-DD format."),
});

export const supermanEnemySchema = supermanSchema.shape.enemies.valueSchema;

export const supermanNameSchema = supermanSchema.shape.name;

export const supermanInvinciblePowerSchema =
  supermanSchema.shape.powers.items[2];

export const evilPlanSchema: z.ZodSchema<EvilPlan> = z.lazy(() =>
  z.object({
    owner: villainSchema,
    description: z.string(),
    details: evilPlanDetailsSchema,
  })
);

export const evilPlanDetailsSchema: z.ZodSchema<EvilPlanDetails> = z.lazy(() =>
  z.object({
    parent: evilPlanSchema,
    steps: z.array(z.string()),
  })
);
