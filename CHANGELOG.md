# Changelog

## [5.1.1](https://github.com/fabien0102/ts-to-zod/compare/v5.1.0...v5.1.1) (2025-11-14)


### Bug Fixes

* format date-time did not work with minLength ([#348](https://github.com/fabien0102/ts-to-zod/issues/348)) ([6563ca2](https://github.com/fabien0102/ts-to-zod/commit/6563ca2d92b63cb3eb83cf6833676100f1ce1516))

## [5.1.0](https://github.com/fabien0102/ts-to-zod/compare/v5.0.1...v5.1.0) (2025-11-14)


### Features

* Support index signature on extended interface ([#352](https://github.com/fabien0102/ts-to-zod/issues/352)) ([04895ee](https://github.com/fabien0102/ts-to-zod/commit/04895ee42b703b6a3868cdd452054c815a78fdcd))

## [5.0.1](https://github.com/fabien0102/ts-to-zod/compare/v5.0.0...v5.0.1) (2025-10-10)


### Bug Fixes

* Update release-please ([#341](https://github.com/fabien0102/ts-to-zod/issues/341)) ([3b68233](https://github.com/fabien0102/ts-to-zod/commit/3b68233f2ba6ce65cca412b58b7719acde26e7aa))

## [5.0.0](https://www.github.com/fabien0102/ts-to-zod/compare/v4.0.1...v5.0.0) (2025-09-29)


### ⚠ BREAKING CHANGES

* Support ESM & refresh dependencies (#337)

### Features

* Support ESM & refresh dependencies ([#337](https://www.github.com/fabien0102/ts-to-zod/issues/337)) ([7335e82](https://www.github.com/fabien0102/ts-to-zod/commit/7335e8268e68208d73bf2cffa89fba5a5d42419e))

### [4.0.1](https://www.github.com/fabien0102/ts-to-zod/compare/v4.0.0...v4.0.1) (2025-09-21)


### Bug Fixes

* **imports:** filter out imports when using nameFilter ([#330](https://www.github.com/fabien0102/ts-to-zod/issues/330)) ([754ac40](https://www.github.com/fabien0102/ts-to-zod/commit/754ac404f928d689eb1e5f328b40abfae7ea7373))

## [4.0.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.15.0...v4.0.0) (2025-09-11)


### ⚠ BREAKING CHANGES

* support zod@4 (#317)

### Features

* support zod@4 ([#317](https://www.github.com/fabien0102/ts-to-zod/issues/317)) ([835edea](https://www.github.com/fabien0102/ts-to-zod/commit/835edeaca5da8a7439b9a05e0ca14d7a5633225f))

## [3.15.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.14.1...v3.15.0) (2024-11-29)


### Features

* add support for object keyword ([#293](https://www.github.com/fabien0102/ts-to-zod/issues/293)) ([090d050](https://www.github.com/fabien0102/ts-to-zod/commit/090d050543edf0dc307d9b1a23e23394313e4568))

### [3.14.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.14.0...v3.14.1) (2024-11-25)


### Bug Fixes

* correctly extract types from index signature declaration ([#291](https://www.github.com/fabien0102/ts-to-zod/issues/291)) ([74abe78](https://www.github.com/fabien0102/ts-to-zod/commit/74abe7821dc028a639a05cad9ad6a29a538e57ed))
* handling non-identifier index access type ([#289](https://www.github.com/fabien0102/ts-to-zod/issues/289)) ([d9076dd](https://www.github.com/fabien0102/ts-to-zod/commit/d9076ddc4baa0b3006c048e3bf7308d3883e5bf0))

## [3.14.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.13.0...v3.14.0) (2024-11-24)


### Features

* add support for any JSON object as default ([#275](https://www.github.com/fabien0102/ts-to-zod/issues/275)) ([476180f](https://www.github.com/fabien0102/ts-to-zod/commit/476180ffac84aaacd4b38fb10bb19035f913b07d))
* add support for discriminatedUnion ([#281](https://www.github.com/fabien0102/ts-to-zod/issues/281)) ([4dfbab5](https://www.github.com/fabien0102/ts-to-zod/commit/4dfbab55b2283ade866529eb5807c17736a75275))


### Bug Fixes

* **Imports:** support for named imports in generated files ([#287](https://www.github.com/fabien0102/ts-to-zod/issues/287)) ([56b4374](https://www.github.com/fabien0102/ts-to-zod/commit/56b4374edd002adb778ac7f943bf75d184b89b44))

## [3.13.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.12.0...v3.13.0) (2024-09-03)


### Features

* allow to append or override schema via jsdoc tag ([#266](https://www.github.com/fabien0102/ts-to-zod/issues/266)) ([dc7eea8](https://www.github.com/fabien0102/ts-to-zod/commit/dc7eea877049a717691520cd82f077ecac679070))

## [3.12.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.11.0...v3.12.0) (2024-08-29)


### Features

* add type notation to type imports ([#264](https://www.github.com/fabien0102/ts-to-zod/issues/264)) ([941169d](https://www.github.com/fabien0102/ts-to-zod/commit/941169d1e4b89570cf42ad5356c0d5d2392e3c67))

## [3.11.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.10.0...v3.11.0) (2024-08-12)


### Features

* add support for date, time and duration format types ([#260](https://www.github.com/fabien0102/ts-to-zod/issues/260)) ([27f107b](https://www.github.com/fabien0102/ts-to-zod/commit/27f107b3244dc9ecd3bc6399ee6ff723f7abd394))

## [3.10.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.9.1...v3.10.0) (2024-07-24)


### Features

* handle rest operator in tuple type ([#257](https://www.github.com/fabien0102/ts-to-zod/issues/257)) ([edc6509](https://www.github.com/fabien0102/ts-to-zod/commit/edc6509265a09c6796545887bd7a2573a2166e91))

### [3.9.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.9.0...v3.9.1) (2024-07-11)


### Bug Fixes

* handling optional & nullable in IndedexedAccessType ([#254](https://www.github.com/fabien0102/ts-to-zod/issues/254)) ([75a6e8e](https://www.github.com/fabien0102/ts-to-zod/commit/75a6e8e91ffb2dc61286f7c90b5a58f6c897dc26))

## [3.9.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.7...v3.9.0) (2024-07-11)


### Features

* **#232:** add support for Omit / Pick in interface extend clause ([#249](https://www.github.com/fabien0102/ts-to-zod/issues/249)) ([1c7b585](https://www.github.com/fabien0102/ts-to-zod/commit/1c7b5851dc6c8a1a7c754e2555cf7e4d08027838))


### Bug Fixes

* handle negative minimum, maximum, and default values from jsDoc ([#250](https://www.github.com/fabien0102/ts-to-zod/issues/250)) ([998a3c8](https://www.github.com/fabien0102/ts-to-zod/commit/998a3c8b2358893ecb2331d611398202752e784a))

### [3.8.7](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.6...v3.8.7) (2024-06-24)


### Bug Fixes

* **#244:** handle IndexedAccessType of imported schemas ([#246](https://www.github.com/fabien0102/ts-to-zod/issues/246)) ([0430a2c](https://www.github.com/fabien0102/ts-to-zod/commit/0430a2cb37363fd9d9f5e934450fb460eb464984))

### [3.8.6](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.5...v3.8.6) (2024-06-24)


### Bug Fixes

* adding support for imported QualifiedName  ([#243](https://www.github.com/fabien0102/ts-to-zod/issues/243)) ([fcb783c](https://www.github.com/fabien0102/ts-to-zod/commit/fcb783cde44eb964ebdbb07e834f0580165cee12))

### [3.8.5](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.4...v3.8.5) (2024-05-13)


### Bug Fixes

* handle undefined as optional during validation phase ([#240](https://www.github.com/fabien0102/ts-to-zod/issues/240)) ([899c5ab](https://www.github.com/fabien0102/ts-to-zod/commit/899c5ab0940e8f880c75a391b8bd1f22a5db6a73))

### [3.8.4](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.3...v3.8.4) (2024-05-11)


### Bug Fixes

* .partial() must be applied before .nullable() or .optional() ([#237](https://www.github.com/fabien0102/ts-to-zod/issues/237)) ([ea4ceec](https://www.github.com/fabien0102/ts-to-zod/commit/ea4ceece039faf74c6908317f360ec0287dd4339))

### [3.8.3](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.2...v3.8.3) (2024-04-12)


### Bug Fixes

* handling imported types as array in union and referenced in tuples ([#229](https://www.github.com/fabien0102/ts-to-zod/issues/229)) ([b797dd0](https://www.github.com/fabien0102/ts-to-zod/commit/b797dd04b62328c2af447b23af18f46e18e671bb))

### [3.8.2](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.1...v3.8.2) (2024-04-10)


### Bug Fixes

* release process needs build before publish ([#225](https://www.github.com/fabien0102/ts-to-zod/issues/225)) ([eedcb4a](https://www.github.com/fabien0102/ts-to-zod/commit/eedcb4a3418a8a479537c8db6be4e6abf7848ce3))

### [3.8.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.8.0...v3.8.1) (2024-04-10)


### Bug Fixes

* validation works when generating on same (input) file. ([#221](https://www.github.com/fabien0102/ts-to-zod/issues/221)) ([c146e83](https://www.github.com/fabien0102/ts-to-zod/commit/c146e83ac7ba637fb413c68fbed64d7807340f59))
Fixes [#219](https://www.github.com/fabien0102/ts-to-zod/issues/219) 
* making `--help` flag work. ([#222](https://github.com/fabien0102/ts-to-zod/pull/222))
Fixes [#196](https://github.com/fabien0102/ts-to-zod/issues/196) 

## [3.8.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.7.3...v3.8.0) (2024-03-29)


### Features

* Template Literal handling ([#217](https://www.github.com/fabien0102/ts-to-zod/issues/217)) ([e21ea92](https://www.github.com/fabien0102/ts-to-zod/commit/e21ea928cb5ed6bb30f5bb6f5b90c2bd6db8ae82))

### [3.7.3](https://www.github.com/fabien0102/ts-to-zod/compare/v3.7.2...v3.7.3) (2024-02-28)


### Bug Fixes

* Mark only imported types as optional in validation ([#204](https://www.github.com/fabien0102/ts-to-zod/issues/204)) ([9e52cca](https://www.github.com/fabien0102/ts-to-zod/commit/9e52cca9a60e496c4fee4ef4bf1fb7bc015ef3eb))

### [3.7.2](https://www.github.com/fabien0102/ts-to-zod/compare/v3.7.1...v3.7.2) (2024-02-23)


### Bug Fixes

* context binding while processing errors ([#209](https://www.github.com/fabien0102/ts-to-zod/issues/209)) ([2db450b](https://www.github.com/fabien0102/ts-to-zod/commit/2db450b6503cad2e9923b893ca681a344f73ba3a))

### [3.7.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.7.0...v3.7.1) (2024-02-19)


### Bug Fixes

* fix for [#203](https://www.github.com/fabien0102/ts-to-zod/issues/203) ([06f52a3](https://www.github.com/fabien0102/ts-to-zod/commit/06f52a3777de6ac4b77025cc7f037c545608b97a))

## [3.7.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.6.1...v3.7.0) (2024-02-06)


### Features

* Handling imports of generated types ([#148](https://www.github.com/fabien0102/ts-to-zod/issues/148)) ([1a879b1](https://www.github.com/fabien0102/ts-to-zod/commit/1a879b1042254e1d228e9433bdfbe35cee300b6b))

### [3.6.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.6.0...v3.6.1) (2024-01-16)


### Bug Fixes

* Support parenthesized or null ([#198](https://www.github.com/fabien0102/ts-to-zod/issues/198)) ([6cff78c](https://www.github.com/fabien0102/ts-to-zod/commit/6cff78cb306ce849a4f079660d9178e8287a1c8e))

## [3.6.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.5.0...v3.6.0) (2024-01-07)


### Features

* Add JSDoc [@description](https://www.github.com/description) support ([#194](https://www.github.com/fabien0102/ts-to-zod/issues/194)) ([b3b3d11](https://www.github.com/fabien0102/ts-to-zod/commit/b3b3d110288edea95b27c0fc185bfda9d1229730))

## [3.5.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.4.1...v3.5.0) (2023-12-07)


### Features

* add null handling for [@default](https://www.github.com/default) tag ([#190](https://www.github.com/fabien0102/ts-to-zod/issues/190)) ([6034727](https://www.github.com/fabien0102/ts-to-zod/commit/603472773b705d04b7b93f2fba9871be81c96449))

### [3.4.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.4.0...v3.4.1) (2023-11-29)


### Bug Fixes

* fix validateGeneratedTypes on Windows ([bd7df0e](https://www.github.com/fabien0102/ts-to-zod/commit/bd7df0e86530f0e3adfda3e1e0e56a22dd83b429))

## [3.4.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.3.0...v3.4.0) (2023-11-28)


### Features

* add JSDoc tags for `string` and `number` array elements ([#180](https://www.github.com/fabien0102/ts-to-zod/issues/180)) ([df5be8b](https://www.github.com/fabien0102/ts-to-zod/commit/df5be8ba51ed3a5470f18c7665a8330f8b0a1eb2))

## [3.3.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.2.0...v3.3.0) (2023-11-08)


### Features

* allow to load config from .js or .cjs ([#173](https://www.github.com/fabien0102/ts-to-zod/issues/173)) ([2c64226](https://www.github.com/fabien0102/ts-to-zod/commit/2c64226e21dcb11fd06e81e962b8ec43137baba0))


### Bug Fixes

* fix mismatch between config file and `generate` interface ([#166](https://www.github.com/fabien0102/ts-to-zod/issues/166)) ([f9bc125](https://www.github.com/fabien0102/ts-to-zod/commit/f9bc1252aded120c81475c30f429b3b1ac9c7123))

## [3.2.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.1.3...v3.2.0) (2023-10-20)


### Features

* Support for custom `[@format](https://www.github.com/format)` types ([#145](https://www.github.com/fabien0102/ts-to-zod/issues/145)) ([acd9444](https://www.github.com/fabien0102/ts-to-zod/commit/acd94441241e2ebe0beea86ea85c8fd7a84a4df0))
* Support Record<T, U> ([#161](https://www.github.com/fabien0102/ts-to-zod/issues/161)) ([ac24784](https://www.github.com/fabien0102/ts-to-zod/commit/ac24784153811a5a0e14193e2cabaa4085316956))


### Bug Fixes

* Various type extractions ([#159](https://www.github.com/fabien0102/ts-to-zod/issues/159)) ([18825d9](https://www.github.com/fabien0102/ts-to-zod/commit/18825d93561512dc96f1213c75faf433ee330ccc))

### [3.1.3](https://www.github.com/fabien0102/ts-to-zod/compare/v3.1.2...v3.1.3) (2023-06-27)


### Bug Fixes

* relax any type validation ([#142](https://www.github.com/fabien0102/ts-to-zod/issues/142)) ([7e75f90](https://www.github.com/fabien0102/ts-to-zod/commit/7e75f90ff0a00e2e60c2b5e329880364e1acd15e))

### [3.1.2](https://www.github.com/fabien0102/ts-to-zod/compare/v3.1.1...v3.1.2) (2023-05-24)


### Bug Fixes

* strict() modifier should come before optional/nullable ([#137](https://www.github.com/fabien0102/ts-to-zod/issues/137)) ([f8be6bd](https://www.github.com/fabien0102/ts-to-zod/commit/f8be6bde6f8fa65310ac0a17f679ed61a3be3480))

### [3.1.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.1.0...v3.1.1) (2023-05-24)


### Bug Fixes

* strict() keyword working root interfaces ([#134](https://www.github.com/fabien0102/ts-to-zod/issues/134)) ([a9f6f03](https://www.github.com/fabien0102/ts-to-zod/commit/a9f6f030c85f1fb199c902348e6ff23c99c1a335))

## [3.1.0](https://www.github.com/fabien0102/ts-to-zod/compare/v3.0.1...v3.1.0) (2023-05-17)


### Features

* Adding JSDoc tag `useStrict` to output `strict()` modifier ([#131](https://www.github.com/fabien0102/ts-to-zod/issues/131)) ([f73a676](https://www.github.com/fabien0102/ts-to-zod/commit/f73a67656c3ae351a02a6435ee0fe4202a55b6d6))

### [3.0.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.0.0...v3.0.1) (2023-05-17)


### Bug Fixes

* Handling negative literals ([#132](https://www.github.com/fabien0102/ts-to-zod/issues/132)) ([a1ad399](https://www.github.com/fabien0102/ts-to-zod/commit/a1ad3993db02f9a144cdc0f36dff0324f124f84d))
* support numeric literal keys ([#120](https://www.github.com/fabien0102/ts-to-zod/issues/120)) ([7bbed16](https://www.github.com/fabien0102/ts-to-zod/commit/7bbed16db6243a7c09312d49d95a5fc61b62ba09))

## [3.0.0](https://www.github.com/fabien0102/ts-to-zod/compare/v2.0.1...v3.0.0) (2023-03-13)


### ⚠ BREAKING CHANGES

* Support circular dependencies with loops of length > 1 (#114)

### Features

* Generate inferred types ([#85](https://www.github.com/fabien0102/ts-to-zod/issues/85)) ([250f64d](https://www.github.com/fabien0102/ts-to-zod/commit/250f64d6f6850a15440d3b0f7602c6b92cd173fe))
* Support circular dependencies with loops of length > 1 ([#114](https://www.github.com/fabien0102/ts-to-zod/issues/114)) ([b0eb555](https://www.github.com/fabien0102/ts-to-zod/commit/b0eb555b0e060b5dee18ff41c702e46df6ac1150))

### [2.0.1](https://www.github.com/fabien0102/ts-to-zod/compare/v2.0.0...v2.0.1) (2023-01-30)


### Bug Fixes

* empty interfaces' extends statements are ignored [#108](https://www.github.com/fabien0102/ts-to-zod/issues/108) ([#109](https://www.github.com/fabien0102/ts-to-zod/issues/109)) ([4ad2d09](https://www.github.com/fabien0102/ts-to-zod/commit/4ad2d0962fd1a5efd1b14e4b89d2b642c227649a))

## [2.0.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.13.1...v2.0.0) (2023-01-26)


### ⚠ BREAKING CHANGES

* Inheritance and reference type search for name filtering (#104)

### Features

* Inheritance and reference type search for name filtering ([#104](https://www.github.com/fabien0102/ts-to-zod/issues/104)) ([038b9f6](https://www.github.com/fabien0102/ts-to-zod/commit/038b9f6c14df79d9fc9756f6c2c21d76e8c46cfe))


### Bug Fixes

* extends interface inside namespace ([#106](https://www.github.com/fabien0102/ts-to-zod/issues/106)) ([958d5a5](https://www.github.com/fabien0102/ts-to-zod/commit/958d5a59e8df9b6f0183f64f794eaf26eb5350a8))

### [1.13.1](https://www.github.com/fabien0102/ts-to-zod/compare/v1.13.0...v1.13.1) (2022-08-26)


### Bug Fixes

* Fix bad cherry-pick ([ac5af38](https://www.github.com/fabien0102/ts-to-zod/commit/ac5af38a2737a52b707d287077397c9ad8314b6b))

## [1.13.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.12.0...v1.13.0) (2022-08-26)


### Features

* add support for  `z.set` ([#94](https://www.github.com/fabien0102/ts-to-zod/issues/94)) ([762c69c](https://www.github.com/fabien0102/ts-to-zod/commit/762c69c1f8ed89d435251ee415dc7e2249a951f9))


### Bug Fixes

* Fix nullable ([#92](https://www.github.com/fabien0102/ts-to-zod/issues/92)) ([f2321a3](https://www.github.com/fabien0102/ts-to-zod/commit/f2321a355910418ddfb12cb93fcd4b4590469e68))

## [1.12.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.11.0...v1.12.0) (2022-07-26)


### Features

* Adds support and test for ReadonlyArray ([#88](https://www.github.com/fabien0102/ts-to-zod/issues/88)) ([513ebf9](https://www.github.com/fabien0102/ts-to-zod/commit/513ebf9134375960c721a6acf1ad5a78d1abf92a))

## [1.11.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.10.0...v1.11.0) (2022-06-02)


### Features

* Add support for unknown type ([#83](https://www.github.com/fabien0102/ts-to-zod/issues/83)) ([f3bd8e6](https://www.github.com/fabien0102/ts-to-zod/commit/f3bd8e69ce28e1bd37b742e35ad5049ce6918dec))

## [1.10.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.9.0...v1.10.0) (2022-02-25)


### Features

* support custom zod error message ([#73](https://www.github.com/fabien0102/ts-to-zod/issues/73)) ([36964b3](https://www.github.com/fabien0102/ts-to-zod/commit/36964b3ed193b775d6d95bb123a03016c9b97915))

## [1.9.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.8.0...v1.9.0) (2022-02-22)


### Features

* add JSDocTag filter ([#72](https://www.github.com/fabien0102/ts-to-zod/issues/72)) ([5f6bb7f](https://www.github.com/fabien0102/ts-to-zod/commit/5f6bb7f1004584378ebf0b94637d133b549f1972))
* add support for multiple interface extensions ([#68](https://www.github.com/fabien0102/ts-to-zod/issues/68)) ([e349c33](https://www.github.com/fabien0102/ts-to-zod/commit/e349c33de997505da77103555f8d67446983b9f1))

## [1.8.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.7.0...v1.8.0) (2021-12-10)


### Features

* Add `skipParseJSDoc` option ([#62](https://www.github.com/fabien0102/ts-to-zod/issues/62)) ([e48c5fe](https://www.github.com/fabien0102/ts-to-zod/commit/e48c5fef0bc8cd09a5305b13ea1d62be20d0c5a7))


### Bug Fixes

* union properties can be optional & nullable ([#66](https://www.github.com/fabien0102/ts-to-zod/issues/66)) ([2ba1838](https://www.github.com/fabien0102/ts-to-zod/commit/2ba18388a9194f008eac7f522ba4963da65a27f8))

## [1.7.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.6.0...v1.7.0) (2021-11-28)


### Features

* Improve nullable ([#57](https://www.github.com/fabien0102/ts-to-zod/issues/57)) ([0e00f1e](https://www.github.com/fabien0102/ts-to-zod/commit/0e00f1ea064a3ee01e66ca92260e9adf98407496))
* Parse top-level JSDoc tag on `type` ([#59](https://www.github.com/fabien0102/ts-to-zod/issues/59)) ([33b17f6](https://www.github.com/fabien0102/ts-to-zod/commit/33b17f6553add96f5d0685d6e800fc892b5bb00a))

## [1.6.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.5.1...v1.6.0) (2021-10-25)


### Features

* Support `IndexAccessType` ([#51](https://www.github.com/fabien0102/ts-to-zod/issues/51)) ([2b28266](https://www.github.com/fabien0102/ts-to-zod/commit/2b2826679353ac3df7848be320b94d8fe2c38092))

### [1.5.1](https://www.github.com/fabien0102/ts-to-zod/compare/v1.5.0...v1.5.1) (2021-10-07)


### Bug Fixes

* Fix optional function parameter ([#48](https://www.github.com/fabien0102/ts-to-zod/issues/48)) ([bf0d527](https://www.github.com/fabien0102/ts-to-zod/commit/bf0d527844ae53e69247b07fde18d4871880b872)), closes [#47](https://www.github.com/fabien0102/ts-to-zod/issues/47)

## [1.5.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.4.0...v1.5.0) (2021-09-20)


### Features

* Support namespace ([#44](https://www.github.com/fabien0102/ts-to-zod/issues/44)) ([3255083](https://www.github.com/fabien0102/ts-to-zod/commit/3255083644ded94810c9ea673d14b5a863a10995))

## [1.4.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.3.0...v1.4.0) (2021-07-29)


### Features

* Adds support for use of enum types as literals and nativeEnums ([#40](https://www.github.com/fabien0102/ts-to-zod/issues/40)) ([45a64a3](https://www.github.com/fabien0102/ts-to-zod/commit/45a64a3b180f2668628f72d844855dfda038399c))


### Bug Fixes

* Fixes [#36](https://www.github.com/fabien0102/ts-to-zod/issues/36) | Allows for single value unions ([#37](https://www.github.com/fabien0102/ts-to-zod/issues/37)) ([57a38b2](https://www.github.com/fabien0102/ts-to-zod/commit/57a38b27b2922f680ad3bbd0ce661e8a27aa5110))

## [1.3.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.2.1...v1.3.0) (2021-05-31)


### Features

* Add `Date` support ([#32](https://www.github.com/fabien0102/ts-to-zod/issues/32)) ([46d769a](https://www.github.com/fabien0102/ts-to-zod/commit/46d769ad5b3ab81029cf6d9f504846b784c95f38))

### [1.2.1](https://www.github.com/fabien0102/ts-to-zod/compare/v1.2.0...v1.2.1) (2021-05-28)


### Bug Fixes

* Fix typescript version ([#28](https://www.github.com/fabien0102/ts-to-zod/issues/28)) ([5bdecbc](https://www.github.com/fabien0102/ts-to-zod/commit/5bdecbca185622515442b25e8df4c5d7c8b9c88d))

## [1.2.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.1.0...v1.2.0) (2021-05-26)


### Features

* Add `never` support ([#25](https://www.github.com/fabien0102/ts-to-zod/issues/25)) ([3267f67](https://www.github.com/fabien0102/ts-to-zod/commit/3267f67cab2bc2c4793bb7ec340f65dcd0df0a3d))

## [1.1.0](https://www.github.com/fabien0102/ts-to-zod/compare/v1.0.3...v1.1.0) (2021-05-23)


### Features

* Update to zod 3.0.2 ([f638921](https://www.github.com/fabien0102/ts-to-zod/commit/f638921f345733752436af53cffa2f2bdaecf903))

### [1.0.3](https://www.github.com/fabien0102/ts-to-zod/compare/v1.0.2...v1.0.3) (2021-05-03)


### Bug Fixes

* Fix optional array ([#20](https://www.github.com/fabien0102/ts-to-zod/issues/20)) ([ae61041](https://www.github.com/fabien0102/ts-to-zod/commit/ae610410b1a6d8caeaa4caa614bf2d69613a6f36)), closes [#18](https://www.github.com/fabien0102/ts-to-zod/issues/18)
