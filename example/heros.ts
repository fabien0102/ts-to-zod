export interface Ennemy {
  name: string;
  powers: string[];
  inPrison: boolean;
}

export interface Superman {
  name: "superman" | "clark kent" | "kal-l";
  ennemies: Record<string, Ennemy>;
  age: number;
  underKryptonite?: boolean;
}

export interface Vilain {
  name: string;
  powers: string[];
  friends: Vilain[];
}

export interface EvilPlan {
  owner: Vilain;
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
