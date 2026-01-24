# Code Conventions

**Analysis Date:** 2026-01-23

## TypeScript Standards

### NEVER Use `any`

The `any` type is **banned** in this codebase. Instead use:

- Specific interfaces/types
- `unknown` with type guards
- Generic types `<T>`
- `Record<string, unknown>` for unknown objects
- Import existing types from `src/types/` or generated types

### Strict Mode

- `strict: true` in tsconfig.json
- All parameters must be typed
- Return types should be explicit for public APIs

## Code Style

### ESLint Configuration

- Config: `eslint.config.mjs` (flat config format)
- Extends: Next.js recommended rules
- TypeScript-aware linting

### Prettier Configuration

- Config: `.prettierrc`
- Single quotes
- Trailing commas
- 2-space indentation

### Import Order

1. React/Next.js imports
2. Third-party libraries
3. Internal aliases (`@/`)
4. Relative imports
5. Type imports last

## Component Patterns

### Server vs Client Components

- Default to Server Components
- Add `'use client'` only when needed (hooks, interactivity)
- Mobile pattern: Server page fetches data, passes to `*Client.tsx`

### Component Structure

```tsx
// 1. Imports
import { ... } from '...'

// 2. Types
interface Props {
  ...
}

// 3. Component
export function ComponentName({ prop1, prop2 }: Props) {
  // hooks first
  const [state, setState] = useState()

  // derived values
  const computed = useMemo(() => ..., [deps])

  // effects
  useEffect(() => ..., [deps])

  // handlers
  const handleClick = () => ...

  // render
  return (...)
}
```

### Mobile Components

- Minimum 44px touch targets
- Use `active:scale-[0.95]` for tap feedback
- Bottom sheets instead of modals
- Client components named `*Client.tsx`

## Data Fetching

### Generated Hooks (Preferred)

```typescript
import { useGetAlbumQuery } from '@/generated/graphql';

const { data, isLoading, error } = useGetAlbumQuery(
  { id: albumId },
  { enabled: !!albumId }
);
```

### GraphQL Workflow

1. Add to schema: `src/graphql/schema.graphql`
2. Add resolver: `src/lib/graphql/resolvers/`
3. Add client query: `src/graphql/queries/`
4. Run `pnpm codegen`
5. Use generated hook

## Error Handling

### GraphQL Errors

- Use `GraphQLError` from `graphql`
- Include error codes for client handling
- Log server errors, return safe messages to client

### Client Errors

- Use Error Boundary for unexpected errors
- Show toast notifications for user actions
- Provide retry options when appropriate

### API Errors

- Validate input with Zod
- Return structured error responses
- Include correlation IDs for debugging

## Logging

### Logger Usage

```typescript
import { logger } from '@/lib/logger';

logger.info('Operation completed', { userId, action });
logger.error('Operation failed', { error, context });
```

### Log Levels

- `error` - Failures requiring attention
- `warn` - Unexpected but handled
- `info` - Normal operations
- `debug` - Development details

## Testing

### Unit Tests (Vitest)

- Location: `tests/unit/`
- Test utilities, pure functions
- Mock external dependencies

### Integration Tests

- Location: `tests/integration/`
- Test GraphQL resolvers
- Use test database

### E2E Tests (Playwright)

- Location: `tests/e2e/`
- Test user flows
- Run against dev server

## Git Conventions

### Commit Messages

```
type: short description

- detail 1
- detail 2
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`

### Branch Names

- Feature: `feat/description`
- Fix: `fix/description`
- Refactor: `refactor/description`

## Deprecated Patterns

**DO NOT USE these search components:**

- `src/components/ui/SearchBar.tsx`
- `src/components/ui/AlbumSearch.tsx`
- `src/components/ui/AlbumSearchWrapper.tsx`
- `src/components/ui/SearchResultRenderer.tsx`
- `src/components/ui/SearchResults.tsx`

**USE instead:**

- `SimpleSearchBar.tsx` - Header search
- `UniversalSearchBar.tsx` - Mobile/search page
- `DualAlbumSearch.tsx` - Recommendation flows

---

_Conventions analysis: 2026-01-23_

## Component Implementation Patterns
