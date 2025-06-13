# Playwright Tests for User Registration

This directory contains end-to-end tests for the user registration flow using Playwright.

## Setup

1. **Install dependencies** (already done if you ran `pnpm install`):

   ```bash
   pnpm add -D @playwright/test
   ```

2. **Install Playwright browsers**:

   ```bash
   pnpm exec playwright install
   ```

3. **Set up environment variables**:
   - Copy `.env.test` to `.env.local` if you don't have one already
   - Make sure you have a PostgreSQL database running
   - Update the DATABASE_URL in `.env.local` to point to your test database

## Running Tests

### Run all tests

```bash
pnpm test
```

### Run tests in UI mode (recommended for development)

```bash
pnpm test:ui
```

### Run tests in debug mode

```bash
pnpm test:debug
```

### Run specific test file

```bash
pnpm test tests/auth.spec.ts
```

### Run tests with specific browser

```bash
pnpm test --project=chromium
pnpm test --project=firefox
pnpm test --project=webkit
```

### View test report

```bash
pnpm test:report
```

## Test Structure

- `auth.spec.ts` - Contains all user registration tests
- `helpers/setup.ts` - Helper functions for test setup
- `global-setup.ts` - Global setup that runs before all tests

## What's Tested

The registration tests cover:

1. Form display and field validation
2. Password strength indicator
3. Successful user registration
4. Duplicate email handling
5. Form submission states
6. Error message handling
7. Navigation between auth pages
8. Optional field handling

## Troubleshooting

### Database Connection Issues

If you see "Environment variable not found: DATABASE_URL" errors:

1. Make sure you have `.env.local` file with proper database credentials
2. Ensure your PostgreSQL database is running
3. Run `pnpm prisma generate` to generate the Prisma client

### Missing Dependencies

If you see errors about missing system libraries:

```bash
# On Ubuntu/Debian
sudo apt-get install -y libgstreamer1.0-0 libgtk-4-1 libwebkit2gtk-4.0-37

# Or install all Playwright dependencies
pnpm exec playwright install-deps
```

### Test Failures

- Check that the dev server is running properly
- Verify database migrations are up to date: `pnpm prisma db push`
- Check browser console for JavaScript errors
- Use `pnpm test:ui` to debug failing tests visually

## Writing New Tests

When adding new tests:

1. Follow the existing pattern in `auth.spec.ts`
2. Use descriptive test names
3. Always clean up test data after tests
4. Use unique identifiers (like timestamps) for test data
5. Add appropriate timeouts for async operations
