# Project Research Summary

**Project:** Admin Data Correction UI
**Domain:** Admin metadata correction tools for music applications
**Researched:** 2026-01-23
**Confidence:** HIGH

## Executive Summary

This research covers building an admin data correction feature for a music database that allows administrators to fix problematic albums and artists by searching MusicBrainz, previewing data side-by-side, and applying selective corrections. The project already has excellent foundations — fuzzysort for fuzzy matching, Radix UI for modals, Zod for validation, BullMQ for rate-limited API calls, and an existing preview enrichment system that can be extended. The main gap is form handling for selective field updates, which React Hook Form fills perfectly.

The recommended approach follows a "search, preview, apply" workflow that mirrors established patterns from MusicBrainz Picard and professional data enrichment tools. The architecture should extend the existing enrichment preview system rather than building a parallel system, reusing the `PreviewEnrichmentResult` type, `EnrichmentFieldDiff` for field comparison, and the `EnrichmentLog` model for audit trails. All MusicBrainz API calls must continue going through the existing `QueuedMusicBrainzService` to respect rate limits.

The primary risks are MusicBrainz ID instability (IDs redirect after community merges), orphaned related records when corrections don't update the full entity graph, and no rollback path after applying corrections. These risks are mitigated through MBID verification on every API response, atomic transactions that update all related tables (Album, AlbumArtist, Track), and comprehensive audit logging that captures before-state for potential recovery.

## Key Findings

### Recommended Stack

Most required functionality exists in the current codebase. Only two new dependencies are needed: react-hook-form for managing selective field updates with minimal re-renders, and @hookform/resolvers to integrate with the existing Zod validation.

**Core technologies:**

- **react-hook-form ^7.71.1:** Selective field updates, form state management — isolated re-renders critical for forms with many selectable fields
- **@hookform/resolvers ^3.9.1:** Zod resolver for RHF — bridges existing Zod validation with form handling
- **fuzzysort ^3.1.0 (existing):** Fuzzy matching for search results — already installed, perfect for title matching
- **allotment ^1.20.4 (existing):** Resizable split panels — already used in SplitMosaic.tsx, provides VS Code-style comparison view
- **@radix-ui/react-dialog (existing):** Modal dialogs — foundation for correction workflow UI
- **vaul (existing):** Bottom sheets for mobile — enables mobile admin experience

**Avoid adding:**

- react-diff-viewer-continued: React 19 compatibility issues
- Formik: Poor performance for selective field forms
- New modal/drawer libraries: Project already has Dialog and vaul

### Expected Features

**Must have (table stakes):**

- Search MusicBrainz by query with match scores displayed
- Side-by-side preview comparison with changed fields highlighted
- Field selection checkboxes before apply (granular control)
- Confirmation step with summary of changes
- Atomic database updates via Prisma transactions
- Correction logging for audit trail
- Manual field editing mode for quick typo fixes

**Should have (competitive):**

- Re-enrichment trigger after correction
- Artist correction workflow (parallel to album)
- External ID validation (UUID format check)
- Keyboard shortcuts for power users
- Recent corrections quick-access

**Defer (v2+):**

- Bulk correction queue — each album needs human verification
- Multi-source merging (Discogs + MusicBrainz) — conflict resolution is complex
- Auto-suggestion without user action — false positives damage trust
- User-submitted corrections — requires moderation queue

### Architecture Approach

The correction feature integrates as an extension of the existing enrichment system rather than a parallel path. It uses the same GraphQL API layer, same queue service for rate limiting, and same logging infrastructure. The new `CorrectionService` orchestrates the search/preview/apply workflow, delegates to existing `QueuedMusicBrainzService` for API calls, and extends the `previewAlbumEnrichment` pattern for generating diffs.

**Major components:**

1. **CorrectionService** (`/src/lib/correction/correction-service.ts`) — orchestrates search, preview, and apply workflow
2. **CorrectionPreview** (`/src/lib/correction/correction-preview.ts`) — generates field-by-field diff, extends existing preview-enrichment pattern
3. **ApplyCorrection** (`/src/lib/correction/apply-correction.ts`) — atomic database updates with transaction, creates audit log
4. **Correction Resolvers** (`/src/lib/graphql/resolvers/correction-resolvers.ts`) — thin GraphQL resolvers delegating to service layer
5. **CorrectionSearchModal** (`/src/components/admin/`) — UI for search and preview, extends EnrichmentPreviewResults

**Key pattern:** Reuse the existing `PreviewEnrichmentResult` type which already contains `fieldsToUpdate: EnrichmentFieldDiff[]`, `matchScore`, and `rawData`. No need for new preview types.

### Critical Pitfalls

1. **MusicBrainz ID Instability** — MBIDs redirect after community merges. Always compare returned MBID against requested MBID after every API call. Build verification into the core search flow from Phase 1.

2. **Wrong Prisma Client in Transactions** — Using global `prisma` instead of `tx` parameter inside `$transaction` causes connection leaks. Establish convention: always use `tx` exclusively inside callbacks, never `prisma`.

3. **Rate Limit Bursts from Admin Sessions** — Admin search sessions can queue dozens of jobs. Implement job priority levels (admin HIGH, background LOW), add UI debouncing (300ms), show queue position to admin.

4. **Orphaned Related Records** — Correcting album without updating AlbumArtist and Track tables creates data inconsistency. Define correction as complete entity replacement in a single transaction.

5. **No Rollback Path** — Without audit logging, bad corrections cannot be undone. Store complete before-state in `EnrichmentLog` with `operation: 'MANUAL_CORRECTION'` before any apply action.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation and Queue Infrastructure

