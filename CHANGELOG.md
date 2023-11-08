# Changelog

### [3.2.1](https://www.github.com/fabien0102/ts-to-zod/compare/v3.2.0...v3.2.1) (2023-11-08)


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
