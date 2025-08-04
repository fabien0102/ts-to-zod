# Zod v4 Migration Guide for ts-to-zod

This guide helps you migrate from ts-to-zod v3.x (Zod v3) to ts-to-zod v4.x (Zod v4).

## Overview

ts-to-zod has been upgraded to support **Zod v4**, which brings significant performance improvements, a more intuitive API, and enhanced TypeScript performance. This migration guide covers the essential changes you need to know.

## What Changed

### 1. Zod Dependency Upgrade

ts-to-zod now requires **Zod v4.0.14** or higher as both a dependency and peer dependency.

```json
{
  "dependencies": {
    "zod": "^4.0.14"
  },
  "peerDependencies": {
    "zod": "^4.0.14"
  }
}
```

### 2. Function Type Handling

We've added enhanced support for function types with new utility functions:

- **Function Type Detection**: Better detection and handling of TypeScript function types
- **Promise Type Support**: Enhanced support for Promise return types in functions
- **Async Function Validation**: Improved handling of async function types

> **Reason for Change**: Zod v4 introduces stricter function validation and better type inference. Our new utilities ensure ts-to-zod correctly generates schemas for complex function types.

### 3. Generated Schema Improvements

The generated Zod schemas now take advantage of Zod v4's performance optimizations:

- **Faster Validation**: Generated schemas are up to 3x faster thanks to Zod v4's internal optimizations
- **Better Type Inference**: Improved TypeScript performance with 20x reduction in compiler instantiations
- **Smaller Bundle Size**: Zod v4 core bundle is ~57% smaller

## Migration Steps

### Step 1: Update Dependencies

```bash
npm install zod@^4.0.14
# or
pnpm add zod@^4.0.14
```

### Step 2: Regenerate Schemas

Run ts-to-zod to regenerate your schemas with Zod v4 compatibility:

```bash
npx ts-to-zod
# or if using configuration
npx ts-to-zod --config your-config
```

### Step 3: Update Your Code (if needed)

Most generated schemas will work without changes. However, if you have custom error handling or use Zod's advanced features, review the [Zod v4 changelog](https://zod.dev/v4/changelog) for breaking changes:

> **Key Zod v4 Changes**:
> - Error customization API overhaul: `message` replaced with `error`
> - `invalid_type_error` and `required_error` parameters dropped  
> - Object method changes: use `z.strictObject()` and `z.looseObject()` instead of deprecated methods

## What We Added

### Enhanced Function Type Support

New test coverage for:
- Direct function type aliases: `type MyFunc = (x: string) => number`
- Function properties in interfaces: `interface API { method: (id: string) => Promise<User> }`
- Promise return types: `type AsyncFunc = () => Promise<Data>`
- Union types with functions: `type Handler = ((event: Event) => void) | string`

### Comprehensive Test Suite

We've expanded our test suite to ensure compatibility with Zod v4:
- **Function type detection tests**: Validates proper handling of various function type patterns
- **Promise type validation tests**: Ensures async function types are correctly processed
- **Existing functionality tests**: All previous tests continue to pass, ensuring backward compatibility

## Performance Benefits

After upgrading, you'll experience:

- **3x faster validation** for complex nested schemas
- **57% smaller bundle size** in your applications
- **20x faster TypeScript compilation** for large schema files
- **Improved IDE performance** with reduced type instantiations

> The stats come from the [Zod v4 Changelog](https://zod.dev/v4/changelog)

## Troubleshooting

### Common Issues

**Generated schemas not working?**
- Ensure you're using Zod v4.0.14 or higher
- Regenerate all schemas after upgrading

**TypeScript compilation errors?**
- Update your Zod import to use v4 features if needed
- Check for deprecated Zod v3 methods in your custom code

**Performance not improved?**
- Verify you're using the regenerated schemas (not cached v3 schemas)
- Check that your application is using Zod v4

## Need Help?

- Review the [official Zod v4 migration guide](https://zod.dev/v4/changelog)
- Check our [test examples](./src/utils/isFunctionType.test.ts) for function type handling patterns
- Open an issue on our [GitHub repository](https://github.com/fabien0102/ts-to-zod/issues)
