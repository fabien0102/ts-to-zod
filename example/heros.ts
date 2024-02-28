import { Person } from "./person";

export enum EnemyPower {
  Flight = "flight",
  Strength = "strength",
  Speed = "speed",
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Skills {
  export type SpeedEnemy = {
    power: EnemyPower.Speed;
  };
}

export interface Enemy extends Person {
  name: string;
  powers: EnemyPower[];
  inPrison: boolean;
}

export type SupermanEnemy = Superman["enemies"][-1];
export type SupermanName = Superman["name"];
export type SupermanInvinciblePower = Superman["powers"][2];

export interface Superman {
  person: Person;
  name: "superman" | "clark kent" | "kal-l";
  enemies: Record<string, Enemy>;
  age: number;
  underKryptonite?: boolean;
  powers: ["fly", "laser", "invincible"];
}

export interface Villain {
  name: string;
  powers: EnemyPower[];
  friends: Villain[];
  canBeTrusted: never;
}

export interface EvilPlan {
  owner: Villain;
  description: string;
  details: EvilPlanDetails;
}

export interface EvilPlanDetails {
  parent: EvilPlan; // <- Unsolvable circular reference
  steps: string[];
}

export type Story = [subject: string, problems: string[]];
export type KrytonResponse = Promise<boolean>;
export type KillSuperman = (
  withKryptonite: boolean,
  method: string
) => Promise<boolean>;

export interface WithDefaults {
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
  emptyString?: string;
  /**
   * @default "true"
   */
  booleanAsString: string;
}

interface NonExported {
  name: string;
}

export interface Exported {
  a: NonExported;
  b: string;
}

export type GetSupermanSkill = (
  skillName: string,
  withKryptonite?: boolean
) => string;

export interface HeroContact {
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
   * @pattern ^\d{3}-\d{3}-\d{4}$
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
   * The hero's birthday.
   *
   * @format date
   */
  birthday: string;
}
