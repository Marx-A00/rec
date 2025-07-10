# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **music recommendation web application** built with Next.js 15 and React 19. Users can discover albums, create personal collections, and share album-to-album recommendations with similarity scores. The app integrates with the Discogs API for music data and supports social features like following other users.

## Essential Commands

### Development
```bash
pnpm dev                    # Start development server with Turbopack
pnpm build                  # Build for production
pnpm build:production       # Build with Prisma generation
pnpm start                  # Start production server
pnpm start:production       # Start with database migrations
```

### Code Quality
```bash
pnpm lint                   # Run ESLint
pnpm lint:fix              # Fix ESLint issues
pnpm format                # Format code with Prettier
pnpm format:check          # Check formatting
pnpm type-check            # Run TypeScript compiler
pnpm check-all             # Run all checks (type-check, lint, format)
pnpm fix-all               # Fix linting and formatting
pnpm validate              # Full validation (checks + build)
```

### Database
```bash
pnpm db:seed               # Seed database with sample data
pnpm db:reset              # Reset database and reseed
prisma db push             # Push schema changes to database
prisma generate            # Generate Prisma client
prisma studio              # Open Prisma Studio
```

### Testing
```bash
pnpm test                  # Run Playwright tests
pnpm test:ui               # Run tests in interactive mode
pnpm test:debug            # Debug tests with DevTools
pnpm test:report           # View test reports
pnpm test:setup            # Initialize test environment
pnpm test:migrate          # Apply migrations to test database
pnpm test:reset            # Reset test database
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM, PostgreSQL
- **Authentication**: NextAuth.js with Google/Spotify OAuth + email/password
- **External APIs**: Discogs API for music data
- **UI Components**: Radix UI primitives, custom components
- **Testing**: Playwright for E2E testing

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (main)/            # Main application routes
│   │   ├── albums/        # Album detail pages
│   │   ├── artists/       # Artist detail pages
│   │   ├── browse/        # Browse/discovery pages
│   │   ├── collections/   # User collections
│   │   ├── profile/       # User profiles
│   │   └── recommend/     # Recommendation creation
│   ├── api/               # API endpoints
│   │   ├── albums/        # Album-related endpoints
│   │   ├── artists/       # Artist endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── collections/   # Collection management
│   │   ├── recommendations/ # Recommendation CRUD
│   │   └── users/         # User management
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── auth/             # Authentication components
│   ├── recommendations/  # Recommendation features
│   ├── collections/      # Collection management
│   ├── profile/          # User profile components
│   └── providers/        # Context providers
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── types/                # TypeScript definitions
└── contexts/             # React contexts
```

### Key Features
- **User Authentication**: Multi-provider auth with NextAuth.js
- **Album Discovery**: Discogs API integration for album search
- **Collections**: Personal album libraries with ratings and notes
- **Recommendations**: Album-to-album recommendations with similarity scores
- **Social Features**: User following, activity feeds, profile management
- **Keyboard Navigation**: Comprehensive keyboard shortcuts for accessibility

## Development Guidelines

### Code Conventions
- Use TypeScript for all new code
- Follow existing component patterns in `/components/ui/`
- Use Tailwind CSS for styling with custom color palette
- Implement proper error handling and loading states
- Use TanStack Query for data fetching and caching

### File Path Comments
Always include file path comments at the top of code examples:
```typescript
// src/app/browse/page.tsx
export default function BrowsePage() {
  return <div>Browse content</div>;
}
```

### Data Fetching Patterns
- Use React Query (useQuery) for data fetching
- Fetch data at page/layout level, pass minimal props to children
- Use separate components for independent data fetching (tabs, modals)
- Always configure: `queryKey`, `queryFn`, `enabled`, `staleTime`, `gcTime`, `retry`

```typescript
// src/components/artist/DiscographyTab.tsx
const {
  data: releasesData,
  isLoading,
  error,
  isError
} = useQuery({
  queryKey: ['artist-releases', artistId],
  queryFn: () => fetchArtistReleases(artistId),
  enabled: !!artistId,
  staleTime: 5 * 60 * 1000,
  gcTime: 10 * 60 * 1000,
  retry: 2,
  refetchOnWindowFocus: false
});
```

### API Development
- API routes are in `/src/app/api/`
- Use proper HTTP status codes and error responses
- Implement authentication checks where needed
- Follow RESTful conventions for endpoints

### Component Development
- Use Radix UI primitives for accessibility
- Follow the established component structure in `/components/ui/`
- Implement proper TypeScript interfaces
- Use the custom design system colors and spacing

### Authentication
- NextAuth.js configuration is in `/src/app/api/auth/[...nextauth]/route.ts`
- Supports Google OAuth, Spotify OAuth, and email/password
- User sessions are managed automatically
- Protected routes should check authentication status

