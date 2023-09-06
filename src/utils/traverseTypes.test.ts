import ts from "typescript";
import { getExtractedTypeNames } from "./traverseTypes";
import { findNode } from "./findNode";

describe("traverseTypes", () => {
  describe("getExtractedTypeNames", () => {
    it("should find only itself", () => {
      const testCases = [
        `
        export type Superhero = {
            id: number, 
            name: string
          };
        `,
        `
        export interface Superhero = {
            id: number, 
            name: string
          };
        `,
        `
        export enum Superhero = {
            Superman = "superman",
            ClarkKent = "clark_kent",
          };
        `,
      ];

      testCases.forEach((source: string) => {
        const result = extractNames(source);
        expect(result).toEqual(["Superhero"]);
      });
    });

    it("should extract type referenced in property", () => {
      const source = `
        export interface Superhero {
            id: number,
            person: Person,
        }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person"]);
    });

    it("should extract type referenced in extend clause", () => {
      const source = `
          export interface Superhero extends Person {
              id: number,
          }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person"]);
    });

    it("should extract type referenced in multiple extend clauses", () => {
      const source = `
            export interface Superhero extends Person, Person2 {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person", "Person2"]);
    });

    it("should extract type referenced in extend clause with Pick helper", () => {
      const source = `
            export interface Superhero extends Pick<Person, "name"> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person"]);
    });

    it("should extract type referenced in extend clause with Omit helper", () => {
      const source = `
            export interface Superhero extends Omit<Person, "name"> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person"]);
    });

    it("should extract type referenced in extend clause with Partial helper", () => {
      const source = `
            export interface Superhero extends Partial<Person, "name"> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person"]);
    });

    it("should extract type referenced in extend clause with Record helper", () => {
      const source = `
            export interface Superhero extends Record<string, Person2> {
                id: number,
            }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person2"]);
    });

    it("should extract type referenced in property as array", () => {
      const source = `
            export interface Superhero {
                id: number,
                sidekicks: Person[],
            }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person"]);
    });

    it("should extract nested type reference", () => {
      const source = `
          export interface Superhero {
              id: number,
              person: {
                type: Person,
              }
          }`;

      const result = extractNames(source);
      expect(result).toEqual(["Superhero", "Person"]);
    });

    it("should extract union type reference", () => {
      const source = `
        export interface Person {
            id: number,
            t: SuperHero | Villain
        }`;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "SuperHero", "Villain"]);
    });

    it("should extract intersection type reference", () => {
      const source = `
        export interface Person {
            id: number,
            t: SuperHero & Villain
        }`;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "SuperHero", "Villain"]);
    });

    it("should extract intersection type reference with type literal", () => {
      const source = `
        export interface Person {
            id: number,
            t: SuperHero & { counter: Villain }
        }`;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "SuperHero", "Villain"]);
    });

    it("should extract types between parenthesis", () => {
      const source = `
        export interface Person {
            id: number,
            t: (SuperHero)
        }`;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "SuperHero"]);
    });

    it("should extract union types between parenthesis", () => {
      const source = `
        export interface Person {
            id: number,
            t: (SuperHero | Villain)
        }`;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "SuperHero", "Villain"]);
    });

    it("should extract type from type alias", () => {
      const source = `
        export type Person = SuperHero `;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "SuperHero"]);
    });

    it("should extract type from type alias with union", () => {
      const source = `
        export type Person = Villain | SuperHero `;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "Villain", "SuperHero"]);
    });

    it("should extract type from type alias with array", () => {
      const source = `
        export type Person = Villain[] `;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "Villain"]);
    });

    it("should extract type from type alias with parenthesis", () => {
      const source = `
        export type Person = (Villain) `;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "Villain"]);
    });

    it("should extract type from type alias with object literal", () => {
      const source = `
        export type Person = { hero: SuperHero} `;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "SuperHero"]);
    });

    it("should extract type from type alias with union & object literal", () => {
      const source = `
        export type Person = Villain | { hero: SuperHero} `;

      const result = extractNames(source);
      expect(result).toEqual(["Person", "Villain", "SuperHero"]);
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

  return getExtractedTypeNames(declaration, sourceFile);
}
