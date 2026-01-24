# Concerns & Technical Debt

**Analysis Date:** 2026-01-23

## Known Data Quality Issues

### Trackless Albums

- **Issue**: Albums imported from Discogs couldn't be matched to MusicBrainz for track data
- **Impact**: Albums display with 0 tracks
- **Documentation**: `docs/trackless-albums.md`
- **Solution**: PRD exists for Admin Album Data Correction feature

### Artist Name Corruption

- **Issue**: Names with extraneous characters (e.g., "Mama Cass\*")
- **Impact**: Poor user experience, search issues
- **Solution**: Part of Admin Data Correction feature

### Missing External IDs

- **Issue**: Albums lacking MusicBrainz, Discogs, or Spotify IDs
- **Impact**: Can't enrich with external data
- **Solution**: Admin linking feature in PRD

## Database Concerns

### DB Cleanup Required

- **Documentation**: `docs/DB-cleanup-investigation.md`, `docs/DB-cleanup-plan.md`
- **Issues identified**:
  - Duplicate albums
  - Orphaned records
  - Inconsistent data quality scores
- **Scripts**: `src/scripts/db-cleanup/`

### Social Feed Duplicate Keys

- **Documentation**: `docs/social-feed-duplicate-keys-investigation.md`
- **Issue**: Duplicate key errors in feed generation
- **Status**: Under investigation

## Deprecated Code

### Search Components (DO NOT USE)

Files marked with `@deprecated`:

- `src/components/ui/SearchBar.tsx`
- `src/components/ui/AlbumSearch.tsx`
- `src/components/ui/AlbumSearchWrapper.tsx`
- `src/components/ui/SearchResultRenderer.tsx`
- `src/components/ui/SearchResults.tsx`

**Use instead**: `SimpleSearchBar`, `UniversalSearchBar`, `DualAlbumSearch`

### Discogs Integration

- Being phased out in favor of MusicBrainz
- Legacy mappers still in use: `src/lib/discogs/mappers.ts`

## Code Quality

### `any` Type Usage

- Policy: `any` is banned
- Reality: Some legacy code still uses it
- Action: Refactor when touching affected code

### Console Logs

- Some debug logs remain in production code
- Should be replaced with proper logger

### ESLint Disables

- Several `eslint-disable` comments in codebase
- Review and fix underlying issues

## Performance Concerns

### N+1 Queries

- DataLoaders implemented but not universally applied
- Some resolvers may have N+1 patterns

### Large Files

- Some components/files exceed recommended size
- Candidates for refactoring

### Image Loading

- External images not always optimized
- Cloudflare Images CDN helps but not used everywhere

## Security Considerations

### Environment Variables

- Secrets properly managed via `.env`
- `.env.example` documents all required vars
- No hardcoded credentials detected

### Authentication

- NextAuth beta version (5.0.0-beta)
- JWT-based sessions
- Proper CSRF protection

### API Security

- GraphQL rate limiting needed
- Admin endpoints require auth
- Input validation with Zod

## External API Dependencies

### Rate Limiting

- MusicBrainz: 1 req/sec (handled by BullMQ)
- Spotify: Rate limits respected
- Discogs: 60 req/min

### API Deprecations

- Spotify `browse.getNewReleases()` deprecated Nov 2024
- Migrated to Search API with `tag:new`

## Technical Debt Priorities

### High Priority

1. Trackless albums - blocking user experience
2. Data quality issues - affects content integrity
3. Deprecated search components - potential bugs

### Medium Priority

1. DB cleanup execution
2. N+1 query optimization
3. `any` type elimination

### Low Priority

1. Console log cleanup
2. ESLint disable cleanup
3. File size refactoring

## Monitoring Gaps

### Missing

- APM/performance monitoring
- Error tracking service (Sentry, etc.)
- Usage analytics

### Present

- Basic health checks
- Structured logging with Pino
- Correlation IDs for request tracing

---

_Concerns analysis: 2026-01-23_

Additional Technical Debt Details
