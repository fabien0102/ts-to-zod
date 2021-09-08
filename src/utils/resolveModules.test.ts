import { resolveModules } from "./resolveModules";

describe("resolveModules", () => {
  it("should prefix interface", () => {
    const sourceText = `export namespace Metropolis {
      export interface Superman {
        name: string;
        hasPower: boolean;
      }
    }`;

    expect(resolveModules(sourceText)).toMatchInlineSnapshot(`
      "export interface MetropolisSuperman {
          name: string;
          hasPower: boolean;
      }

      "
    `);
  });

  it("should prefix type", () => {
    const sourceText = `export namespace Metropolis {
      export type Name = "superman" | "clark kent" | "kal-l";
    }`;

    expect(resolveModules(sourceText)).toMatchInlineSnapshot(`
      "export type MetropolisName = \\"superman\\" | \\"clark kent\\" | \\"kal-l\\";

      "
    `);
  });

  it("should prefix enum", () => {
    const sourceText = `export namespace Metropolis {
      export enum Superhero { 
        Superman = "superman",
        ClarkKent = "clark_kent",
      };
    }`;

    expect(resolveModules(sourceText)).toMatchInlineSnapshot(`
      "export enum MetropolisSuperhero {
          Superman = \\"superman\\",
          ClarkKent = \\"clark_kent\\"
      }

      "
    `);
  });

  it("should prefix every type references", () => {
    const sourceText = `
    export type Weakness = "krytonite" | "lois"

    export namespace Metropolis {
      export type Name = string;

      export interface Superman {
        fullName: Name;
        name: { first: Name; last: Name };
        hasPower: boolean;
        weakness: Weakness;
      }
      
      export type SupermanBis = {
        fullName: Name;
        name: { first: Name; last: Name };
        hasPower: boolean;
        weakness: Weakness;
      }
    }`;

    expect(resolveModules(sourceText)).toMatchInlineSnapshot(`
      "export type Weakness = \\"krytonite\\" | \\"lois\\";

      export type MetropolisName = string;

      export interface MetropolisSuperman {
          fullName: MetropolisName;
          name: {
              first: MetropolisName;
              last: MetropolisName;
          };
          hasPower: boolean;
          weakness: Weakness;
      }

      export type MetropolisSupermanBis = {
          fullName: MetropolisName;
          name: {
              first: MetropolisName;
              last: MetropolisName;
          };
          hasPower: boolean;
          weakness: Weakness;
      };

      "
    `);
  });
});
