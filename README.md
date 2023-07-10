<div align="center">
  <img src="ts-to-zod-logo.svg" width="200px" align="center" />
  <h1 align="center">ts-to-zod</h1>
</div>

Generate [Zod](https://github.com/colinhacks/zod) schemas (v3) from Typescript types/interfaces.

[![Version](https://img.shields.io/npm/v/ts-to-zod.svg)](https://npmjs.org/package/ts-to-zod)
[![Github CI](https://github.com/fabien0102/ts-to-zod/actions/workflows/tests.yaml/badge.svg)](https://github.com/fabien0102/ts-to-zod/actions/workflows/tests.yaml)
[![codecov](https://codecov.io/gh/fabien0102/ts-to-zod/branch/main/graph/badge.svg?token=W5M8UIJ59C)](https://codecov.io/gh/fabien0102/ts-to-zod)
[![License](https://img.shields.io/npm/l/ts-to-zod.svg)](https://github.com/fabien0102/ts-to-zod/blob/main/LICENSE)
[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)

## Usage

```sh
$ yarn add --dev ts-to-zod
$ yarn ts-to-zod src/iDontTrustThisApi.ts src/nowIcanValidateEverything.ts
```

That's it, go to `src/nowIcanValidateEverything.ts` file, you should have all the exported `interface` and `type` as Zod schemas with the following name pattern: `${originalType}Schema`.

## Embedded validation

To make sure the generated zod schemas are 100% compatible with your original types, this tool is internally comparing `z.infer<generatedSchema>` and your original type. If you are running on those validation, please open an issue 😀

Notes:

- Only exported types/interface are tested (so you can have some private types/interface and just exports the composed type)
- Even if this is not recommended, you can skip this validation step with `--skipValidation`. (At your own risk!)

## JSDoc Tag Validators

This tool supports some JSDoc tags (inspired by OpenAPI) to generate additional Zod schema validators.

List of supported keywords:

| JSDoc keyword                                                                                                              | JSDoc Example              | Generated Zod validator              |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------ |
| `@minimum {number} [err_msg]`                                                                                              | `@minimum 42`              | `z.number().min(42)`                 |
| `@maximum {number} [err_msg]`                                                                                              | `@maximum 42 Must be < 42` | `z.number().max(42, "Must be < 42")` |
| `@minLength {number} [err_msg]`                                                                                            | `@minLength 42`            | `z.string().min(42)`                 |
| `@maxLength {number} [err_msg]`                                                                                            | `@maxLength 42`            | `z.string().max(42)`                 |
| `@format {FormatType} [err_msg]`                                                                                           | `@format email`            | `z.string().email()`                 |
| `@pattern {regex}` <br><br> **Note**: Due to parsing ambiguities, `@pattern` does _not_ support generating error messages. | `@pattern ^hello`          | `z.string().regex(/^hello/)`         |

By default, `FormatType` is defined as:

```ts
type FormatType =
  | "date-time"
  | "email"
  | "ip"
  | "ipv4"
  | "ipv6"
  | "url"
  | "uuid";
```

However, see the section on [Custom JSDoc Format Types](#custom-jsdoc-format-types) to learn more about defining other types of formats for string validation.

Those validators can be combined:

```ts
// source.ts
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
   * @pattern ^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$
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
}

// output.ts
export const heroContactSchema = z.object({
  /**
   * The email of the hero.
   *
   * @format email
   */
  email: z.string().email(),

  /**
   * The name of the hero.
   *
   * @minLength 2
   * @maxLength 50
   */
  name: z.string().min(2).max(50),

  /**
   * The phone number of the hero.
   *
   * @pattern ^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$
   */
  phoneNumber: z.string().regex(/^([+]?d{1,2}[-s]?|)d{3}[-s]?d{3}[-s]?d{4}$/),

  /**
   * Does the hero has super power?
   *
   * @default true
   */
  hasSuperPower: z.boolean().default(true),

  /**
   * The age of the hero
   *
   * @minimum 0
   * @maximum 500
   */
  age: z.number().min(0).max(500),
});
```

## Other JSDoc tags

Other JSDoc tags are available:

| JSDoc keyword      | JSDoc Example | Description                               | Generated Zod            |
| ------------------ | ------------- | ----------------------------------------- | ------------------------ |
| `@default {value}` | `@default 42` | Sets a default value for the property     | `z.number().default(42)` |
| `@strict`          | `@strict`     | Adds the `strict()` modifier to an object | `z.object().strict()`    |

## Advanced configuration

If you want to customize the schema name or restrict the exported schemas, you can do this by adding a `ts-to-zod.config.js` at the root of your project.

Just run `yarn ts-to-zod --init` and you will have a ready to use configuration file (with a bit of typesafety).

You have two ways to restrict the scope of ts-to-zod:

- `nameFilter` will filter by interface/type name
- `jsDocTagFilter` will filter on jsDocTag

Example:

```ts
// ts-to-zod.config.js
/**
 * ts-to-zod configuration.
 *
 * @type {import("./src/config").TsToZodConfig}
 */
module.exports = [
  {
    name: "example",
    input: "example/heros.ts",
    output: "example/heros.zod.ts",
    jsDocTagFilter: (tags) => tags.map(tag => tag.name).includes("toExtract")) // <= rule here
  },
];

// example/heros.ts
/**
 * Will not be part of `example/heros.zod.ts`
 */
export interface Enemy {
  name: string;
  powers: string[];
  inPrison: boolean;
}

/**
 * Will be part of `example/heros.zod.ts`
 * @toExtract
 */
export interface Superman {
  name: "superman" | "clark kent" | "kal-l";
  enemies: Record<string, Enemy>;
  age: number;
  underKryptonite?: boolean;
}
```

**Please note**: if your exported interface/type have a reference to a non-exported interface/type, ts-to-zod will not be able to generate anything (missing dependencies will be reported).

### Custom JSDoc Format Types

`ts-to-zod` already supports converting several `@format` types such as `email` and `ip` to built-in Zod string validation functions. However, the types supported out of the box are only a subset of those recognized by the OpenAPI specification, which doesn't fit every use case. Thus, you can use the config file to define additional format types using the `customJSDocFormats` property like so:

```ts
{
  "customJSDocFormats": {
    [formatTypeNoSpaces]:
      | string
      | {regex: string, errorMessage: string}
  }
}
```

Here is an example configuration:

```json
{
  "customJSDocFormats": {
    "phone-number": "^\\d{3}-\\d{3}-\\d{4}$",
    "date": {
      "regex": "^\\d{4}-\\d{2}-\\d{2}$",
      "errorMessage": "Must be in YYYY-MM-DD format."
    }
  }
}
```

As a result, `ts-to-zod` will perform the following transformation:

<table>
<thead>
<tr>

<th>TypeScript</th>
<th>Zod</th>

</tr>
</thead>

<tbody>
<tr>

<td>

```ts
interface Info {
  /**
   * @format date
   */
  birthdate: string;
  /**
   * @format phone-number Must be a valid phone number.
   */
  phoneNumber: string;
}
```

</td>

<td>

```ts
const infoSchema = z.object({
  /**
   * @format date
   */
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in YYYY-MM-DD format."),
  /**
   * @format phone-number
   */
  phoneNumber: z
    .string()
    .regex(/^\d{3}-\d{3}-\d{4}$/, "Must be a valid phone number."),
});
```

</td>

</tr>
</tbody>
</table>

## Limitation

Since we are generating Zod schemas, we are limited by what Zod actually supports:

- No type generics
- No `Record<number, …>`
- …

To resume, you can use all the primitive types and some the following typescript helpers:

- `Record<string, …>`
- `Pick<>`
- `Omit<>`
- `Partial<>`
- `Required<>`
- `Array<>`
- `Promise<>`

This utils is design to work with one file only, and will reference types from the same file:

```ts
// source.ts
export type Id = string;
export interface Hero {
  id: Id;
  name: string;
}

// output.ts
export const idSchema = z.string();
export const heroSchema = z.object({
  id: idSchema,
  name: z.string(),
});
```

## Programmatic API

You need more than one file? Want even more power? No problem, just use the tool as a library.

High-level function:

- `generate` take a `sourceText` and generate two file getters

Please have a look to `src/core/generate.test.ts` for more examples.

Low-level functions:

- `generateZodSchema` help you to generate `export const ${varName} = ${zodImportValue}.object(…)`
- `generateZodInferredType` help you to generate `export type ${aliasName} = ${zodImportValue}.infer<typeof ${zodConstName}>`
- `generateIntegrationTests` help you to generate a file comparing the original types & zod types

To learn more about thoses functions or their usages, `src/core/generate.ts` is a good starting point.

## Local development

```sh
$ git clone
$ cd ts-to-zod
$ yarn
$ ./bin/run
USAGE
  $ ts-to-zod [input] [output]
  ...
```

You also have plenty of unit tests to play safely:

```sh
$ yarn test --watch
```

And a playground inside `example`, buildable with the following command:

```sh
$ yarn gen:example
```

Last note, if you are updating `src/config.ts`, you need to run `yarn gen:config` to have generate the schemas of the config (`src/config.zod.ts`) (Yes, we are using the tool to build itself #inception)

Have fun!
