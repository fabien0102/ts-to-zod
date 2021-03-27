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
