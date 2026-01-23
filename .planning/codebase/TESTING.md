# Testing

**Analysis Date:** 2026-01-23

## Test Frameworks

### Vitest (Unit/Integration)
- Config: `vitest.config.ts`
- Run: `pnpm test:unit`
- Location: `tests/unit/`, `tests/integration/`

### Playwright (E2E)
- Config: `playwright.config.ts`
- Run: `pnpm test`
- Run with UI: `pnpm test:ui`
- Location: `tests/e2e/`

## Directory Structure

```
tests/
├── e2e/                    # End-to-end tests
│   ├── auth/              # Authentication flows
│   │   └── login.spec.ts
│   └── ...
├── integration/           # Integration tests
│   └── graphql/          # GraphQL resolver tests
│       ├── mutations.test.ts
│       └── test-utils.ts
├── unit/                  # Unit tests
│   ├── components/       # Component tests
│   │   └── mobile-settings.test.ts
│   └── lib/             # Library tests
│       ├── utils.test.ts
│       ├── validations.test.ts
│       ├── fuzzy-match.test.ts
│       └── musicbrainz-mappers.test.ts
├── setup.ts              # Test setup
├── global-setup.ts       # Global setup (runs once)
└── README.md             # Test documentation
```

## Test Configuration

### Vitest Setup
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
  },
})
```

### Playwright Setup
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  webServer: {
    command: 'pnpm dev',
    port: 3000,
  },
})
```

## Testing Patterns

### Unit Tests
```typescript
import { describe, it, expect } from 'vitest'
import { formatDate } from '@/lib/utils'

describe('formatDate', () => {
  it('formats date correctly', () => {
    const result = formatDate('2026-01-23')
    expect(result).toBe('January 23, 2026')
  })
})
```

### GraphQL Integration Tests
```typescript
import { describe, it, expect } from 'vitest'
import { createTestContext } from './test-utils'

describe('Album mutations', () => {
  it('creates album', async () => {
    const ctx = await createTestContext()
    const result = await ctx.mutation.createAlbum({ ... })
    expect(result.id).toBeDefined()
  })
})
```

### E2E Tests
```typescript
import { test, expect } from '@playwright/test'

test('user can login', async ({ page }) => {
  await page.goto('/auth/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/')
})
```

## Mocking

### Vitest Mocks
```typescript
import { vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    album: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))
```

### External API Mocks
- MusicBrainz: Mock `musicbrainz-api` responses
- Spotify: Mock `@spotify/web-api-ts-sdk` responses
- Use MSW for HTTP-level mocking if needed

## Test Database

### Setup
```bash
pnpm test:setup    # Initial setup
pnpm test:reset    # Reset database
```

### Environment
- Uses `.env.test` for test configuration
- Separate database from development
- Seeded with test fixtures

## Test Scripts

```json
{
  "test": "playwright test",
  "test:ui": "playwright test --ui",
  "test:unit": "vitest",
  "test:debug": "playwright test --debug",
  "test:setup": "...",
  "test:reset": "..."
}
```

## Coverage

### Running Coverage
```bash
pnpm test:unit --coverage
```

### Coverage Targets
- Utilities: 80%+
- GraphQL resolvers: 70%+
- Components: Best effort

## Best Practices

1. **Test behavior, not implementation**
2. **Use realistic test data**
3. **Keep tests independent**
4. **Clean up after tests**
5. **Mock external services**
6. **Use descriptive test names**

---

*Testing analysis: 2026-01-23*
