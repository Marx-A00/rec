# Phase 5: GraphQL Integration - Context

**Gathered:** 2026-01-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Expose correction operations (search, preview, apply) via GraphQL API. Create schema types, resolvers, and generated hooks so React components can call the service layer. Does not include UI implementation — that's Phase 6+.

</domain>

<decisions>
## Implementation Decisions

### Error Handling

- Follow existing pattern: throw `GraphQLError` with error codes
- Use existing codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`
- No union types for errors — Apollo handles it, client gets `error` property

### Query vs Mutation

- `correctionSearch` — Query (read operation)
- `correctionPreview` — Query (fetches external data but doesn't modify DB)
- `correctionApply` — Mutation (modifies database)

### Input Structure

- Use input object pattern for complex operations: `correctionApply(input: CorrectionApplyInput!)`
- Matches existing patterns like `addAlbum(input: AlbumInput!)`

### Authorization

- Inline admin check in each resolver: `if (!isAdmin(user.role)) throw GraphQLError`
- Matches existing pattern in `deleteArtist`, `updateUserRole`, etc.
- No wrapper/middleware — explicit is better for 3 resolvers

### Naming Convention

- Domain-prefixed: `correctionSearch`, `correctionPreview`, `correctionApply`
- Groups operations together in schema
- Matches existing style: `albumRecommendations`, `artistDiscography`

### Claude's Discretion

- Exact type structure for search results, preview diffs, apply payloads
- Field naming within input/output types
- Whether to include convenience fields (e.g., formatted dates)

</decisions>

<specifics>
## Specific Ideas

- Thin resolvers — just validate auth, call service, return result
- Generated hooks via existing codegen setup (`pnpm codegen`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 05-graphql-integration_
_Context gathered: 2026-01-24_
