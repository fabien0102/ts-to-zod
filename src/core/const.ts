// Reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
export const standardBuiltInObjects = [
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#fundamental_objects
  "Object",
  "Function",
  "Boolean",
  "Symbol",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#error_objects
  "Error",
  "AggregateError",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "URIError",
  // "InternalError",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#numbers_and_dates
  "Number",
  "BigInt",
  "Math",
  // "Date",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#indexed_collections
  // "Array",
  "Int8Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "Int16Array",
  "Uint16Array",
  "Int32Array",
  "Uint32Array",
  "BigInt64Array",
  "BigUint64Array",
  "Float32Array",
  "Float64Array",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#keyed_collections
  "Map",
  "Set",
  "WeakMap",
  "WeakSet",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#structured_data
  "ArrayBuffer",
  "SharedArrayBuffer",
  "DataView",
  "Atomics",
  "JSON",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#managing_memory
  "WeakRef",
  "FinalizationRegistry",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#control_abstraction_objects
  "Promise",
  "GeneratorFunction",
  "AsyncGeneratorFunction",
  "Generator",
  "AsyncGenerator",
  "AsyncFunction",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#reflection
  "Reflect",
  "Proxy",
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects#internationalization
  // "Intl",
  // "Intl.Collator",
  // "Intl.DateTimeFormat",
  // "Intl.DisplayNames",
  // "Intl.ListFormat",
  // "Intl.Locale",
  // "Intl.NumberFormat",
  // "Intl.PluralRules",
  // "Intl.RelativeTimeFormat",
  // "Intl.Segmenter",
];

export const standardBuiltInObjectVarNames = standardBuiltInObjects.map(
  (n) => n[0].toLocaleLowerCase() + n.substring(1) + "Schema"
);
