# Technology Stack

**Analysis Date:** 2026-01-23

## Languages

**Primary:**
- TypeScript 5.x - All application code (`src/`)
- SQL - Database queries via Prisma ORM

**Secondary:**
- JavaScript - Configuration files (ESLint, PostCSS)

## Runtime

**Environment:**
- Node.js (pnpm package manager)
- Next.js 15.1.x with Turbopack dev server

## Frameworks

**Core:**
- Next.js 15 - Full-stack React framework with App Router
- React 19 - UI library
- Prisma 6.x - Database ORM

**API:**
- Apollo Server 5.x - GraphQL server (`src/app/api/graphql/route.ts`)
- graphql 16.x - GraphQL implementation
- graphql-request - GraphQL client

**Testing:**
- Playwright - E2E testing (`playwright.config.ts`)
- Vitest - Unit/integration testing (`vitest.config.ts`)

**Build/Dev:**
- Turbopack - Next.js dev server bundler
- TypeScript 5.x - Type checking
- ESLint 9 - Linting (`eslint.config.mjs`)
- Prettier - Code formatting
- Husky - Git hooks
- lint-staged - Pre-commit linting

## Key Dependencies

**Critical:**
- `next-auth` 5.0.0-beta - Authentication
- `@prisma/client` - Database client
- `bullmq` - Background job queue
- `ioredis` - Redis client
- `@tanstack/react-query` 5.x - Data fetching/caching

**UI:**
- `tailwindcss` - Utility-first CSS
- `@radix-ui/*` - Headless UI components (Dialog, Dropdown, Popover, Select, Tabs, Tooltip)
- `lucide-react` - Icons
- `framer-motion` - Animations
- `sonner` - Toast notifications
- `cmdk` - Command palette
- `vaul` - Drawer component
- `recharts` - Charts

**External APIs:**
- `@spotify/web-api-ts-sdk` - Spotify API
- `musicbrainz-api` - MusicBrainz API
- `@aws-sdk/client-s3` - AWS S3/R2 storage

**State Management:**
- `zustand` - Client state
- `@tanstack/react-query` - Server state

**Utilities:**
- `zod` - Schema validation
- `date-fns` - Date utilities
- `bcryptjs` - Password hashing
- `pino` - Logging
- `dataloader` - GraphQL batching

## Configuration

**TypeScript:**
- Config: `tsconfig.json`
- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path alias: `@/*` -> `./src/*`

**Environment:**
- `.env` - Base config
- `.env.local` - Local overrides (not committed)
- `.env.example` - Template with all required vars
- `.env.test` - Test environment

**Build:**
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS
- `postcss.config.mjs` - PostCSS
- `codegen.yml` - GraphQL code generation

## Platform Requirements

**Development:**
- Node.js runtime
- PostgreSQL database
- Redis server (for BullMQ)
- pnpm package manager

**Production:**
- PostgreSQL with connection pooling (pgBouncer)
- Redis for job queue
- Cloudflare Images for image CDN
- Optional: Cloudflare R2 for file storage

## Scripts

**Development:**
- `pnpm dev` - Start dev server with Turbopack
- `pnpm codegen` - Generate GraphQL types
- `pnpm queue:dev` - Start BullMQ dashboard + worker

**Database:**
- `pnpm prisma migrate dev` - Create migration
- `pnpm prisma generate` - Generate client
- `pnpm db:seed` - Seed database
- `pnpm db:reset` - Reset and reseed

**Quality:**
- `pnpm check-all` - Type check + lint + format check
- `pnpm fix-all` - Auto-fix lint + format
- `pnpm test` - Run Playwright E2E tests
- `pnpm test:unit` - Run Vitest unit tests

---

*Stack analysis: 2026-01-23*