**Rationale:** Queue priority and MBID verification must exist before any UI work. These are foundational patterns that everything else depends on.
**Delivers:** Queue priority system for admin requests, MBID verification utility, job idempotency via explicit jobIds
**Addresses:** Search MusicBrainz by query, search result match scores
**Avoids:** Rate limit bursts, MBID instability

### Phase 2: Service Layer and Correction Logic

**Rationale:** Business logic must be complete before UI can be built. Transaction patterns and entity replacement logic are complex and need isolation.
**Delivers:** CorrectionService, CorrectionPreview, ApplyCorrection with atomic transactions, audit logging
**Uses:** react-hook-form, @hookform/resolvers, existing QueuedMusicBrainzService
**Implements:** Complete entity replacement (Album + AlbumArtist + Track in one transaction)
**Avoids:** Orphaned records, wrong Prisma client in transactions

### Phase 3: GraphQL Integration

**Rationale:** GraphQL schema and resolvers depend on service layer being complete. Codegen needs final types.
**Delivers:** New GraphQL types (MusicBrainzSearchResult, ApplyCorrectionInput), mutations (searchMusicBrainzForCorrection, previewCorrection, applyCorrection)
**Uses:** Generated hooks from codegen
**Implements:** Thin resolvers delegating to CorrectionService

### Phase 4: UI and Preview Components

**Rationale:** UI is the final layer, depends on all backend work being complete. Uses generated GraphQL hooks.
**Delivers:** CorrectionSearchModal, side-by-side comparison panel, field selection UI, confirmation dialog
**Addresses:** Side-by-side preview, field highlighting, field selection, confirmation step, manual field editing
**Avoids:** Incomplete comparison UI (must show ALL fields that will change)

### Phase 5: Polish and Recovery

**Rationale:** Rollback and recovery features can be added once core workflow is proven. Lower priority than MVP functionality.
**Delivers:** Revert functionality from audit log, recent corrections view, keyboard shortcuts
**Addresses:** Re-enrichment trigger, error feedback with specifics

### Phase Ordering Rationale

- **Foundation first:** Queue priority and MBID verification are required by every subsequent phase. Building these first prevents rework.
- **Service before UI:** The existing codebase follows thin-resolver pattern — all business logic in services. UI depends on generated hooks which depend on GraphQL which depends on services.
- **Transaction patterns before mutations:** Establishing `tx` convention in Phase 2 prevents connection leak bugs that are hard to debug later.
- **Audit logging before apply UI:** Recovery depends on before-state being captured. Building audit logging in Phase 2 ensures it exists when Phase 4 implements apply.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 4 (UI):** Mobile comparison layout patterns — how to stack side-by-side on narrow screens. The app has mobile routes at /m/ that need accommodation.

Phases with standard patterns (skip research-phase):

- **Phase 1:** Queue priority is standard BullMQ pattern, well-documented
- **Phase 2:** Prisma transactions are well-documented, existing codebase has examples
- **Phase 3:** GraphQL patterns established in codebase, follow existing resolver patterns
- **Phase 5:** Standard CRUD patterns for viewing/reverting from audit log

## Confidence Assessment

| Area         | Confidence | Notes                                                                               |
| ------------ | ---------- | ----------------------------------------------------------------------------------- |
| Stack        | HIGH       | Verified via GitHub releases, React 19 compatibility confirmed, only 2 new deps     |
| Features     | HIGH       | Based on MusicBrainz Picard patterns, admin UX literature, competitor analysis      |
| Architecture | HIGH       | Extends existing codebase patterns, minimal new infrastructure                      |
| Pitfalls     | HIGH       | Verified via MusicBrainz official docs, real-world MBID issue articles, Prisma docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Mobile admin experience:** Research covered mobile routes exist (/m/) but didn't deeply explore mobile-specific comparison UI patterns. Address during Phase 4 implementation.
- **Multi-admin scenarios:** Research focused on single-admin usage. If multiple admins use correction feature simultaneously, queue contention may need per-user throttling (BullMQ Pro groups).
- **Large album catalogs:** Performance at scale (100k+ albums) needs validation during implementation. Existing indexes on musicbrainzId should help, but monitoring needed.

## Sources

### Primary (HIGH confidence)

- [MusicBrainz API Documentation](https://musicbrainz.org/doc/MusicBrainz_API) — rate limiting, User-Agent requirements
- [MusicBrainz Picard Quick Start](https://picard.musicbrainz.org/quick-start/) — workflow patterns, preview interface
- [React Hook Form GitHub Releases](https://github.com/react-hook-form/react-hook-form/releases) — v7.71.1 Jan 2025, React 19 compatible
- [Prisma Transaction Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — transaction patterns
- [BullMQ Rate Limiting Documentation](https://docs.bullmq.io/guide/rate-limiting) — queue configuration
- Existing codebase analysis — `/src/lib/musicbrainz/`, `/src/lib/enrichment/`, `/prisma/schema.prisma`

### Secondary (MEDIUM confidence)

- [LogRocket RHF vs React 19](https://blog.logrocket.com/react-hook-form-vs-react-19/) — form handling comparison Apr 2025
- [MusicBrainz ID Instability Article](https://eve.gd/2025/10/09/using-a-public-api-or-the-instability-of-musicbrainz-ids/) — real-world MBID issues
- [NN/g Comparison Tables](https://www.nngroup.com/articles/comparison-tables/) — side-by-side UX principles
- [Basis Design System Bulk Editing](https://design.basis.com/patterns/bulk-editing) — admin UX patterns

### Tertiary (LOW confidence)

- [react-diff-viewer-continued React 19 Issue](https://github.com/Aeolun/react-diff-viewer-continued/issues/63) — compatibility issue, may be resolved by implementation time

---

_Research completed: 2026-01-23_
_Ready for roadmap: yes_
