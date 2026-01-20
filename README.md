# Canary

Lightweight Shiki transformer to add Dart code inspection hovers in VitePress.

## What it does

- Lexes Dart code blocks to identify declarations and expressions.
- Builds a simple CST and scope tree to track variable and type information.
- Adds hover popovers showing inferred types and documentation for variables, members, and expressions.

## How to use

Go to `.vitepress/config.mts` and add the `canaryTransformer` to the list of code transformers:

```ts
// .vitepress/config.mts
import { canaryTransformer } from '@avesbox/canary'
export default defineConfig({
  markdown: {
    codeTransformers: [canaryTransformer()],
  },
})
```

The transformer will automatically apply to all Dart code blocks (```dart). If you wish for it to only apply to specific code blocks, you can use the canary directive and add the parameter explicitTrigger set to true:

```ts
// .vitepress/config.mts
import { canaryTransformer } from '@avesbox/canary'

export default defineConfig({
  markdown: {
    codeTransformers: [canaryTransformer({ explicitTrigger: true })],
  },
})
```

Then in your markdown files, use the `canary` directive in the code fence:

```dart canary
final message = "Hello, Canary!";
message.length;
```

Then in your theme file, initialize the Canary theme enhancements:

```ts
// .vitepress/theme/index.ts
import { setupCanaryTheme } from '@avesbox/canary'
import '@avesbox/canary/style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp(ctx) {
    DefaultTheme?.enhanceApp?.(ctx)
    setupCanaryTheme()
  },
}
```

Use regular ```dart fences; no custom fence syntax is needed.

## Custom Types

You can define external types for the inspector to recognize. This is useful for documenting framework types that aren't defined in the code block itself.

### Inline configuration

```ts
// .vitepress/config.mts
import { canaryTransformer, defineCustomTypes } from '@avesbox/canary'

const customTypes = defineCustomTypes({
  types: [
    {
      name: 'Provider',
      description: 'A dependency injection container.',
      members: {
        get: { type: 'T', description: 'Retrieves an instance of type T.' },
        has: 'bool',
      },
      staticMembers: {
        of: { type: 'Provider', description: 'Returns the nearest Provider.' },
      },
    },
    {
      name: 'Request',
      description: 'Represents an HTTP request.',
      members: {
        method: 'String',
        path: 'String',
        body: { type: 'dynamic', description: 'The parsed request body.' },
      },
    },
  ],
})

export default defineConfig({
  markdown: {
    codeTransformers: [canaryTransformer({ customTypes })],
  },
})
```

When a custom type is used in code, the inspector will:

1. Recognize the type name and show its description on hover
2. Resolve member access (e.g., `request.body`) with the correct type and description
3. Include the type in variable inference (e.g., `final req = Request()` → `req: Request`)