### Database Operations
- Use Prisma Client for all database operations
- Follow the existing patterns for queries and mutations
- Use proper indexing for performance
- Cache display data to minimize API calls

## Database Schema

### Core Models
- **User**: Authentication, profiles, social stats
- **Recommendation**: Album-to-album recommendations with cached display data
- **Collection**: User-created album collections
- **CollectionAlbum**: Albums within collections with personal ratings/notes
- **UserFollow**: Social following relationships
- **Account/Session**: NextAuth.js authentication tables

### Important Fields
- Albums are referenced by `albumDiscogsId` (Discogs API ID)
- Display data (title, artist, image, year) is cached to avoid API calls
- Social stats (followers, following, recommendations counts) are denormalized
- Collections can be public or private

## Testing Strategy

### E2E Testing with Playwright
- Tests are in `/tests/` directory
- Uses separate test database (configure in `.env.test`)
- Tests cover authentication flows, core features, and user interactions
- Run `pnpm test:setup` before first test run

### Test Database
- Always use a separate test database
- Configure `DATABASE_URL` in `.env.test`
- Use `pnpm test:reset` to clean test data between runs

## Security Considerations

### Content Security Policy
- Strict CSP configured for API routes in `next.config.ts`
- Security headers applied to all API endpoints
- Image loading restricted to trusted domains (Discogs, Google, Spotify)

### Authentication Security
- Password hashing with bcryptjs
- Secure session management with NextAuth.js
- Protected API routes with authentication checks

### Input Validation
- Use Zod for schema validation
- Sanitize user inputs
- Validate external API responses

## External Integrations

### Discogs API
- Primary source for album data
- Use `disconnect` library for API calls
- Cache album data in database to reduce API calls
- Handle rate limiting and errors gracefully

### OAuth Providers
- Google: Profile and email access
- Spotify: Profile and email access
- Configure client IDs/secrets in environment variables

## Performance Optimization

### Caching Strategy
- Use TanStack Query for client-side caching
- Cache album display data in database
- Implement proper cache invalidation

### Database Optimization
- Use database indexes for common queries
- Denormalize social statistics for performance
- Optimize collection queries with proper indexing

### Image Optimization
- Use Next.js Image component for album covers
- Configure remote patterns for trusted domains
- Implement proper loading states

## TypeScript and Prisma

### TypeScript Server Issues
After Prisma schema changes, if TypeScript shows old type definitions:
1. Run `prisma generate`
2. Restart TypeScript server: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
3. If needed, reload window: `Cmd+Shift+P` → "Developer: Reload Window"

### Type Organization
- Group types by domain in `/src/types/`
- Use consistent API response wrapper types
- Handle API inconsistencies in type definitions

## Task Management with Taskmaster

This project uses Taskmaster for task-driven development. Key commands:

### Basic Workflow
```bash
task-master list            # Show all tasks
task-master next           # Get next available task
task-master show <id>      # View task details
task-master expand <id>    # Break task into subtasks
task-master set-status --id=<id> --status=done  # Mark complete
```

### Advanced Features
```bash
task-master analyze-complexity --research  # Analyze task complexity
task-master parse-prd <file>              # Generate tasks from PRD
task-master update-subtask --id=<id> --prompt="notes"  # Log progress
```

### Tagged Task Lists
Use tags for feature branches, experiments, or team collaboration:
```bash
task-master add-tag feature-xyz
task-master use-tag feature-xyz
task-master list --tag feature-xyz
```

## Environment Variables

### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: NextAuth.js secret
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Google OAuth
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`: Spotify OAuth

### Test Environment
- Configure separate `.env.test` file
- Use different database for testing
- Same OAuth credentials can be used for testing

## Common Tasks

### Adding New Features
1. Create database migrations if needed
2. Add API routes following existing patterns
3. Implement frontend components using design system
4. Add proper TypeScript types
5. Write E2E tests for new functionality

### Modifying Authentication
- Update NextAuth.js configuration
- Modify user schema if needed
- Update authentication flows
- Test with all providers

### Database Schema Changes
1. Modify `prisma/schema.prisma`
2. Run `prisma db push` for development
3. Generate new Prisma client
4. Update TypeScript types
5. Test with both development and test databases

## Best Practices

### Code Quality
- Always run `pnpm validate` before committing
- Use proper error handling and loading states
- Follow existing patterns for consistency
- Include proper TypeScript types

### Security
- Never expose sensitive information in code or commits
- Use environment variables for API keys
- Implement proper input validation
- Follow secure authentication patterns

### Performance
- Use appropriate caching strategies
- Optimize database queries with proper indexing
- Handle API rate limiting gracefully
- Use Next.js Image component for optimization

### Testing
- Write E2E tests for new functionality
- Use separate test database
- Test authentication flows thoroughly
- Verify error handling and edge cases