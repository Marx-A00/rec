# Phase 21: Source Selection UI - Research

**Researched:** 2026-02-08
**Domain:** React state management, UI component patterns, source toggle
**Confidence:** HIGH

## Summary

Phase 21 adds a source selection toggle to the correction modal, allowing admins to choose between MusicBrainz and Discogs before searching. The implementation follows established patterns in the codebase: Zustand stores for state persistence, Radix UI primitives for accessible components, and atomic state updates.

The research confirms that:
- Zustand's persist middleware with sessionStorage is the standard pattern (already used in correction stores)
- Radix UI Toggle Group provides accessible, keyboard-navigable toggle buttons (Radix primitives already in use via shadcn/ui)
- State should be cleared atomically when switching sources to avoid stale data
- Badge components already exist for source indicators
- Both album and artist stores need identical source field additions

**Primary recommendation:** Add `correctionSource: 'musicbrainz' | 'discogs'` field to both Zustand stores (persisted), create reusable `SourceToggle` component using Radix Toggle Group, clear search state atomically on source switch.

## Standard Stack

The established libraries/tools for this implementation:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | 4.x | State management | Already used for correction stores with persist middleware |
| Radix UI | Latest | Accessible primitives | Codebase uses shadcn/ui which wraps Radix primitives |
| React Query | v5 | GraphQL data fetching | Standard for all data fetching, hooks already generated |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand/middleware | 4.x | persist middleware | State persistence across navigation (already in use) |
| @radix-ui/react-toggle-group | Latest | Toggle button group | Accessible source selector (shadcn/ui base) |
| class-variance-authority | Latest | Badge variants | Source indicator styling (already in use for Badge component) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Toggle Group | Radio Group | Radio groups are semantically for forms; toggles better for UI state switches |
| Toggle Group | Tabs component | Tabs imply content sections; toggles better for binary state |
| Zustand | URL search params | URL state doesn't persist across page loads; modal state should be session-scoped |

**Installation:**
No new packages needed - all dependencies already in codebase.

## Architecture Patterns

### Recommended State Structure

Add source field to existing Zustand stores (both album and artist):

```typescript
// Add to CorrectionState interface
export interface CorrectionState {
  // ... existing fields
  
  /** Selected correction source (MusicBrainz or Discogs) */
  correctionSource: 'musicbrainz' | 'discogs';
}

// Add to persisted fields in partialize
partialize: state => ({
  step: state.step,
  mode: state.mode,
  correctionSource: state.correctionSource, // NEW
  searchQuery: state.searchQuery,
  // ... other persisted fields
})
```

### Pattern 1: Atomic Source Switching

**What:** When source changes, atomically clear search-related state to prevent stale data from wrong source.

**When to use:** In the `setCorrectionSource` action when user toggles between sources.

**Example:**
```typescript
// Source: Existing atomic pattern from useCorrectionStore.ts (selectResult, setPreviewLoaded)

setCorrectionSource: (source: 'musicbrainz' | 'discogs') => {
  set({
    correctionSource: source,
    // Clear search state - results from one source invalid for another
    searchQuery: undefined,
    searchOffset: 0,
    selectedMbid: undefined,
    previewData: null,
    applySelections: null,
  });
}
```

### Pattern 2: Reusable Source Toggle Component

**What:** Stateless component receives current source and onChange callback, uses Radix Toggle Group for accessibility.

**When to use:** At top of search view, shared between album and artist correction modals.

**Example:**
```typescript
// Source: shadcn/ui Tabs pattern (src/components/ui/tabs.tsx)
// and FeedTabs custom implementation (src/components/feed/FeedTabs.tsx)

interface SourceToggleProps {
  value: 'musicbrainz' | 'discogs';
  onChange: (value: 'musicbrainz' | 'discogs') => void;
}

export function SourceToggle({ value, onChange }: SourceToggleProps) {
  return (
    <ToggleGroup 
      type="single" 
      value={value}
      onValueChange={(v) => v && onChange(v as 'musicbrainz' | 'discogs')}
    >
      <ToggleGroupItem value="musicbrainz">MusicBrainz</ToggleGroupItem>
      <ToggleGroupItem value="discogs">Discogs</ToggleGroupItem>
    </ToggleGroup>
  );
}
```

### Pattern 3: Source Indicator Badge

**What:** Display current source in preview view using existing Badge component with custom variant.

**When to use:** In preview step header to show which source the data came from.

**Example:**
```typescript
// Source: Existing Badge component (src/components/ui/badge.tsx)

<div className="flex items-center gap-2">
  <h3>Preview Changes</h3>
  <Badge variant="outline" className="capitalize">
    {source === 'musicbrainz' ? 'MusicBrainz' : 'Discogs'}
  </Badge>
</div>
```

### Pattern 4: Conditional GraphQL Query Selection

**What:** Use different GraphQL queries based on selected source, both with same enabled condition.

**When to use:** In SearchView component when fetching results.

