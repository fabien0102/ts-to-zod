import ts from "typescript";
import { resolveModules } from "./resolveModules";

describe("resolveModules", () => {
  it("should prefix interface", () => {
    const sourceText = `export namespace Metropolis {
      export interface Superman {
        name: string;
        hasPower: boolean;
      }
    }`;

    expect(print(resolveModules(sourceText))).toMatchInlineSnapshot(`
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

    expect(print(resolveModules(sourceText))).toMatchInlineSnapshot(`
      "export type MetropolisName = "superman" | "clark kent" | "kal-l";
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

    expect(print(resolveModules(sourceText))).toMatchInlineSnapshot(`
      "export enum MetropolisSuperhero {
          Superman = "superman",
          ClarkKent = "clark_kent"
      }
      ;
      "
    `);
  });

  it("should prefix every type references", () => {
    const sourceText = `
    export type Weakness = "krytonite" | "lois"

    export namespace Metropolis {
      export type Name = string;

      export type BadassSuperman = Omit<Superman, "underKryptonite">;

      export interface Superman {
        fullName: Name;
        name: { first: Name; last: Name };
        hasPower: boolean;
        weakness: Weakness;
      }

      export interface Clark {
        hasGlasses: boolean
      }

      export type SupermanBis = {
        fullName: Name;
        name: { first: Name; last: Name };
        hasPower: boolean;
        weakness: Weakness;
      }

      export interface ExtendedSuperman extends Superman, Clark {
        hasEvenMorePower: boolean;
      }
    }`;

    expect(print(resolveModules(sourceText))).toMatchInlineSnapshot(`
      "export type Weakness = "krytonite" | "lois";
      export type MetropolisName = string;
      export type MetropolisBadassSuperman = Omit<MetropolisSuperman, "underKryptonite">;
      export interface MetropolisSuperman {
          fullName: MetropolisName;
          name: {
              first: MetropolisName;
              last: MetropolisName;
          };
          hasPower: boolean;
          weakness: Weakness;
      }
      export interface MetropolisClark {
          hasGlasses: boolean;
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
      export interface MetropolisExtendedSuperman extends MetropolisSuperman, MetropolisClark {
          hasEvenMorePower: boolean;
      }
      "
    `);
  });

  it("should prefix nested namespaces", () => {
    const sourceText = `
    type GlobalType = string;

    namespace OuterNamespace {
      export interface OuterInterface {
        id: number;
        global: GlobalType;
      }

      export namespace InnerNamespace {
        export type InnerTypeAlias = {
          name: string;
          value: number;
        };

        export enum InnerEnum {
          OptionA,
          OptionB = "OPTION_B",
        }

        export interface InnerInterface {
          timestamp: Date;
          outerRef: OuterInterface;
        }

        export type UserProfile = {
          details: InnerTypeAlias;
          preference: InnerEnum;
        };

        export interface ComplexDataStructure {
          coreInfo: InnerInterface;
          outerContext: OuterInterface;
          user: UserProfile;
        }
      }

      export type OuterUtility = {
        processed: boolean;
        innerItem: InnerNamespace.InnerTypeAlias;
      };
    }

    interface AnotherGlobalInterface {
      status: string;
    }`;

    expect(print(resolveModules(sourceText))).toMatchInlineSnapshot(`
      "type GlobalType = string;
      export interface OuterNamespaceOuterInterface {
          id: number;
          global: GlobalType;
      }
      export type OuterNamespaceInnerNamespaceInnerTypeAlias = {
          name: string;
          value: number;
      };
      export enum OuterNamespaceInnerNamespaceInnerEnum {
          OptionA,
          OptionB = "OPTION_B"
      }
      export interface OuterNamespaceInnerNamespaceInnerInterface {
          timestamp: Date;
          outerRef: OuterNamespaceOuterInterface;
      }
      export type OuterNamespaceInnerNamespaceUserProfile = {
          details: OuterNamespaceInnerNamespaceInnerTypeAlias;
          preference: OuterNamespaceInnerNamespaceInnerEnum;
      };
      export interface OuterNamespaceInnerNamespaceComplexDataStructure {
          coreInfo: OuterNamespaceInnerNamespaceInnerInterface;
          outerContext: OuterNamespaceOuterInterface;
          user: OuterNamespaceInnerNamespaceUserProfile;
      }
      export type OuterNamespaceOuterUtility = {
          processed: boolean;
          innerItem: OuterNamespaceInnerNamespaceInnerTypeAlias;
      };
      interface AnotherGlobalInterface {
          status: string;
      }
      "
    `);
  });
});

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const print = (sourceFile: ts.SourceFile) => printer.printFile(sourceFile);
