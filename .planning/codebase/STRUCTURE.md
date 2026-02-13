# Directory Structure

**Analysis Date:** 2026-01-23

## Root Layout

```
rec/
├── src/                    # Application source code
├── prisma/                 # Database schema and migrations
├── tests/                  # Test files
├── docs/                   # Documentation
├── public/                 # Static assets
├── .planning/              # GSD planning docs
├── .taskmaster/            # Task Master files
└── .claude/                # Claude Code config
```

## Source Directory (`src/`)

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # Desktop authenticated routes
│   │   ├── layout.tsx     # Desktop layout with sidebar
│   │   ├── page.tsx       # Home/feed page
│   │   ├── albums/        # Album pages
│   │   ├── artists/       # Artist pages
│   │   ├── profile/       # Profile pages
│   │   ├── search/        # Search page
│   │   └── settings/      # Settings pages
│   ├── m/                 # Mobile routes
│   │   ├── layout.tsx     # Mobile layout
│   │   ├── page.tsx       # Mobile home
│   │   ├── albums/        # Mobile album detail
│   │   ├── artists/       # Mobile artist detail
│   │   ├── profile/       # Mobile profile
│   │   └── settings/      # Mobile settings
│   ├── api/               # API routes
│   │   ├── graphql/       # GraphQL endpoint
│   │   ├── auth/          # NextAuth routes
│   │   ├── albums/        # Album REST endpoints
│   │   ├── artists/       # Artist REST endpoints
│   │   └── admin/         # Admin endpoints
│   ├── auth/              # Auth pages (login, signup)
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
│
├── components/            # React components
│   ├── ui/               # Reusable UI primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── mobile/           # Mobile-specific components
│   │   ├── MobileHeader.tsx
│   │   ├── MobileButton.tsx
│   │   └── ...
│   ├── recommendations/  # Recommendation components
│   ├── albums/           # Album components
│   ├── artists/          # Artist components
│   ├── collections/      # Collection components
│   ├── providers/        # React context providers
│   └── ErrorBoundary.tsx # Error boundary
│
├── generated/            # Generated code (DO NOT EDIT)
│   └── graphql.ts       # GraphQL types and hooks
│
├── graphql/             # GraphQL definitions
│   ├── schema.graphql   # Server schema
│   └── queries/         # Client queries/mutations
│       ├── albums.graphql
│       ├── artists.graphql
│       ├── recommendations.graphql
│       └── ...
│
├── hooks/               # Custom React hooks
│   ├── useAlbumDetailsQuery.ts
│   ├── useRequireAuth.ts
│   └── ...
│
├── lib/                 # Core business logic
│   ├── graphql/        # GraphQL server
│   │   ├── resolvers/  # Query/mutation resolvers
│   │   ├── dataloaders/# DataLoader instances
│   │   ├── context.ts  # GraphQL context
│   │   └── errors.ts   # Error handling
│   ├── musicbrainz/    # MusicBrainz integration
│   │   ├── musicbrainz-service.ts
│   │   ├── queue-service.ts
│   │   └── mappers.ts
│   ├── spotify/        # Spotify integration
│   │   ├── scheduler.ts
│   │   └── search.ts
│   ├── queue/          # BullMQ queue
│   │   ├── config.ts
│   │   ├── redis.ts
│   │   └── processors/
│   ├── api/            # Internal API utilities
│   ├── search/         # Search orchestration
│   ├── prisma.ts       # Prisma client singleton
│   ├── cloudflare-images.ts
│   ├── logger.ts
│   ├── utils.ts
│   └── validations.ts
│
├── types/              # TypeScript type definitions
│   └── ...
│
└── workers/            # Background workers
    └── queue-worker.ts # BullMQ worker
```

## Key Locations

### Adding a New Feature

**GraphQL endpoint:**

1. Schema: `src/graphql/schema.graphql`
2. Resolver: `src/lib/graphql/resolvers/queries.ts` or `mutations.ts`
3. Client query: `src/graphql/queries/[feature].graphql`
4. Run `pnpm codegen`

**New page:**

- Desktop: `src/app/(main)/[route]/page.tsx`
- Mobile: `src/app/m/[route]/page.tsx`

**New component:**

- UI primitive: `src/components/ui/`
- Feature component: `src/components/[feature]/`
- Mobile component: `src/components/mobile/`

### Database Changes

1. Schema: `prisma/schema.prisma`
2. Migrate: `pnpm prisma migrate dev --name <name>`
3. Generate: `pnpm prisma generate`

### Testing

- E2E tests: `tests/e2e/`
- Integration tests: `tests/integration/`
- Unit tests: `tests/unit/`
- Test utilities: `tests/setup.ts`, `tests/global-setup.ts`

## Naming Conventions

### Files

- Components: PascalCase (`AlbumCard.tsx`)
- Hooks: camelCase with `use` prefix (`useAlbumDetails.ts`)
- Utils: camelCase (`formatDate.ts`)
- GraphQL: kebab-case (`album-queries.graphql`)

### Exports

- Components: Named exports
- Hooks: Named exports
- Utils: Named exports
- Types: Named exports

### Routes

- Desktop routes in `(main)` group
- Mobile routes in `m/` folder
- API routes in `api/` folder

---

_Structure analysis: 2026-01-23_
