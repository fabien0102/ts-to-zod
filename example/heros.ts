export enum EnemyPower {
  Flight = "flight",
  Strength = "strength",
  Speed = "speed",
}

export type SpeedEnemy = {
  power: EnemyPower.Speed;
};

export interface Enemy {
  name: string;
  powers: EnemyPower[];
  inPrison: boolean;
}

export interface Superman {
  name: "superman" | "clark kent" | "kal-l";
  enemies: Record<string, Enemy>;
  age: number;
  underKryptonite?: boolean;
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
