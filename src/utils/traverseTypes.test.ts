import ts from "typescript";
import { getReferencedTypeNames } from "./traverseTypes";
import { findNode } from "./findNode";

describe("traverseTypes", () => {
  describe("getExtractedTypeNames", () => {
    it("should find only itself", () => {
      const testCases = [
        `
        export type SuperHero = {
            id: number, 
            name: string
          };
        `,
        `
        export interface SuperHero = {
            id: number, 
            name: string
          };
        `,
        `
        export enum SuperHero = {
            Superman = "superman",
            ClarkKent = "clark_kent",
          };
        `,
      ];

      testCases.forEach((source: string) => {
        const result = extractNames(source);
        expect(result).toEqual([
          { name: "SuperHero", partOfQualifiedName: false },
        ]);
      });
    });

    it("should extract type referenced in property", () => {
      const source = `
        export interface SuperHero {
            id: number,
            person: Person,
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced in extend clause", () => {
      const source = `
          export interface SuperHero extends Person {
              id: number,
          }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced in multiple extend clauses", () => {
      const source = `
            export interface SuperHero extends Person, Person2 {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
        { name: "Person2", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced in extend clause with Pick helper", () => {
      const source = `
            export interface SuperHero extends Pick<Person, "name"> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced in extend clause with Omit helper", () => {
      const source = `
            export interface SuperHero extends Omit<Person, "name"> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced in extend clause with Partial helper", () => {
      const source = `
            export interface SuperHero extends Partial<Person, "name"> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced in extend clause with Record helper", () => {
      const source = `
            export interface SuperHero extends Record<string, Person2> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person2", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced in property as array", () => {
      const source = `
            export interface SuperHero {
                id: number,
                sidekicks: Person[],
            }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract type referenced as array in union property", () => {
      const source = `
            export interface SuperHero {
                sidekicks: Person[] | null,
            }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract nested type reference", () => {
      const source = `
          export interface SuperHero {
              id: number,
              person: {
                type: Person,
              }
          }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract union type reference", () => {
      const source = `
        export interface Person {
            id: number,
            t: SuperHero | Villain
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract intersection type reference", () => {
      const source = `
        export interface Person {
            id: number,
            t: SuperHero & Villain
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract intersection type reference with type literal", () => {
      const source = `
        export interface Person {
            id: number,
            t: SuperHero & { counter: Villain }
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract types between parenthesis", () => {
      const source = `
        export interface Person {
            id: number,
            t: (SuperHero)
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
      ]);
    });

    it("should extract union types between parenthesis", () => {
      const source = `
        export interface Person {
            id: number,
            t: (SuperHero | Villain)
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract types from Tuple", () => {
      const source = `
        export interface Person {
            id: number,
            t: [SuperHero, Villain]
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias", () => {
      const source = `
        export type Person = SuperHero `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with union", () => {
      const source = `
        export type Person = Villain | SuperHero `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with array", () => {
      const source = `
        export type Person = Villain[] `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with Array helper", () => {
      const source = `
        export type Person = Array<Villain> `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with Promise helper", () => {
      const source = `
        export type Person = Promise<Villain> `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with Required helper", () => {
      const source = `
        export type Person = Required<Villain> `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with Partial helper", () => {
      const source = `
        export type Person = Partial<Villain> `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with Omit helper", () => {
      const source = `
        export type Person = Omit<Villain> `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with Pick helper", () => {
      const source = `
        export type Person = Pick<Villain> `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with Record helper", () => {
      const source = `
        export type Person = Record<string, Villain> `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with parenthesis", () => {
      const source = `
        export type Person = (Villain) `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with parenthesis", () => {
      const source = `
        export type Person = (Villain | Hero)[]`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
        { name: "Hero", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with object literal", () => {
      const source = `
        export type Person = { hero: SuperHero } `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
      ]);
    });

    it("should extract type from type alias with union & object literal", () => {
      const source = `
        export type Person = Villain | { hero: SuperHero } `;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
      ]);
    });

    it("should extract types from a very weird type definition (testing edge cases)", () => {
      const source = `
        export type Person = {
          type: (SuperHero | Person2) & (SuperHero2 & Villain2) | SuperHero3[] | Villain3
          tupleProp: [A | B, C & D]
        } | Villain`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Person", partOfQualifiedName: false },
        { name: "SuperHero", partOfQualifiedName: false },
        { name: "Person2", partOfQualifiedName: false },
        { name: "SuperHero2", partOfQualifiedName: false },
        { name: "Villain2", partOfQualifiedName: false },
        { name: "SuperHero3", partOfQualifiedName: false },
        { name: "Villain3", partOfQualifiedName: false },
        { name: "A", partOfQualifiedName: false },
        { name: "B", partOfQualifiedName: false },
        { name: "C", partOfQualifiedName: false },
        { name: "D", partOfQualifiedName: false },
        { name: "Villain", partOfQualifiedName: false },
      ]);
    });

    it("should extract type when part of QualifiedName", () => {
      const source = `
        export type Hero = {
          qualified: Person.SuperHero
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Hero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: true },
      ]);
    });

    it("should extract type when leading an IndexedAccessType", () => {
      const source = `
        export type Hero = {
          super: Person["super"]
        }`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Hero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
      ]);
    });

    it("should extract type when after a rest operator", () => {
      const source = `
        export type Hero = [Person, ...Skill[]]`;

      const result = extractNames(source);
      expect(result).toEqual([
        { name: "Hero", partOfQualifiedName: false },
        { name: "Person", partOfQualifiedName: false },
        { name: "Skill", partOfQualifiedName: false },
      ]);
    });
  });
});

function extractNames(sourceText: string) {
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

  return getReferencedTypeNames(declaration, sourceFile);
}
