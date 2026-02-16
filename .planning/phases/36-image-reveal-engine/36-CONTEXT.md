# Phase 36: Image Reveal Engine - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Client-side image processing engine that obscures album art and progressively reveals it across 6 guess stages. Two reveal styles: pixelation (tile reveal) and blur (strip reveal). Both styles are being prototyped for A/B testing to determine which feels better. All processing happens client-side via Canvas API and CSS filters — no server load.

</domain>

<decisions>
## Implementation Decisions

### Pixelation Style
- Tile reveal approach — image starts fully pixelated, then tiles clear to full resolution each stage
- Strategic tile ordering — edges/corners reveal first, center (most identifying) reveals last
- Starting pixelation: 16x16 grid (~256 blocks, can see rough color regions but not identify art)
- Fixed pixelation on unrevealed tiles — unrevealed tiles stay at 16x16 blockiness throughout; only revealed tiles go fully clear (binary contrast)

### Blur Style
- Strip reveal approach — rectangular strips progressively go from blurred to clear
- Very heavy blur at stage 1 — frosted glass effect (~40px blur radius), only vague colors visible
- Strip reveal order randomized per daily challenge — seeded so all players see the same pattern for a given day

### Reveal Progression
- Linear pacing — each stage reveals roughly the same amount (~16% per stage)
- Same reveal seed for both styles — switching between pixelation and blur shows the same revealed/hidden regions, just rendered differently (apples-to-apples comparison for A/B testing)
- Instant snap between stages during gameplay (no animation)
- Animated final reveal on game end (win or loss) — satisfying "unveil" moment where remaining obscured regions clear

### Style Toggle
- In-game toggle — small icon on/near the image to switch between pixelation and blur
- Default to pixelation for new players
- Mid-game switching allowed — can switch anytime between guesses, same revealed regions just rendered differently
- Preference persists in localStorage across sessions

### Image Rendering
- Responsive sizing — image fills available space and adapts to viewport (not fixed dimensions)

### Claude's Discretion
- Exact toggle icon design and placement
- Canvas API vs CSS filter implementation details per style
- Final reveal animation timing and easing
- How to handle the reveal seed generation (deterministic from challenge ID)
- Performance optimizations for canvas rendering

</decisions>

<specifics>
## Specific Ideas

- The toggle exists primarily for A/B testing which reveal style feels better — it's not meant as a permanent dual-mode feature
- Pixelation should feel like a puzzle — binary clear/blocked tiles create a guessing game with partial information
- Blur strips should feel different enough from pixelation to be a meaningful comparison

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 36-image-reveal-engine*
*Context gathered: 2026-02-15*