**Example:**
```typescript
// Source: Existing pattern from SearchView.tsx (conditional query enabling)

const isMusicBrainz = correctionSource === 'musicbrainz';

const mbQuery = useSearchCorrectionCandidatesQuery(
  { input: { albumId, albumTitle, artistName, limit, offset } },
  { enabled: isMusicBrainz && isSearchTriggered }
);

const discogsQuery = useSearchDiscogsCandidatesQuery(
  { input: { albumId, albumTitle, artistName, limit, offset } },
  { enabled: !isMusicBrainz && isSearchTriggered }
);

const { data, isLoading, error } = isMusicBrainz ? mbQuery : discogsQuery;
```

### Anti-Patterns to Avoid

- **Switching source without clearing state:** Leads to showing MusicBrainz preview with Discogs selected, confusing users
- **Non-atomic updates:** Multiple `set()` calls can cause intermediate states where source changed but search state hasn't cleared
- **Forgetting to add to partialize:** Source selection won't persist across navigation
- **Different implementations for album vs artist:** Maintain consistency - both stores should have identical source field

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible toggle buttons | Custom styled buttons with onClick | Radix Toggle Group | Built-in keyboard navigation, ARIA attributes, focus management |
| State persistence | Custom localStorage logic | Zustand persist middleware | Already configured, handles serialization, selective persistence |
| Badge styling | Inline Tailwind classes | Badge component with variants | Consistent styling, reusable, supports themes |
| Clearing search state | Manual field-by-field reset | Atomic set() with multiple fields | Prevents intermediate states, easier to maintain |

**Key insight:** The correction stores already use all the patterns needed (persist middleware, atomic updates, factory pattern). This phase just adds one more field to existing infrastructure.

## Common Pitfalls

### Pitfall 1: Forgetting Artist Store

**What goes wrong:** Implementing source toggle only in album correction store, forgetting artist correction has separate store.

**Why it happens:** Album corrections came first (v1), artist corrections added later (Phase 14). Easy to focus on album code.

**How to avoid:** Grep for both `useCorrectionStore` and `useArtistCorrectionStore` when making state changes. Update both in same commit.

**Warning signs:** Source toggle works in album modal but not artist modal, or throws errors about undefined correctionSource.

### Pitfall 2: Not Clearing Preview Data

**What goes wrong:** User searches MusicBrainz, selects result, previews, goes back, switches to Discogs, sees stale MusicBrainz preview.

**Why it happens:** Only clearing search query but not preview/apply state in source switch action.

**How to avoid:** Use atomic update pattern - clear ALL search-related state: `searchQuery`, `searchOffset`, `selectedMbid`, `previewData`, `applySelections`.

**Warning signs:** Preview step shows data from wrong source, or "Apply" step has selections from previous source.

### Pitfall 3: Toggle Without Type Guard

**What goes wrong:** Radix Toggle Group's `onValueChange` can pass `undefined` if user clicks same button twice.

**Why it happens:** Toggle groups support deselecting all options by default.

**How to avoid:** Use `type="single"` on ToggleGroup and guard against undefined: `onValueChange={(v) => v && onChange(v)}`.

**Warning signs:** Source resets to undefined on double-click, causing query errors.

### Pitfall 4: Badge Placement Confusion

**What goes wrong:** Adding source badge to search results instead of preview header, cluttering UI unnecessarily.

**Why it happens:** Requirement says "preview view shows source indicator" but easy to add to wrong component.

**How to avoid:** Place badge in PreviewView header (step 2/3), NOT in SearchResultCard. User already knows source from toggle at top of search step.

**Warning signs:** Source badge shows on every search result card, redundant since toggle is visible.

## Code Examples

Verified patterns from codebase:

### Adding Source Field to Store

```typescript
// Location: src/stores/useCorrectionStore.ts
// Source: Existing store pattern with atomic actions

// 1. Add to state interface (persisted section)
export interface CorrectionState {
  // ... existing persisted fields
  correctionSource: 'musicbrainz' | 'discogs';
}

// 2. Add to default state
const DEFAULT_STATE: CorrectionState = {
  // ... existing defaults
  correctionSource: 'musicbrainz', // Default to MusicBrainz
};

// 3. Add to persisted fields (partialize)
partialize: state => ({
  step: state.step,
  mode: state.mode,
  correctionSource: state.correctionSource, // NEW
  searchQuery: state.searchQuery,
  // ... other persisted fields
})

// 4. Add action creator with atomic clearing
export interface CorrectionActions {
  // ... existing actions
  setCorrectionSource: (source: 'musicbrainz' | 'discogs') => void;
}

// 5. Implement action in store factory
setCorrectionSource: (source: 'musicbrainz' | 'discogs') => {
  const current = get().correctionSource;
  if (current === source) return; // No-op if same
  
  set({
    correctionSource: source,
    // Clear search state atomically
    searchQuery: undefined,
    searchOffset: 0,
    selectedMbid: undefined,
    previewData: null,
    applySelections: null,
  });
}
```

### SourceToggle Component

