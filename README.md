# Dart inspect transformer (docs-only)

Lightweight Shiki transformer that powers `// inspect:type` directives in Dart code blocks for the Serinus docs. It deliberately avoids the Dart analyzer, WASM, external binaries, or runtime execution. The transformer runs at docs build time inside VitePress and emits hover metadata via Shiki’s standard HTML annotations.

## What it does

- Lexes Dart source with a single-pass, lossless lexer (keeps offsets and whitespace intact).
- Scans for line comment directives:
  - `// inspect:type` → attach the next identifier (or member) hover.
  - `// inspect:ignore-errors` → suppresses future error reporting (no effect today, reserved for future checks).
- Recognizes only a tiny language surface:
  - Primitives: `int`, `double`, `bool`, `String`, `dynamic`.
  - User types via `class Foo {}` and `final foo = Foo();` heuristics.
  - Patterns: `final x = …`, `var x = …`, `Type x = …`, `class Foo`, and member access `foo.bar`.
- Produces markdown hover payloads (e.g. `` `count`: int `` or ``length: int (from String)``) that are rendered by the theme popover.

## What it does NOT do

- No Dart analyzer, no real type system, no generics, nullability, futures, imports, or runtime execution.
- No execution or evaluation of expressions.
- If a type cannot be determined the hover says `type: unknown`.

## Minimal VitePress wiring

Already wired in `.website/.vitepress/config.mts` and the theme:

```ts
// .vitepress/config.mts
import { dartInspectTransformer } from './dart-inspect/transformer'

export default defineConfig({
  markdown: {
    codeTransformers: [dartInspectTransformer()],
  },
})
```

```ts
// .vitepress/theme/index.ts
import { setupDartInspect } from './dart-inspect.client'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp(ctx) {
    DefaultTheme?.enhanceApp?.(ctx)
    setupDartInspect(ctx)
  },
}
```

Use regular ```dart fences; no custom fence syntax is needed.

## Custom Types

You can define external types for the inspector to recognize. This is useful for documenting framework types (e.g., `Provider`, `Controller`) that aren't defined in the code block itself.

### Inline configuration

```ts
// .vitepress/config.mts
import { dartInspectTransformer } from './dart-inspect/transformer'
import { defineCustomTypes } from './dart-inspect/define-types'

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
    codeTransformers: [dartInspectTransformer({ customTypes })],
  },
})
```

### Pre-built Serinus types

The package includes pre-defined types for the Serinus framework:

```ts
import { dartInspectTransformer } from './dart-inspect/transformer'
import { serinusTypes } from './dart-inspect/serinus-types'

export default defineConfig({
  markdown: {
    codeTransformers: [dartInspectTransformer({ customTypes: serinusTypes })],
  },
})
```

### Type definition schema

```ts
interface CustomType {
  /** The class/type name */
  name: string
  /** Description shown on hover */
  description?: string
  /** Instance members (properties/methods) */
  members?: Record<string, string | { type: string; description?: string }>
  /** Static members (accessed via ClassName.member) */
  staticMembers?: Record<string, string | { type: string; description?: string }>
  /** Constructor signatures (optional) */
  constructors?: string[]
}
```

When a custom type is used in code, the inspector will:
1. Recognize the type name and show its description on hover
2. Resolve member access (e.g., `request.body`) with the correct type and description
3. Include the type in variable inference (e.g., `final req = Request()` → `req: Request`)

## Usage

```dart
// inspect:type
final count = 1;

// inspect:type
message.length;
```

Hover over `count` → `` `count`: int ``. Hover over `length` → ``length: int (from String)``.

## Implementation notes

- Lexer emits `{ kind, text, start, end }` with UTF-16 offsets so Shiki spans line up with hover ranges.
- Inspector is a shallow pattern recognizer, not an AST. It prefers deterministic, readable heuristics over completeness.
- Transformer uses Shiki’s `span` hook to add `data-dart-hover` attributes; the theme reads those and shows a popover (no DOM rewrites).
- Popover rendering is a small, dependency-free client script with a minimal markdown renderer for inline code/italics/bold.

## Limitations / extension ideas

- No awareness of scopes or shadowing; the latest seen declaration wins.
- Member knowledge is tiny (e.g. `String.length`, `String.isEmpty`, `int.bitLength`, `double.toInt`).
- Constructors are matched only as `Foo()`; `new`/`const`/named constructors are ignored.
- Block directives are file-wide; only line comments are parsed.
- If code is malformed the lexer stays lossless; hovers may simply return `type: unknown`.
