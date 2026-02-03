# Phase 8: Preview UI - Research

**Researched:** 2026-01-25
**Domain:** Side-by-side diff comparison UI for album metadata
**Confidence:** HIGH

## Summary

This research investigates how to build a side-by-side comparison UI for album metadata corrections, displaying current database data alongside MusicBrainz source data with field-level diff highlighting. The standard approach uses native React components with inline span-based highlighting, leveraging existing backend DiffEngine output rather than client-side diff libraries.

The key insight is that Phase 3 already provides comprehensive diff computation via DiffEngine and the GetCorrectionPreview GraphQL query. Phase 8 focuses purely on presentation: rendering the structured diff data with color-coded inline highlights, proper layout for comparison, and collapsible sections for long content.

**Primary recommendation:** Use native React components with inline span elements for diff highlighting (green additions, yellow modifications, red removals). Leverage existing shadcn/ui Accordion for collapsible sections, follow established CurrentDataView patterns for field organization, and consume pre-computed diffs from GetCorrectionPreviewQuery rather than computing client-side.

## Standard Stack

The established libraries/tools for diff comparison UI:

### Core

**Component Library:** shadcn/ui (Radix UI primitives) - Already installed

- Version: @radix-ui/react-accordion ^1.2.12
- Purpose: Collapsible sections, modal primitives
- Why Standard: WAI-ARIA compliant, TypeScript native, unstyled primitives with Tailwind integration

**Diff Data Source:** GetCorrectionPreviewQuery (GraphQL)

- Purpose: Pre-computed field diffs with TextDiffPart arrays
- Why Standard: Backend DiffEngine handles normalization, character-level diffing, and change classification
- Already implemented in Phase 5

**Styling:** Tailwind CSS with custom color scheme

- Purpose: Inline diff highlighting, dark zinc theme
- Why Standard: Utility-first, responsive, matches existing admin components

### Supporting

**Icon Library:** lucide-react 0.471.1

- Purpose: Visual indicators (chevrons, badges, status icons)
- When to Use: Expand/collapse buttons, change type indicators, external ID status

**Type Safety:** Generated GraphQL types

- Purpose: CorrectionPreview, TextDiffPart, FieldDiff union types
- When to Use: All preview data consumption

### Alternatives Considered

**Instead of:** Client-side diff libraries (react-diff-viewer, react-diff-view)
**Could Use:** Custom React components consuming backend diffs
**Tradeoff:** Client-side libs offer split-view UI but require different data format. Backend diffs already computed via DiffEngine, no need for duplicate client-side computation. Custom components provide exact control over color scheme and layout.

**Instead of:** Third-party comparison libraries
**Could Use:** Native Tailwind + React spans
**Tradeoff:** Libraries like react-diff-viewer provide git-style diffs (line-based, unified/split views) which don't match the inline field-level highlighting pattern. Tailwind spans offer precise control for metadata fields.

**Installation:** No new dependencies required - all tools already installed.

## Architecture Patterns

### Recommended Component Structure

```
src/components/admin/correction/
├── preview/                      # New preview module
│   ├── PreviewView.tsx          # Main preview container
│   ├── ComparisonLayout.tsx     # Side-by-side column layout
│   ├── FieldComparison.tsx      # Single field diff display
│   ├── InlineTextDiff.tsx       # Inline highlighted text
│   ├── TrackComparison.tsx      # Track listing comparison
│   ├── CoverArtComparison.tsx   # Side-by-side cover art
│   └── PreviewSkeleton.tsx      # Loading state
├── CurrentDataView.tsx          # Existing (Phase 6)
├── TrackListing.tsx             # Existing (Phase 6)
├── CorrectionModal.tsx          # Existing (Phase 6/7)
└── search/                      # Existing (Phase 7)
```

### Pattern 1: Two-Column Comparison Layout

**What:** Side-by-side grid layout with fixed column widths
**When to use:** Displaying current vs source data for direct comparison
**Example:**

```typescript
// Two-column grid within 1100px modal width
export function ComparisonLayout({
  current,
  source
}: ComparisonLayoutProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left column - Current Data */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase">
          Current
        </h3>
        {current}
      </div>

      {/* Right column - MusicBrainz Source */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-400 uppercase">
          MusicBrainz Source
        </h3>
        {source}
      </div>
    </div>
  );
}
```

### Pattern 2: Inline Text Diff with Spans

