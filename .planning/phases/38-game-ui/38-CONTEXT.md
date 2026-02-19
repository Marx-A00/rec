# Phase 38: Game UI - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete game interface for desktop and mobile. Includes album search autocomplete for guesses, responsive layouts (desktop + dedicated mobile route), auth gate for unauthenticated visitors, loading states, and keyboard support. Stats display (Phase 39), archive access (Phase 40), and post-game discovery links (Phase 41) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Search & autocomplete
- Inline autocomplete dropdown below the guess input (Wordle-style, not a separate modal)
- Each result shows album name + artist name (text only, no thumbnails)
- Maximum 5 results visible in dropdown
- Selecting a result auto-submits the guess immediately (no separate confirm step)

### Game layout & composition
- Centered single column layout on desktop — image on top, input below, guesses below that (Wordle-style vertical flow)
- Album art image is large and dominant (~400-500px square), the visual centerpiece
- Dedicated `/m/game` route for mobile, consistent with existing mobile architecture
- Explicit "Skip" button next to or below the guess input

### Game state feedback
- Previous wrong guesses displayed as a stacked list below the input — each row shows album name + artist
- Attempt progress shown as dots/circles indicator — 6 dots, filled ones = used attempts (visual, compact)
- End-game is inline — the game area transforms to show the result (full image revealed, win/loss message, album details), not a modal
- Returning after completion shows their result — full revealed image + win/loss message + "Come back tomorrow" (no countdown timer)

### Auth gate
- Public page with teaser — anyone can visit and see the obscured album image (stage 1), but must log in to play
- Login CTA overlays the teaser image
- Short tagline explaining the game concept for unauthenticated visitors (e.g., "Guess the album from its cover art. 6 attempts. New puzzle daily.")
- Login redirects to existing `/auth/signin` with return URL back to the game

### Claude's Discretion
- Loading state design (skeletons, spinners, transitions)
- Exact spacing, typography, and color choices
- Keyboard interaction details (beyond Enter/Tab/Escape basics)
- Mobile layout specifics within the `/m/game` route
- Skip button placement relative to input
- Exact tagline copy for unauthenticated visitors

</decisions>

<specifics>
## Specific Ideas

- Wordle-style vertical flow — image dominant at top, interaction below
- Auto-submit on selection keeps the game fast and decisive
- Dots indicator is compact and doesn't clutter the clean layout
- Teaser approach for unauthenticated users creates curiosity (they see the puzzle but can't play)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 38-game-ui*
*Context gathered: 2026-02-15*
