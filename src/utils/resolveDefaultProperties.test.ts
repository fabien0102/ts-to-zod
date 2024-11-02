import { resolveDefaultProperties } from './resolveDefaultProperties';

describe('resolveDefaultProperties', () => {
  it('should remove the question mark if @default is defined (interface)', () => {
    const sourceText = `
    /**
     * A citizen
     */
    export interface Citizen {
      name: string;
      /**
       * @default true
       */
      isVillain?: boolean;
    }
    `;
    expect(resolveDefaultProperties(sourceText)).toMatchInlineSnapshot(`
      "/**
       * A citizen
       */
      export interface Citizen {
          name: string;
          /**
           * @default true
           */
          isVillain: boolean;
      }
      "
    `);
  });

  it('should remove the question mark if @default is defined (type)', () => {
    const sourceText = `
    /**
     * A citizen
     */
    export type Citizen = {
      name: string;
      /**
       * @default true
       */
      isVillain?: boolean;
    };
    `;
    expect(resolveDefaultProperties(sourceText)).toMatchInlineSnapshot(`
      "/**
       * A citizen
       */
      export type Citizen = {
          name: string;
          /**
           * @default true
           */
          isVillain: boolean;
      };
      "
    `);
  });

  it('should remove `undefined` if @default is defined', () => {
    const sourceText = `
    /**
     * A citizen
     */
    export interface Citizen {
      name: string;
      /**
       * @default true
       */
      isVillain: boolean | undefined;
    }
    `;
    expect(resolveDefaultProperties(sourceText)).toMatchInlineSnapshot(`
      "/**
       * A citizen
       */
      export interface Citizen {
          name: string;
          /**
           * @default true
           */
          isVillain: boolean;
      }
      "
    `);
  });

  it('should do nothing if no @default', () => {
    const sourceText = `
    /**
     * A citizen
     */
    export interface Citizen {
      name: string;
      isVillain?: boolean;
    }
    `;
    expect(resolveDefaultProperties(sourceText)).toMatchInlineSnapshot(`
      "/**
       * A citizen
       */
      export interface Citizen {
          name: string;
          isVillain?: boolean;
      }
      "
    `);
  });
});
