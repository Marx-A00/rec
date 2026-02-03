# Phase 12 Research: Polish & Recovery

## Current State Analysis

### Error Handling (60% complete)

**What exists:**
- Generic error messages in CorrectionModal, SearchView, PreviewView, ApplyView
- Toast notifications for success/error feedback
- Query-level error handling via GraphQL hooks
- Mutation error handling with onError callbacks
- Error display in ApplyView with expandable stack trace
- Red error borders/backgrounds for visual distinction

**What's missing:**
- No retry buttons on failed queries
- No error categorization (network vs validation vs server)
- No rate-limit handling or throttle feedback
- No timeout warnings
- Errors not persisted in state (can't resume after error)

### Loading States (75% complete)

**What exists:**
- PreviewSkeleton - Two-column layout with animate-pulse
- SearchSkeleton - Input + result row placeholders
- ArtistPreviewSkeleton - Grid-based structure
- Loading spinners with Loader2 from lucide-react
- Skeleton primitive from @/components/ui/skeletons
- Disabled buttons during mutations

**What's missing:**
- No skeleton for album/artist data loading on modal open
- No progress indicators for multi-step operations
- No loading state in buttons (just disabled)
- Skeleton animations are basic (no staggered delays)

### Mobile Responsiveness (55% complete)

**What exists:**
- Responsive grid layouts with lg:grid-cols-2
- Max-width constraints on DialogContent
- Max-height with scroll
- Sticky footer on DialogFooter
- Truncation for long text

**What's missing:**
- PreviewSkeleton uses hardcoded 2-column grid (breaks on mobile)
- ComparisonLayout doesn't have mobile single-column variant
- No touch-specific interactions (larger tap targets)
- Dialog max-width (1100px) doesn't scale for mobile
- No viewport-width considerations for search results

### Keyboard Accessibility (50% complete)

**What exists:**
- Enter key handling in search views
- aria-label on SearchResultCard
- htmlFor/id pairing on checkboxes
- Semantic button usage

**What's missing:**
- No Escape key to close modal
- No keyboard shortcuts for step navigation
- No focus management on step transitions
- No visible focus indicators
- No arrow key support in search results list

## Revised Plan Structure

Based on analysis, the roadmap's 5 plans should be reorganized:

### 12-01: Error States & Recovery
- Add retry buttons for failed queries
- Categorize error types (network, validation, rate-limit)
- Improve error messaging with actionable guidance
- Add error boundary for unexpected crashes

### 12-02: Loading & Feedback Polish
- Add skeleton for initial modal data fetch
- Add loading spinners inside buttons during mutations
- Stagger skeleton animations for visual polish
- Add success animations/feedback

### 12-03: Keyboard Shortcuts & Accessibility
- Escape key to close modal
- Enter key standardization across all inputs
- Focus management on step transitions
- Visible focus indicators
- ARIA improvements

### 12-04: Mobile Responsive Layout
- Single-column comparison layout for mobile
- Touch-friendly button sizes and spacing
- Responsive dialog width
- Mobile-optimized search results

### 12-05: Re-enrichment Trigger (Optional)
- "Re-enrich after correction" checkbox
- Queue enrichment job on apply success
- Show enrichment status in UI

## Technical Decisions

1. **Error retry pattern**: Use React Query's built-in retry with custom retry button
2. **Skeleton staggering**: Use CSS animation-delay with index-based calculation
3. **Mobile breakpoint**: Use md: (768px) as primary mobile/desktop switch
4. **Focus trap**: Use Radix Dialog's built-in focus trap (already present)
5. **Keyboard shortcuts**: Add to modal container, not individual components

## Dependencies

- Phase 11 complete (artist correction working)
- All existing correction components functional
- No external library additions needed
