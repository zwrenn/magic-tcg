<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Component props

Define props as a named `interface` or `type` alias, not inline. This makes them easier to read, share, and extend.

```tsx
// ✅
interface CardProps { name: string; image: string | null; }
function Card({ name, image }: CardProps) { ... }

// ❌
function Card({ name, image }: { name: string; image: string | null }) { ... }
```

## File naming conventions

- **Component files** use PascalCase: `MyComponent.tsx`
- **Plain TS modules** (hooks, utils, types, lib) use camelCase: `useMyHook.ts`, `cardTypes.ts`
- **Next.js route segments and pages** use kebab-case as required by the framework: `my-page/page.tsx`

If you are doing direct work in a file and it has an "incorrect" name per this convention, please rename it as part of your work. DON'T go around renaming random files you simply encounter; only if you are actually working in that file.

## Styling

- Do **not** add anything to `globals.css`. Use Tailwind utility classes or a locally-scoped CSS module (`.module.css`) for any styles that can't be expressed inline.

## File length and component reuse

- Aim to keep files under ~250 lines. If a file is growing beyond that, look for logical units to extract as separate components or hooks.
- Before writing a new primitive (button, chip, select, toggle, etc.), scan `src/components/` for an existing one. Prefer extending an existing component over creating a duplicate.