**What:** Render TextDiffPart arrays as inline spans with color-coded backgrounds
**When to use:** Highlighting exact character-level changes in text fields
**Example:**

```typescript
// Based on GetCorrectionPreviewQuery TextDiffPart type
interface TextDiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export function InlineTextDiff({
  parts
}: { parts: TextDiffPart[] }) {
  return (
    <span className="inline">
      {parts.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="bg-green-500/20 text-green-400"
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-red-500/20 text-red-400 line-through"
            >
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </span>
  );
}
```

### Pattern 3: Field-Level Change Classification

**What:** Display field based on ChangeType with appropriate styling
**When to use:** Rendering each field comparison from fieldDiffs array
**Example:**

```typescript
type ChangeType = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'CONFLICT' | 'UNCHANGED';

export function FieldComparison({ diff }: { diff: FieldDiff }) {
  // Skip unchanged fields in preview
  if (diff.changeType === 'UNCHANGED') return null;

  return (
    <div className="py-2 border-b border-zinc-800">
      <dt className="text-sm text-zinc-500 mb-1">
        {formatFieldName(diff.field)}
        {diff.changeType === 'ADDED' && (
          <span className="ml-2 text-xs text-green-400">(New)</span>
        )}
        {diff.changeType === 'CONFLICT' && (
          <span className="ml-2 text-xs text-yellow-400">(Modified)</span>
        )}
      </dt>
      <dd className="text-sm">
        {/* Current value */}
        <div className="text-zinc-400">
          {diff.currentValue || '—'}
        </div>
        {/* Source value with diff highlighting */}
        <div className="text-zinc-200 mt-1">
          {diff.parts ? (
            <InlineTextDiff parts={diff.parts} />
          ) : (
            diff.sourceValue || '—'
          )}
        </div>
      </dd>
    </div>
  );
}
```

### Pattern 4: Track Position-Based Comparison

**What:** Align tracks by position, show side-by-side with diff highlighting
**When to use:** Displaying track listing comparison from trackDiffs array
**Example:**