```typescript
// Location: src/components/admin/correction/shared/SourceToggle.tsx (NEW FILE)
// Source: Radix Toggle Group pattern + shadcn/ui styling

'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type CorrectionSource = 'musicbrainz' | 'discogs';

export interface SourceToggleProps {
  value: CorrectionSource;
  onChange: (value: CorrectionSource) => void;
  className?: string;
}

/**
 * Toggle between MusicBrainz and Discogs correction sources.
 * Uses Radix Toggle Group for accessibility (keyboard nav, ARIA).
 */
export function SourceToggle({ value, onChange, className }: SourceToggleProps) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-zinc-300 mb-2 block">
        Correction Source
      </label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as CorrectionSource)}
        className="justify-start"
      >
        <ToggleGroupItem value="musicbrainz" className="px-4">
          MusicBrainz
        </ToggleGroupItem>
        <ToggleGroupItem value="discogs" className="px-4">
          Discogs
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
```

### Using SourceToggle in SearchView

```typescript
// Location: src/components/admin/correction/search/SearchView.tsx
// Source: Existing SearchView pattern with store integration

import { SourceToggle } from '../shared/SourceToggle';

export function SearchView({ album }: SearchViewProps) {
  const store = getCorrectionStore(album.id);
  const correctionSource = store(s => s.correctionSource);
  const setCorrectionSource = store.getState().setCorrectionSource;

  return (
    <div className="space-y-4">
      {/* Source toggle at top */}
      <SourceToggle
        value={correctionSource}
        onChange={setCorrectionSource}
      />
      
      {/* Existing search inputs */}
      <SearchInputs
        initialAlbumTitle={currentQuery.albumTitle}
        initialArtistName={currentQuery.artistName}
        onSearch={handleSearch}
        isLoading={isLoading}
      />
      
      {/* Results */}
      {isSearchTriggered && !isLoading && (
        <SearchResults ... />
      )}
    </div>
  );
}
```

### Source Badge in PreviewView

```typescript
// Location: src/components/admin/correction/preview/PreviewView.tsx
// Source: Existing Badge component usage

import { Badge } from '@/components/ui/badge';

export function PreviewView({ albumId }: PreviewViewProps) {
  const store = getCorrectionStore(albumId);
  const correctionSource = store(s => s.correctionSource);
  
  return (
    <div className="space-y-6">
      {/* Header with source indicator */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">Preview Changes</h3>
        <Badge 
          variant="outline" 
          className="capitalize text-xs"
        >
          {correctionSource === 'musicbrainz' ? 'MusicBrainz' : 'Discogs'}
        </Badge>
      </div>
      
      {/* Existing preview content */}
      <CoverArtComparison ... />
      <FieldComparisonList ... />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|---------|
| MusicBrainz only | Multi-source selection | v1.3 (2026-02) | Admins can use better source per entity |
| Manual state clearing | Atomic state updates | v1.2 (Phase 11) | Prevents stale intermediate states |
| Local component state | Zustand with persist | v1.0 (2025) | State survives navigation |
| Custom toggles | Radix Toggle Group | Codebase standard | Better accessibility, keyboard nav |

**Deprecated/outdated:**
- **Manual localStorage**: Use Zustand persist middleware instead (handles serialization, selective persistence)
- **Inline button toggles**: Use Radix Toggle Group for accessibility and keyboard navigation
- **Prop drilling for state**: Use Zustand stores with factory pattern per entity

## Open Questions

None - implementation path is clear based on existing patterns.

## Sources

### Primary (HIGH confidence)

- Codebase: `src/stores/useCorrectionStore.ts` - Zustand store with persist, atomic actions, factory pattern
- Codebase: `src/stores/useArtistCorrectionStore.ts` - Artist variant of correction store
- Codebase: `src/components/ui/toggle-group.tsx` - Radix Toggle Group wrapped by shadcn/ui
- Codebase: `src/components/ui/badge.tsx` - Badge component with variants
- Codebase: `src/components/admin/correction/search/SearchView.tsx` - GraphQL query conditional enabling
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/middlewares/persist) - sessionStorage persistence pattern
- [Radix UI Toggle Group](https://www.radix-ui.com/primitives/docs/components/toggle-group) - Accessible toggle button group

### Secondary (MEDIUM confidence)

- [React State Management 2026 Best Practices](https://react.dev/learn/preserving-and-resetting-state) - Using keys to reset state
- [Toggle Switch Accessibility](https://www.atomica11y.com/accessible-design/toggle-switch/) - 44px minimum tap target, keyboard shortcuts
- [shadcn/ui Toggle Group](https://ui.shadcn.com/docs/components/radix/toggle-group) - Single-select toggle groups for radio-like behavior

### Tertiary (LOW confidence)

- [2026 UI Clarity Trends](https://landdding.com/blog/ui-design-trends-2026) - Oversized typography, visible controls (relevant for toggle sizing)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, patterns proven in codebase
- Architecture: HIGH - Zustand atomic actions, persist middleware, Radix primitives all established
- Pitfalls: HIGH - Identified from similar patterns in existing correction stores (manual vs search mode switching)

**Research date:** 2026-02-08
**Valid until:** 30 days (stable patterns - Zustand and Radix APIs unlikely to change)
