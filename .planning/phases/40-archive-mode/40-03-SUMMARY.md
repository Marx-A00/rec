---
phase: 40-archive-mode
plan: 03
subsystem: ui
tags: [calendar, react-day-picker, archive, routes, mobile, shadcn]
requires:
  - phase: 40-02
    provides: GraphQL hooks for session history and archive operations
provides:
  - shadcn Calendar UI component with react-day-picker
  - ArchiveCalendar component with color-coded play status
  - Desktop archive routes (/game/archive, /game/archive/[date])
  - Mobile archive routes (/m/game/archive, /m/game/archive/[date])
affects: [40-04]
tech-stack:
  added: [react-day-picker, shadcn/calendar]
  patterns: [calendar modifiers for status display, date-range session filtering, month-based navigation]
key-files:
  created: 
    - src/components/ui/calendar.tsx
    - src/components/uncover/ArchiveCalendar.tsx
    - src/app/(main)/game/archive/page.tsx
    - src/app/(main)/game/archive/[date]/page.tsx
    - src/app/m/game/archive/page.tsx
    - src/app/m/game/archive/[date]/page.tsx
  modified:
    - src/components/ui/button.tsx
    - package.json
    - pnpm-lock.yaml
key-decisions:
  - decision: Restore custom button variants after shadcn update
    rationale: shadcn calendar installation overwrote button.tsx, removing primary/success variants used throughout app
    impact: Preserved existing UI consistency
  - decision: Use react-day-picker modifiers for status visualization
    rationale: Built-in modifier system supports color-coding won/lost/missed dates
    impact: Clean, maintainable calendar status display
  - decision: Month-based query filtering
    rationale: Only fetch sessions for visible month to minimize data transfer
    impact: Efficient calendar loading, good performance
  - decision: Today redirects to main game, not archive
    rationale: Clicking today should show live daily challenge, not archived version
    impact: Intuitive user flow between live and archived games
patterns-established:
  - Calendar navigation with prev/next month controls
  - Disable dates outside valid range (before GAME_EPOCH, after today)
  - Color-coded status: green=won, red=lost, gray=missed, outlined=not played
  - Mobile-aware routing with mobile prop and /m/ prefix
  - Date validation pattern: GAME_EPOCH <= date < today (strictly before today)
duration: 4min
completed: 2026-02-17
---

# Phase 40 Plan 03: Archive Calendar Routes Summary

Calendar UI and navigation for accessing past daily challenges with visual play status.

**One-liner:** shadcn Calendar with month navigation, color-coded won/lost/missed status, and desktop/mobile archive routes

## What Was Built

**shadcn Calendar Component:**
- Installed via `pnpm dlx shadcn@latest add calendar`
- Adds react-day-picker 9.13.2 dependency
- Created `src/components/ui/calendar.tsx`
- Fixed: Restored custom button variants (primary, success, warning, danger) after shadcn overwrote button.tsx

**ArchiveCalendar Component:**
- Month-based calendar with prev/next navigation
- Queries `myUncoverSessions` with fromDate/toDate for visible month only
- Builds sessionMap from query results (date string → 'won' | 'lost')
- Color-coded modifiers:
  - Won: green background (emerald-500/20)
  - Lost: red background (red-500/20)
  - Missed: gray background (zinc-700/50)
  - Not Played: outlined (no session, playable)
  - Today: outlined in cosmic-latte
- Disables dates before GAME_EPOCH and after today
- Click handler:
  - Today → redirect to /game or /m/game (live challenge)
  - Past date → redirect to /game/archive/YYYY-MM-DD or /m/ equivalent
- Accepts mobile prop for routing awareness
- Legend showing status colors

**Desktop Routes:**
- `/game/archive` - Calendar page with centered container (max-w-lg)
- `/game/archive/[date]` - Archive game page with date validation
  - Validates ISO date format with parseISO
  - Validates range: GAME_EPOCH <= date < today (strictly before)
  - Returns 404 for invalid dates
  - Placeholder for game component (added in 40-04)

**Mobile Routes:**
- `/m/game/archive` - Calendar page with mobile layout (px-4 py-6)
- `/m/game/archive/[date]` - Archive game page with same validation
  - Mobile-friendly spacing and typography
  - Placeholder for game component (added in 40-04)

## Task Breakdown

**Task 1: Install shadcn Calendar component**
- Installed via shadcn CLI
- Added react-day-picker 9.13.2
- Created calendar.tsx component
- Fixed: Restored button variants after overwrite
- Commit: `0a5894c chore(40-03): install shadcn Calendar component`

**Task 2: Create ArchiveCalendar component**
- Built month-based calendar with navigation
- Integrated myUncoverSessions query with date filtering
- Implemented status color-coding via modifiers
- Added legend and today redirect logic
- Commit: `a453bb1 feat(40-03): create ArchiveCalendar component`

**Task 3: Create archive route pages (desktop and mobile)**
- Created 4 route files (2 desktop, 2 mobile)
- Date validation in archive game pages
- Next.js 15 params handling (params is Promise)
- Mobile prop for ArchiveCalendar
- Commit: `02aa6bf feat(40-03): create archive calendar routes (desktop and mobile)`
- Commit: `96b62f7 style(40-03): fix lint errors in archive routes`

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 3 - Blocking] Restore button variants after shadcn overwrite**
- **Found during:** Task 1
- **Issue:** shadcn calendar installation overwrote button.tsx, removing custom variants (primary, success, warning, danger, primary-outline, success-outline) used throughout the codebase
- **Fix:** Merged shadcn's new button structure with existing custom variants
- **Files modified:** src/components/ui/button.tsx
- **Commit:** 0a5894c
- **Rationale:** Without custom variants, type errors blocked compilation (Rule 3)

## Technical Highlights

**React-day-picker Integration:**
- Uses modifiers prop to define date categories (won, lost, missed, today)
- Uses modifiersClassNames to apply Tailwind styles per category
- Disabled dates via disabled prop function
- Month state management with onMonthChange

**Date Handling:**
- All dates normalized to UTC midnight via toUTCMidnight
- ISO string format for GraphQL query parameters (cast to Date type)
- date-fns for parsing, validation, and formatting
- GAME_EPOCH constant defines earliest valid date

**Query Optimization:**
- Only fetch sessions for visible month (startOfMonth to endOfMonth)
- Query enabled by default (always authenticated in archive routes)
- Session map built client-side for O(1) date lookups

**Mobile Architecture:**
- Mobile routes mirror desktop structure at /m/game/archive
- ArchiveCalendar accepts mobile prop for routing decisions
- Mobile pages use compact spacing (px-4 py-6 vs max-w-lg)

## Next Phase Readiness

**Completed Requirements:**
- ARCHIVE-01: Player can access past daily puzzles via calendar ✓
- ARCHIVE-02: Calendar shows which days were played/missed ✓

**Remaining in Phase 40:**
- ARCHIVE-03: Archive game shows past challenge (40-04)
- ARCHIVE-04: Archive stats tracked separately from daily (40-01 ✓, integration in 40-04)

**Blockers/Concerns:**
- None - Archive game component is straightforward, uses existing game infrastructure

**Handoff to 40-04:**
- Calendar routes created, placeholder pages ready
- ArchiveCalendar provides navigation to /game/archive/[date]
- Need to render UncoverGame component in archive mode
- Need to integrate archive stats submission after game completion
