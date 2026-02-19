---
phase: 34
plan: 03
subsystem: admin-ui
requires: ["34-01", "34-02"]
provides: ["game-pool-ui", "admin-curation-interface"]
affects: ["34-04", "34-05"]
tags: ["admin", "ui", "graphql", "react", "game-pool"]
tech-stack:
  added: []
  patterns: ["admin-page-pattern", "tabbed-interface", "inline-editing", "query-invalidation"]
key-files:
  created:
    - src/app/admin/game-pool/page.tsx
    - src/components/admin/game-pool/GamePoolStats.tsx
    - src/components/admin/game-pool/EligibleAlbumsTable.tsx
    - src/components/admin/game-pool/SuggestedAlbumsTable.tsx
    - src/components/admin/game-pool/StatusBadge.tsx
  modified:
    - src/app/admin/layout.tsx
    - src/graphql/queries/gamePool.graphql
    - src/generated/graphql.ts
    - src/generated/resolvers-types.ts
decisions: []
metrics:
  tasks: 3
  commits: 3
  duration: "4 minutes"
  completed: 2026-02-15
---

# Phase 34 Plan 03: Album Curation UI Summary

Admin interface for managing game album pool with stats, tables, and inline status editing.

## What Was Built

Created a complete admin UI for the Game Pool at /admin/game-pool with:

**Stats Dashboard:**
- Four stat cards showing eligible, excluded, neutral, and total-with-cover-art counts
- Real-time data from GraphQL queries
- Color-coded icons (green for eligible, red for excluded, zinc for neutral, blue for with-cover-art)

**Eligible Albums Tab:**
- Table displaying all ELIGIBLE albums with cover art, title, artist, year
- Inline status dropdown for changing status (ELIGIBLE/EXCLUDED/NONE)
- Toast notifications on success/error
- Automatic query invalidation after mutations

**Suggested Albums Tab:**
- Table displaying albums with NONE status that have cover art
- Green "Approve" and red "Exclude" action buttons
- One-click approval/exclusion workflow
- Toast notifications and query invalidation

**Components Created:**
1. StatusBadge.tsx - Three-state badge component with color coding
2. GamePoolStats.tsx - Stats cards using existing Card UI components
3. EligibleAlbumsTable.tsx - Table with inline Select dropdown
4. SuggestedAlbumsTable.tsx - Table with action buttons
5. page.tsx - Main Game Pool admin page with tabs

**Navigation:**
- Added "Game Pool" link to admin sidebar
- Properly integrated with existing admin layout

## Key Implementation Details

**GraphQL Integration:**
- Updated gamePool.graphql to include coverArtUrl field
- Regenerated hooks with pnpm codegen
- Used generated hooks: useGamePoolStatsQuery, useAlbumsByGameStatusQuery, useSuggestedGameAlbumsQuery, useUpdateAlbumGameStatusMutation

**UI Patterns:**
- Matched existing admin page styling exactly (zinc palette, dark theme)
- Used shadcn components: Card, Table, Tabs, Select, Badge, Button
- AlbumImage component with cloudflareImageId support for optimized images
- Proper loading states and empty states

**Data Flow:**
- Query invalidation strategy: invalidate related queries after mutations
- Toast feedback for user actions
- Optimistic UI through React Query

## Testing Notes

All TypeScript compilation passes. Manual testing required for:
- Stats cards display correct counts
- Eligible albums table shows inline dropdown
- Status changes work and update UI
- Suggested albums table shows approve/exclude buttons
- Actions trigger mutations and refresh data
- Toast notifications appear
- Navigation link works in admin sidebar

## Deviations from Plan

None - plan executed exactly as written.

## Dependencies

**Built on:**
- 34-01: GraphQL schema and resolvers
- 34-02: Game pool queries (extended in this plan)

**Enables:**
- 34-04: Pool query service (will consume this UI's data flow patterns)
- 34-05: Integration testing (will test this UI)

## Next Steps

1. Manual testing of Game Pool page in browser
2. Verify stats load correctly
3. Test status changes work end-to-end
4. Test approve/exclude actions
5. Proceed to 34-04: Pool Query Service

## Files Modified

**Created:**
- src/app/admin/game-pool/page.tsx - Main Game Pool admin page
- src/components/admin/game-pool/GamePoolStats.tsx - Stats cards component
- src/components/admin/game-pool/EligibleAlbumsTable.tsx - Eligible albums table
- src/components/admin/game-pool/SuggestedAlbumsTable.tsx - Suggested albums table
- src/components/admin/game-pool/StatusBadge.tsx - Status badge component

**Modified:**
- src/app/admin/layout.tsx - Added Game Pool navigation link
- src/graphql/queries/gamePool.graphql - Added coverArtUrl field
- src/generated/graphql.ts - Regenerated types and hooks
- src/generated/resolvers-types.ts - Regenerated resolver types

## Commits

- 0300338: feat(34-03): add coverArtUrl to game pool queries
- 743bb86: feat(34-03): create game pool management components
- 98724c4: feat(34-03): create Game Pool admin page
