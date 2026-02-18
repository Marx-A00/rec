---
phase: 38
plan: 01
subsystem: game-ui
tags: [game, autocomplete, ui, desktop]
requires: [37-04]
provides:
  - Desktop game route at /game
  - Album search autocomplete with GraphQL
  - Visual attempt progress (dots)
  - Previous guesses display
tech-stack:
  added: []
  patterns:
    - "cmdk Command components for autocomplete"
    - "Debounced search (300ms)"
    - "Click-outside and keyboard handlers"
decisions:
  - id: GAME-UI-01
    what: Use cmdk Command components for autocomplete
    why: Already in project, provides accessible autocomplete with keyboard support
    impact: Consistent UI patterns, accessibility built-in
  - id: GAME-UI-02
    what: Debounce search input by 300ms
    why: Reduce unnecessary API calls while typing
    impact: Better UX and reduced server load
  - id: GAME-UI-03
    what: Auto-submit on album selection
    why: Streamline gameplay, no extra confirm step needed
    impact: Faster game flow, fewer clicks
key-files:
  created:
    - src/app/(main)/game/page.tsx
    - src/components/uncover/AlbumGuessInput.tsx
    - src/components/uncover/GuessList.tsx
    - src/components/uncover/AttemptDots.tsx
  modified:
    - src/components/uncover/UncoverGame.tsx
    - src/components/uncover/index.ts
metrics:
  tasks: 3
  commits: 3
  duration: 5 minutes
  completed: 2026-02-16
---

# Phase 38 Plan 01: Desktop Game Route with Autocomplete Summary

**One-liner:** Playable desktop game at /game with autocomplete album search using searchAlbums GraphQL query

## What Was Built

Created the desktop game route with all core gameplay UI:

**Task 1 - Game route and supporting components:**
- Desktop route at `/game` renders UncoverGame
- AttemptDots component shows 6 dots (filled = used attempts)
- GuessList component displays previous guesses with album + artist
- All components properly typed and exported

**Task 2 - AlbumGuessInput autocomplete:**
- Autocomplete dropdown using cmdk Command components
- Debounced search (300ms) queries local database via searchAlbumsQuery
- Shows 5 results max with album title + artist name
- Auto-submits on selection (no confirm step)
- Skip button below input with loading state
- Keyboard support (Escape closes dropdown)
- Click-outside to close dropdown
- Double-submission guard (disabled during isSubmitting)

**Task 3 - Integration into UncoverGame:**
- Restructured game board layout (Wordle-style vertical flow)
- Large centered album image (dominant visual element)
- AttemptDots below image for progress
- AlbumGuessInput for guessing
- GuessList below for previous guesses
- Removed placeholder text
- Full playable game loop

## Key Implementation Details

**Autocomplete behavior:**
- Search triggers at 2+ characters
- Results limited to 5 albums
- Each result shows: album title (bold) + artist name (gray)
- Selection immediately calls onGuess(albumId, title, artistName)
- Input clears after submission

**Layout structure (game board):**
```
[Header text]
[Reveal image - large square]
[Attempt dots - 6 circles]
[Search input + dropdown]
[Skip button]
[Previous guesses list]
[Error display if any]
```

**GraphQL integration:**
- Uses generated `useSearchAlbumsQuery` hook
- Variables: `{ query: inputValue, limit: 5 }`
- Enabled only when `inputValue.length >= 2`
- Artist name extracted from `album.artists[0].artist.name`

## Deviations from Plan

None - plan executed exactly as written.

## Testing Performed

**Type-check:** Passed
**Lint:** Passed (only pre-existing warnings in other files)

**Manual testing required:**
1. Navigate to /game while logged in
2. See obscured album image
3. Type in search field
4. Verify dropdown shows with results
5. Select album
6. Verify guess submits and appears in list
7. Verify dot fills in
8. Click Skip
9. Continue until game over

## Dependencies

**Builds on:**
- Phase 37-04: useUncoverGame hook with submitGuess/skipGuess
- Phase 37: Game state management (Zustand store)
- Phase 36: RevealImage component
- Phase 35: Daily challenge system

**Required for:**
- Phase 38-02: Mobile game route
- Phase 39: Game stats display
- Phase 40: Game archive access

## Next Phase Readiness

**Ready for Phase 38-02 (Mobile game route):**
- Desktop route working, can replicate structure for mobile
- All components reusable (AlbumGuessInput, GuessList, AttemptDots)
- Game hook already mobile-ready

**Blockers:** None

**Concerns:** None

## Files Changed

**Created (4 files):**
- `src/app/(main)/game/page.tsx` - Desktop game route
- `src/components/uncover/AlbumGuessInput.tsx` - Autocomplete search (148 lines)
- `src/components/uncover/GuessList.tsx` - Previous guesses display (60 lines)
- `src/components/uncover/AttemptDots.tsx` - Visual progress (29 lines)

**Modified (2 files):**
- `src/components/uncover/UncoverGame.tsx` - Integrated new components, restructured layout
- `src/components/uncover/index.ts` - Added exports for new components

## Commits

- `e4f1e27` - feat(38-01): create game route and supporting UI components
- `b3bd981` - feat(38-01): create AlbumGuessInput autocomplete component
- `3e518ee` - feat(38-01): integrate game components into UncoverGame
