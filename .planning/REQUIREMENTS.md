# Requirements: LlamaLog Entity Provenance & Audit System

**Defined:** 2026-02-09
**Core Value:** Answer the question: "How did this album get into the database, and what happened to it afterward?"

## v1.4 Requirements

Requirements for LlamaLog milestone. 🦙

### Schema — Rename & Category

- [ ] **SCHEMA-01**: Prisma model renamed from `EnrichmentLog` to `LlamaLog`
- [ ] **SCHEMA-02**: Database table renamed via migration preserving all data
- [ ] **SCHEMA-03**: New `LlamaLogCategory` enum with values: CREATED, ENRICHED, CORRECTED, CACHED, FAILED
- [ ] **SCHEMA-04**: New `category` field added to `LlamaLog` model (required)
- [ ] **SCHEMA-05**: Migration backfills existing records with appropriate categories

### Code — Rename References

- [ ] **CODE-01**: Logger class renamed from `EnrichmentLogger` to `LlamaLogger`
- [ ] **CODE-02**: Logger file moved to `src/lib/logging/llama-logger.ts`
- [ ] **CODE-03**: All `prisma.enrichmentLog` calls updated to `prisma.llamaLog`
- [ ] **CODE-04**: All type imports updated (`EnrichmentLog` → `LlamaLog`)
- [ ] **CODE-05**: GraphQL schema types updated
- [ ] **CODE-06**: Generated GraphQL types regenerated via codegen
- [ ] **CODE-07**: All resolver references updated

### Creation Tracking — Albums

- [ ] **CREATE-01**: Album creation from `addAlbum` mutation logged with category: CREATED
- [ ] **CREATE-02**: Album creation from `addAlbumToCollection` logged with category: CREATED
- [ ] **CREATE-03**: Album creation from Spotify sync logged with category: CREATED
- [ ] **CREATE-04**: Album creation from MusicBrainz sync logged with category: CREATED
- [ ] **CREATE-05**: Album creation from search/save flow logged with category: CREATED
- [ ] **CREATE-06**: Creation logs include userId when user-triggered
- [ ] **CREATE-07**: Creation logs have isRootJob: true

### Creation Tracking — Related Entities

- [ ] **RELATE-01**: Artist creation logged as child of album creation
- [ ] **RELATE-02**: Artist creation has parentJobId pointing to album's jobId
- [ ] **RELATE-03**: Track creation logged as child of album creation/enrichment
- [ ] **RELATE-04**: Track creation has parentJobId pointing to root job
- [ ] **RELATE-05**: Child creations have isRootJob: false

### Existing Logging — Category Updates

- [ ] **EXIST-01**: All enrichment operations use category: ENRICHED
- [ ] **EXIST-02**: All correction operations use category: CORRECTED
- [ ] **EXIST-03**: All cache operations use category: CACHED
- [ ] **EXIST-04**: All failed operations use category: FAILED

### UI & Branding

- [ ] **UI-01**: Console log output uses `[🦙 LlamaLog]` prefix
- [ ] **UI-02**: Admin log table shows llama emoji in header
- [ ] **UI-03**: Log detail view includes llama theming
- [ ] **UI-04**: Category badges incorporate llama where appropriate

### Query & Provenance

- [ ] **QUERY-01**: GraphQL query `llamaLogChain(entityType, entityId)` returns root + all children
- [ ] **QUERY-02**: Chain query returns logs ordered by createdAt
- [ ] **QUERY-03**: Chain query can filter by category

## Future Requirements

Deferred to later milestones.

### Extended Tracking

- **TRACK-01**: Track entity deletions
- **TRACK-02**: Track entity updates outside enrichment/correction
- **TRACK-03**: Tree view UI for job chain visualization

### Retroactive Provenance

- **RETRO-01**: Attempt to determine creation source for pre-existing albums
- **RETRO-02**: Mark albums with unknown provenance

## Out of Scope

| Feature | Reason |
|---------|--------|
| Retroactive provenance for existing albums | Too complex, data not available |
| Full visual tree UI for job chains | Simple list sufficient for v1.4 |
| Entity deletion tracking | Future enhancement |
| Updates outside enrichment/correction | Not needed yet |
| Custom llama ASCII art | Tempting, but no 🦙 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01 | 26 | Pending |
| SCHEMA-02 | 26 | Pending |
| SCHEMA-03 | 26 | Pending |
| SCHEMA-04 | 26 | Pending |
| SCHEMA-05 | 26 | Pending |
| CODE-01 | 27 | Pending |
| CODE-02 | 27 | Pending |
| CODE-03 | 27 | Pending |
| CODE-04 | 27 | Pending |
| CODE-05 | 27 | Pending |
| CODE-06 | 27 | Pending |
| CODE-07 | 27 | Pending |
| CREATE-01 | 28 | Pending |
| CREATE-02 | 28 | Pending |
| CREATE-03 | 28 | Pending |
| CREATE-04 | 28 | Pending |
| CREATE-05 | 28 | Pending |
| CREATE-06 | 28 | Pending |
| CREATE-07 | 28 | Pending |
| RELATE-01 | 29 | Pending |
| RELATE-02 | 29 | Pending |
| RELATE-03 | 29 | Pending |
| RELATE-04 | 29 | Pending |
| RELATE-05 | 29 | Pending |
| EXIST-01 | 30 | Pending |
| EXIST-02 | 30 | Pending |
| EXIST-03 | 30 | Pending |
| EXIST-04 | 30 | Pending |
| UI-01 | 31 | Pending |
| UI-02 | 31 | Pending |
| UI-03 | 31 | Pending |
| UI-04 | 31 | Pending |
| QUERY-01 | 32 | Pending |
| QUERY-02 | 32 | Pending |
| QUERY-03 | 32 | Pending |

**Coverage:**

- v1.4 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---

_Requirements defined: 2026-02-09_
_Last updated: 2026-02-09 after initial definition_