```typescript
export function TrackComparison({
  trackDiffs,
  summary
}: TrackComparisonProps) {
  return (
    <div className="space-y-2">
      {/* Summary stats */}
      <div className="text-sm text-zinc-400 mb-4">
        {summary.matching} matching, {summary.modified} modified,
        {summary.added} added, {summary.removed} removed
      </div>

      {/* Track list */}
      {trackDiffs.map(diff => (
        <div
          key={diff.position}
          className="grid grid-cols-2 gap-4 py-1 text-sm"
        >
          {/* Current track */}
          <div className={diff.changeType === 'REMOVED' ? 'opacity-50' : ''}>
            {diff.current ? (
              <>
                <span className="text-zinc-500 mr-2">{diff.position}.</span>
                <span className="text-zinc-300">{diff.current.title}</span>
                <span className="text-zinc-500 ml-2">
                  {formatDuration(diff.current.durationMs)}
                </span>
              </>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </div>

          {/* Source track */}
          <div className={diff.changeType === 'ADDED' ? 'text-green-400' : ''}>
            {diff.source ? (
              <>
                <span className="text-zinc-500 mr-2">{diff.position}.</span>
                {diff.titleDiff ? (
                  <InlineTextDiff parts={diff.titleDiff} />
                ) : (
                  <span className="text-zinc-300">{diff.source.title}</span>
                )}
                <span className="text-zinc-500 ml-2">
                  {formatDuration(diff.source.durationMs)}
                </span>
              </>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 5: Accordion for Grouped Fields

**What:** Collapsible sections matching CurrentDataView pattern
**When to use:** Organizing preview into Basic Info, Tracks, External IDs sections
**Example:**

```typescript
export function PreviewView({ preview }: PreviewViewProps) {
  return (
    <div className="space-y-6">
      <Accordion
        type="multiple"
        defaultValue={['basic', 'tracks', 'external-ids']}
      >
        {/* Basic Info Section */}
        <AccordionItem value="basic" className="border-zinc-700">
          <AccordionTrigger className="text-zinc-200 hover:text-zinc-100">
            Basic Info
            {hasChanges(preview.fieldDiffs) && (
              <span className="ml-2 text-xs text-yellow-400">
                ({countChanges(preview.fieldDiffs)} changes)
              </span>
            )}
          </AccordionTrigger>
          <AccordionContent>
            <ComparisonLayout
              current={<CurrentFields album={preview.currentAlbum} />}
              source={<SourceFields data={preview.sourceResult} />}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Similar patterns for Tracks, External IDs */}
      </Accordion>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Computing diffs client-side** - Backend DiffEngine already provides character-level diffs via GetCorrectionPreview, don't duplicate logic
- **Using git-style diff libraries** - Libraries like react-diff-viewer are designed for code diffs (line-based, unified/split), not field-level metadata highlighting
- **Full row color backgrounds** - Use inline span highlighting for precise text changes, not full field backgrounds
- **Single-column layout** - Side-by-side comparison is core requirement, don't fallback to sequential layout
- **Fetching diff data per field** - Single GetCorrectionPreview query returns all diffs, don't over-fetch

## Don't Hand-Roll

Problems that look simple but have existing solutions:

**Problem:** Character-level text diffing
**Don't Build:** Custom string comparison in React
**Use Instead:** Backend DiffEngine with jsdiff library
**Why:** Unicode normalization, optimal diff algorithm, already implemented and tested in Phase 3

**Problem:** Collapsible sections with animations
**Don't Build:** Custom useState + CSS transitions
**Use Instead:** shadcn/ui Accordion (Radix primitives)
**Why:** ARIA compliance, keyboard navigation, smooth animations, consistent with Phase 6 patterns

**Problem:** Color-coded diff highlighting
**Don't Build:** Complex CSS class logic
**Use Instead:** Tailwind utility classes with opacity
**Why:** bg-green-500/20 pattern provides subtle backgrounds, matches dark zinc theme, responsive

**Problem:** Track position alignment
**Don't Build:** Client-side array matching logic
**Use Instead:** Backend trackDiffs array from PreviewService
**Why:** Position-based alignment with similarity fallback already implemented in Phase 4, handles edge cases

**Key insight:** Preview UI is primarily a presentation layer. All complex logic (diff computation, normalization, change classification) exists in backend services. Don't reimplement business logic in React components.

## Common Pitfalls

### Pitfall 1: Attempting Client-Side Diff Computation

**What goes wrong:** Installing react-diff-viewer and computing diffs in component, duplicating DiffEngine logic
**Why it happens:** Common pattern in code diff tools, seems like "standard" approach
**How to avoid:** GetCorrectionPreview query returns pre-computed TextDiffPart arrays, use directly
**Warning signs:** Installing new diff libraries, computing string comparisons in React

### Pitfall 2: Full-Width Backgrounds for Changes

**What goes wrong:** Applying bg-yellow-500 to entire field row, loses precision of exact changes
**Why it happens:** Simpler to highlight whole field than parse TextDiffPart arrays
**How to avoid:** Use InlineTextDiff component with span-level backgrounds for parts array
**Warning signs:** User feedback: "Can't see exactly what changed"

### Pitfall 3: Not Handling Missing TextDiffParts

**What goes wrong:** Assuming all MODIFIED fields have parts array, crashes on null/undefined
**Why it happens:** ADDED/REMOVED don't have parts (only currentValue/sourceValue)
**How to avoid:** Check diff.parts existence before rendering InlineTextDiff, fallback to plain text
**Warning signs:** TypeError: Cannot read property 'map' of undefined

### Pitfall 4: Ignoring UNCHANGED Fields in Preview

**What goes wrong:** Showing all fields including unchanged, clutters preview
**Why it happens:** CurrentDataView shows all fields, copying that pattern
**How to avoid:** Filter fieldDiffs to exclude UNCHANGED, or collapse unchanged section by default
**Warning signs:** Admin feedback: "Too much information, hard to see what's different"

### Pitfall 5: Not Fetching Full MusicBrainz Release Data

**What goes wrong:** Preview shows basic fields but "Track listing not available"
**Why it happens:** GetCorrectionPreview requires fetching full MB release (Phase 3 pattern)
**How to avoid:** Backend PreviewService must fetch release with inc=recordings, verify mbReleaseData is populated
**Warning signs:** preview.trackDiffs is empty even when source has tracks

### Pitfall 6: Hardcoding Column Widths in Pixels

**What goes wrong:** Side-by-side layout breaks on smaller screens or different modal widths
**Why it happens:** Trying to match exact mockup dimensions
**How to avoid:** Use Tailwind grid-cols-2 for equal columns, let grid handle responsive breakpoints
**Warning signs:** Horizontal scroll bars, layout breaks below 1100px

### Pitfall 7: Not Preserving Search State When Returning

**What goes wrong:** Admin clicks "Back" from preview, search state is lost, have to search again
**Why it happens:** Not using useCorrectionModalState search persistence
**How to avoid:** Search query, offset, and selectedResultMbid are already persisted in sessionStorage
**Warning signs:** User frustration: "Why do I have to search again?"

## Code Examples

Verified patterns from existing codebase:

### Consuming GetCorrectionPreview Query

```typescript
// Source: src/generated/graphql.ts (Phase 5)
import { useGetCorrectionPreviewQuery } from '@/generated/graphql';

export function PreviewView({ albumId, resultMbid }: PreviewViewProps) {
  const { data, isLoading, error } = useGetCorrectionPreviewQuery(
    {
      input: {
        albumId,
        releaseGroupMbid: resultMbid,
      },
    },
    { enabled: !!albumId && !!resultMbid }
  );

  if (isLoading) return <PreviewSkeleton />;
  if (error) return <ErrorState error={error} />;
  if (!data?.correctionPreview) return null;

  return <PreviewContent preview={data.correctionPreview} />;
}
```

### Dark Zinc Color Scheme (Existing Pattern)

```typescript
// Source: src/components/admin/correction/CurrentDataView.tsx
// Zinc backgrounds for admin components
<Dialog className="bg-zinc-900 border-zinc-800">
  <DialogTitle className="text-cosmic-latte" />
  <AccordionItem className="border-zinc-700">
    <AccordionTrigger className="text-zinc-200 hover:text-zinc-100" />
    <AccordionContent>
      <dt className="text-zinc-500">Field Label</dt>
      <dd className="text-zinc-300">Field Value</dd>
    </AccordionContent>
  </AccordionItem>
</Dialog>
```

### Diff Highlighting Color Scheme

```typescript
// Tailwind classes for diff highlighting (dark zinc theme)
const diffColors = {
  added: 'bg-green-500/20 text-green-400', // Green for new data
  modified: 'bg-yellow-500/20 text-yellow-400', // Yellow/amber for changes
  removed: 'bg-red-500/20 text-red-400', // Red for removals
  unchanged: 'text-zinc-300', // Neutral for no change
};

// Opacity-based backgrounds (/20) provide subtle highlighting on dark zinc-900
```

### Accordion Default Expanded (Phase 6 Pattern)

```typescript
// Source: src/components/admin/correction/CurrentDataView.tsx
<Accordion
  type="multiple"
  defaultValue={['basic', 'tracks', 'external-ids']}
  className="w-full"
>
  {/* All sections expanded by default */}
</Accordion>
```

### Track Collapse Threshold (Phase 6 Pattern)

```typescript
// Source: src/components/admin/correction/TrackListing.tsx
const AUTO_COLLAPSE_THRESHOLD = 30;
const COLLAPSED_TRACK_COUNT = 10;

export function TrackListing({ tracks }: TrackListingProps) {
  const shouldAutoCollapse = tracks.length >= AUTO_COLLAPSE_THRESHOLD;
  const [showAll, setShowAll] = useState(!shouldAutoCollapse);

  const displayTracks = showAll
    ? tracks
    : tracks.slice(0, COLLAPSED_TRACK_COUNT);

  // Show "Show all N tracks" button if collapsed
}
```

## State of the Art

**Change Classification:**

- Old Approach: Boolean "has changes" flag
- Current Approach: Five-state classification (ADDED/MODIFIED/REMOVED/CONFLICT/UNCHANGED)
- When Changed: Phase 3 implementation
- Impact: Admin sees exact nature of change, can filter by change type

**Diff Presentation:**

- Old Approach: Full-field backgrounds (green row = added, red row = removed)
- Current Approach: Inline span-level highlighting with TextDiffPart arrays
- When Changed: Industry pattern (GitHub, GitLab, modern code review tools)
- Impact: Precise character-level visibility, less visual noise

**Component Libraries:**

- Old Approach: Styled components (Material-UI, Ant Design) with pre-designed styles
- Current Approach: Unstyled primitives (Radix UI) with Tailwind utility classes
- When Changed: 2023-2024 shift toward headless UI libraries
- Impact: Full control over styling, smaller bundle size, better TypeScript support

**Side-by-Side Layout:**

- Old Approach: Unified diff view (GitHub-style line-by-line)
- Current Approach: Split view with aligned fields for metadata comparison
- When Changed: Pattern for structured data diffs (not code diffs)
- Impact: Easier to scan field-by-field, matches user mental model for album metadata

**Deprecated/outdated:**

- **react-diff-viewer for metadata:** Designed for code/text diffs, not structured field comparison. Use custom components consuming backend diffs.
- **Client-side jsdiff:** Duplicates backend logic, increases bundle size. Backend DiffEngine already provides character-level diffs.
- **Inline editing in preview:** Preview is read-only comparison, manual edits happen in admin database table (deferred to Phase 10).

## Open Questions

Things that couldn't be fully resolved:

1. **Responsive breakpoint for side-by-side layout**
   - What we know: Modal is 1100px wide, two columns fit comfortably
   - What's unclear: Should layout stack vertically on smaller screens or is modal desktop-only?
   - Recommendation: Keep side-by-side at all times since modal is admin-only (desktop workflow). If mobile admin needed, stack columns below 768px breakpoint.

2. **Cover art comparison placement**
   - What we know: Preview needs side-by-side cover art (requirement PREVIEW-05)
   - What's unclear: Inside basic info accordion or separate section at top?
   - Recommendation: Separate section at top before accordion, provides visual anchor for comparison (matches CurrentDataView header pattern).

3. **External ID link handling**
   - What we know: External IDs should be displayed with click-to-open links
   - What's unclear: Open in new tab or same tab? Show truncated or full ID?
   - Recommendation: Match Phase 6 pattern - truncate to 8-12 chars, hover tooltip shows full ID, click opens in new tab (target="\_blank").

4. **Collapsed vs expanded default state**
   - What we know: CurrentDataView defaults to all sections expanded
   - What's unclear: Should preview also default to all expanded or only changed sections?
   - Recommendation: Expand only sections with changes by default (preview focus is what's different). Admin can expand others manually.

5. **Empty track listing handling**
   - What we know: Some MusicBrainz releases may not have track data
   - What's unclear: Show "Track listing not available" or hide tracks section entirely?
   - Recommendation: Show tracks section with message "Track data not available from MusicBrainz" to set expectations, don't silently hide.

## Sources

### Primary (HIGH confidence)

- GetCorrectionPreview GraphQL query: /src/graphql/queries/correctionPreview.graphql - Pre-computed diff structure
- DiffEngine implementation: /src/lib/correction/preview/diff-engine.ts - Character-level diffing with jsdiff
- Preview types: /src/lib/correction/preview/types.ts - CorrectionPreview, TextDiffPart, FieldDiff interfaces
- CurrentDataView pattern: /src/components/admin/correction/CurrentDataView.tsx - Accordion layout, field grouping
- useCorrectionModalState: /src/hooks/useCorrectionModalState.ts - State persistence pattern
- Phase 3 Research: /.planning/phases/03-preview-service/03-RESEARCH.md - Diff computation patterns

### Secondary (MEDIUM confidence)

- shadcn/ui Accordion docs: https://ui.shadcn.com/docs/components/accordion - Component API, accessibility
- Radix UI primitives: Verified via package.json (@radix-ui/react-accordion ^1.2.12)
- React inline highlighting patterns: https://medium.com/@lucas.eckman/easy-as-1-2-3-cdca597f35a6 - Span-based text highlighting
- Tailwind color utilities: https://tailwindcss.com/docs/colors - Opacity-based backgrounds

### Tertiary (LOW confidence)

- react-diff-viewer comparison: https://github.com/praneshr/react-diff-viewer - Feature comparison (not used, documented as alternative)
- Side-by-side diff UI patterns: WebSearch results on comparison layouts - General pattern validation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All tools already installed, GraphQL query implemented in Phase 5
- Architecture: HIGH - Patterns verified in existing codebase (Phase 6/7), consistent with project structure
- Pitfalls: HIGH - Derived from actual implementation pitfalls in Phase 3 planning docs
- Color scheme: HIGH - Dark zinc pattern used throughout admin components (verified in CurrentDataView)
- Layout: MEDIUM - Two-column grid is requirement-driven, responsive breakpoints need validation

**Research date:** 2026-01-25
**Valid until:** 30 days (stable domain, no new library versions expected)
