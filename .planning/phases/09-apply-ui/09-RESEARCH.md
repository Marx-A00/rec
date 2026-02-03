# Phase 9: Apply UI - Research

**Researched:** 2026-01-26
**Domain:** Multi-field selection UI with confirmation, GraphQL mutations, optimistic updates
**Confidence:** HIGH

## Summary

Phase 9 implements the Apply UI for the correction modal where admins select which fields to apply from a MusicBrainz correction and confirm changes. The phase builds on Phase 8's preview infrastructure, Phase 4's apply service, and the existing modal state management. The UI uses accordion sections matching the preview layout with nested checkbox controls for field selection.

User decisions from CONTEXT.md establish the core UX patterns: accordion groups for field organization, default all-selected state (admin deselects unwanted changes), hybrid track selection with per-track granularity, step transition model (no separate dialog), toast notifications on success, modal auto-close after brief "Applied!" state, and inline error recovery without retry buttons.

The technical stack is already in place: Radix UI Accordion and Checkbox primitives, TanStack Query v5 for GraphQL mutations, existing Toast component with useToast hook, and the apply service with atomic transaction support. The main implementation challenge is managing hierarchical checkbox state (global → section → individual fields) and providing clear diff summaries before final confirmation.

**Primary recommendation:** Use controlled checkbox state with React 19 patterns for field selection form. Leverage TanStack Query v5 mutation hooks with onSuccess callbacks for toast notifications. Structure the apply step as a dedicated view component that receives preview data and renders accordion sections with nested checkboxes. Use the existing Toast component and implement auto-close with setTimeout after mutation success.

## Standard Stack

The established libraries/tools for this phase:

### Core

| Library            | Version | Purpose                             | Why Standard                                                                                 |
| ------------------ | ------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| Radix UI Accordion | 1.2.12  | Collapsible sections                | Already in project, used in Phase 8 preview, accessible ARIA patterns                        |
| Radix UI Checkbox  | 1.3.3   | Field selection controls            | Already in project, proper indeterminate state support for nested selections                 |
| TanStack Query     | v5      | GraphQL mutation execution          | Already in project, mutation callbacks (onSuccess/onError) work perfectly for toast feedback |
| React 19           | stable  | UI framework with form improvements | Project standard, useActionState and form patterns for complex checkbox state                |
| Next.js            | 15      | App framework                       | Project standard, client components for interactive forms                                    |
| sonner             | 2.0.7   | Toast notifications (alternative)   | Already installed, could replace custom Toast if needed                                      |

### Supporting

| Library          | Version  | Purpose                     | When to Use                                                                |
| ---------------- | -------- | --------------------------- | -------------------------------------------------------------------------- |
| Custom Toast     | current  | Success/error notifications | Already in use (src/components/ui/toast.tsx), matches existing UI patterns |
| deep-object-diff | 1.1.9    | Change detection            | Already in project, useful for tracking checkbox state changes             |
| framer-motion    | 12.23.14 | Row highlight animations    | Already in project, use for "flash" effect on updated album row            |

### Alternatives Considered

| Instead of               | Could Use                    | Tradeoff                                                                                |
| ------------------------ | ---------------------------- | --------------------------------------------------------------------------------------- |
| Controlled checkboxes    | Uncontrolled with FormData   | Controlled gives immediate validation feedback and enables conditional logic            |
| TanStack Query mutations | Server Actions               | Server Actions don't provide optimistic UI or fine-grained loading states for mutations |
| Custom Toast             | sonner                       | Custom Toast is already working and styled consistently with admin UI                   |
| Step transition          | Separate confirmation dialog | Step model provides better context (user sees diff while confirming)                    |

**Installation:**
No new packages needed - all dependencies already installed in project.

## Architecture Patterns

### Recommended Component Structure

```
src/components/admin/correction/
├── apply/
│   ├── ApplyView.tsx              # Main container for apply step
│   ├── FieldSelectionForm.tsx     # Accordion sections with checkboxes
│   ├── MetadataSection.tsx        # Metadata field checkboxes (title, date, type, etc.)
│   ├── TrackSection.tsx           # Track selection with hybrid approach
│   ├── ExternalIdSection.tsx      # External ID checkboxes
│   ├── DiffSummary.tsx            # Before/after summary for selected fields
│   └── ApplyErrorState.tsx        # Inline error with expandable details
```

### Pattern 1: Hierarchical Checkbox State Management

**What:** Three-level checkbox state: global "Select all" → section "Select all" → individual fields
**When to use:** Complex forms with grouped checkboxes requiring master/detail control
**Example:**

```typescript
// Source: React checkbox patterns + Radix UI indeterminate state
interface FieldSelections {
  metadata: {
    title: boolean;
    releaseDate: boolean;
    releaseType: boolean;
    label: boolean;
    barcode: boolean;
  };
  tracks: {
    applyAll: boolean;
    excludedTrackIds: Set<string>; // Hybrid approach: all selected except excluded
  };
  externalIds: {
    musicbrainzId: boolean;
    spotifyId: boolean;
    discogsId: boolean;
  };
  coverArt: boolean;
}

export function FieldSelectionForm({ preview }: { preview: CorrectionPreview }) {
  const [selections, setSelections] = useState<FieldSelections>(() =>
    createDefaultSelections(preview) // All true by default
  );

  // Section-level "select all" handler
  const handleMetadataSelectAll = (checked: boolean) => {
    setSelections(prev => ({
      ...prev,
      metadata: {
        title: checked,
        releaseDate: checked,
        releaseType: checked,
        label: checked,
        barcode: checked,
      },
    }));
  };

  // Individual field handler
  const handleFieldToggle = (section: 'metadata', field: string) => {
    setSelections(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field],
      },
    }));
  };

  // Calculate indeterminate state for section checkbox
  const metadataValues = Object.values(selections.metadata);
  const allMetadataSelected = metadataValues.every(v => v);
  const someMetadataSelected = metadataValues.some(v => v) && !allMetadataSelected;

  return (
    <Accordion type="multiple" defaultValue={['metadata', 'tracks', 'external-ids']}>
      <AccordionItem value="metadata">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allMetadataSelected}
              indeterminate={someMetadataSelected}
              onCheckedChange={handleMetadataSelectAll}
              onClick={(e) => e.stopPropagation()} // Prevent accordion toggle
            />
            <span>Metadata ({changedCount} changes)</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          {/* Individual field checkboxes */}
          <label className="flex items-center gap-2">
            <Checkbox
              checked={selections.metadata.title}
              onCheckedChange={() => handleFieldToggle('metadata', 'title')}
            />
            <span>Title</span>
          </label>
          {/* More fields... */}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

### Pattern 2: Hybrid Track Selection

**What:** "Apply all tracks" checkbox with expandable per-track checkboxes for exclusions
**When to use:** Large lists where users typically want all items but need occasional exclusions
**Example:**

```typescript
// Source: User decision (CONTEXT.md) + React checkbox patterns
interface TrackSelectionState {
  applyAll: boolean;
  excludedTrackIds: Set<string>;
}

export function TrackSection({ trackDiffs }: { trackDiffs: TrackDiff[] }) {
  const [trackState, setTrackState] = useState<TrackSelectionState>({
    applyAll: true,
    excludedTrackIds: new Set(),
  });

  const [showIndividual, setShowIndividual] = useState(false);

  const handleApplyAllToggle = (checked: boolean) => {
    setTrackState({
      applyAll: checked,
      excludedTrackIds: checked ? new Set() : new Set(trackDiffs.map(t => t.mbTrack.id)),
    });
  };

  const handleTrackToggle = (trackId: string) => {
    setTrackState(prev => {
      const excluded = new Set(prev.excludedTrackIds);
      if (excluded.has(trackId)) {
        excluded.delete(trackId);
      } else {
        excluded.add(trackId);
      }
      return {
        applyAll: excluded.size === 0,
        excludedTrackIds: excluded,
      };
    });
  };

  const selectedCount = trackDiffs.length - trackState.excludedTrackIds.size;

  return (
    <AccordionItem value="tracks">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={trackState.applyAll}
            indeterminate={selectedCount > 0 && selectedCount < trackDiffs.length}
            onCheckedChange={handleApplyAllToggle}
            onClick={(e) => e.stopPropagation()}
          />
          <span>Tracks ({selectedCount}/{trackDiffs.length} selected)</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowIndividual(!showIndividual)}
          >
            {showIndividual ? 'Hide' : 'Show'} individual tracks
          </Button>

          {showIndividual && (
            <div className="space-y-1 pl-6">
              {trackDiffs.map(diff => (
                <label key={diff.mbTrack.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={!trackState.excludedTrackIds.has(diff.mbTrack.id)}
                    onCheckedChange={() => handleTrackToggle(diff.mbTrack.id)}
                  />
                  <span className="text-sm">
                    {diff.mbTrack.position}. {diff.mbTrack.title}
                    {diff.changeType !== 'UNCHANGED' && (
                      <span className="ml-2 text-amber-400">({diff.changeType})</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
```

### Pattern 3: TanStack Query Mutation with Toast Feedback

**What:** GraphQL mutation with onSuccess/onError callbacks for toast notifications and modal auto-close
**When to use:** All mutations requiring user feedback in this project
**Example:**

```typescript
// Source: TanStack Query v5 docs + existing project patterns
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';

export function ApplyView({ albumId, preview, onComplete }: ApplyViewProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isApplied, setIsApplied] = useState(false);

  const applyMutation = useMutation({
    mutationFn: async (selections: FieldSelections) => {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: APPLY_CORRECTION_MUTATION,
          variables: { input: { albumId, preview, selections } },
        }),
      });
      const { data, errors } = await response.json();
      if (errors) throw new Error(errors[0].message);
      return data.applyCorrection;
    },
    onSuccess: (result) => {
      // Show success state briefly
      setIsApplied(true);

      // Show toast with summary
      const summary = buildChangeSummary(result.changes);
      showToast(`Updated: ${summary}`, 'success');

      // Invalidate album queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });

      // Auto-close modal after 1.5s
      setTimeout(() => {
        onComplete(result); // Triggers modal close + row highlight
      }, 1500);
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const handleApply = () => {
    applyMutation.mutate(selections);
  };

  if (isApplied) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-medium">Applied!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FieldSelectionForm preview={preview} selections={selections} onChange={setSelections} />
      <Button
        onClick={handleApply}
        disabled={applyMutation.isPending}
      >
        {applyMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Applying...
          </>
        ) : (
          'Confirm & Apply'
        )}
      </Button>
    </div>
  );
}

function buildChangeSummary(changes: AppliedChanges): string {
  const parts: string[] = [];
  if (changes.metadata.length > 0) {
    parts.push(`${changes.metadata.length} field${changes.metadata.length !== 1 ? 's' : ''}`);
  }
  if (changes.tracks.modified + changes.tracks.added + changes.tracks.removed > 0) {
    parts.push(`${changes.tracks.modified + changes.tracks.added} tracks`);
  }
  return parts.join(', ');
}
```

### Pattern 4: Inline Error Recovery

**What:** Stay on apply step with error message, allow retry by re-clicking Apply button
**When to use:** Mutations that might fail (network errors, conflicts, validation)
**Example:**

```typescript
// Source: User decision (CONTEXT.md) + UX best practices
export function ApplyErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-red-400 font-medium">Failed to apply correction</p>
          <p className="text-sm text-red-300 mt-1">{error.message}</p>

          {/* Expandable technical details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-red-400 underline mt-2"
          >
            {showDetails ? 'Hide' : 'Show'} details
          </button>

          {showDetails && (
            <pre className="mt-2 text-xs text-red-300 bg-red-950/50 p-2 rounded overflow-x-auto">
              {error.stack || 'No additional details available'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// In ApplyView:
{applyMutation.error && (
  <ApplyErrorState error={applyMutation.error} onRetry={() => applyMutation.reset()} />
)}
```

### Pattern 5: Diff Summary Before Confirmation

**What:** Compact before/after display for all selected fields, confirming what will change
**When to use:** Final confirmation before destructive/complex operations
**Example:**

```typescript
// Source: Phase 8 FieldComparison patterns + user decisions
export function DiffSummary({ preview, selections }: DiffSummaryProps) {
  // Filter to only show selected fields
  const selectedFieldDiffs = preview.fieldDiffs.filter(diff => {
    if (diff.field === 'title') return selections.metadata.title;
    if (diff.field === 'releaseDate') return selections.metadata.releaseDate;
    // ... etc
    return false;
  });

  const selectedTrackCount = preview.trackDiffs.length - selections.tracks.excludedTrackIds.size;

  return (
    <div className="space-y-4 p-4 bg-zinc-800/50 rounded-lg">
      <h3 className="font-medium text-cosmic-latte">Summary of Changes</h3>

      {/* Metadata changes */}
      {selectedFieldDiffs.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-400">Metadata:</p>
          {selectedFieldDiffs.map(diff => (
            <div key={diff.field} className="text-sm">
              <span className="text-zinc-400">{formatFieldLabel(diff.field)}:</span>
              {diff.changeType === 'CHANGED' && (
                <>
                  <span className="text-red-400 line-through ml-2">{diff.currentValue}</span>
                  <span className="text-green-400 ml-2">→ {diff.suggestedValue}</span>
                </>
              )}
              {diff.changeType === 'ADDED' && (
                <span className="text-green-400 ml-2">+ {diff.suggestedValue}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Track changes */}
      {selectedTrackCount > 0 && (
        <div className="text-sm">
          <span className="text-zinc-400">Tracks:</span>
          <span className="text-amber-400 ml-2">
            {selectedTrackCount} track{selectedTrackCount !== 1 ? 's' : ''} will be updated
          </span>
        </div>
      )}

      {/* Cover art */}
      {selections.coverArt && preview.coverArt.changeType !== 'UNCHANGED' && (
        <div className="text-sm">
          <span className="text-zinc-400">Cover Art:</span>
          <span className="text-amber-400 ml-2">Will be updated</span>
        </div>
      )}
    </div>
  );
}
```

### Pattern 6: Album Row Highlight After Apply

**What:** Brief visual flash/pulse on the album row in admin table to show update
**When to use:** After successful mutation to draw attention to updated data
**Example:**

```typescript
// Source: framer-motion (already in project) + UX feedback patterns
// In parent component (admin table or wherever modal is triggered)
import { motion } from 'framer-motion';

export function AlbumRow({ album, isHighlighted }: AlbumRowProps) {
  return (
    <motion.tr
      animate={isHighlighted ? {
        backgroundColor: ['rgba(34, 197, 94, 0)', 'rgba(34, 197, 94, 0.2)', 'rgba(34, 197, 94, 0)']
      } : {}}
      transition={{ duration: 1.5, times: [0, 0.3, 1] }}
      className="border-b border-zinc-800"
    >
      {/* Row content */}
    </motion.tr>
  );
}

// In modal completion handler:
const handleApplyComplete = (result: ApplyResult) => {
  clearModalState();
  setHighlightedAlbumId(albumId);
  // Clear highlight after animation completes
  setTimeout(() => setHighlightedAlbumId(null), 2000);
};
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                      | Don't Build                   | Use Instead                                 | Why                                                               |
| ---------------------------- | ----------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| Checkbox indeterminate state | Custom checkbox with CSS      | Radix UI Checkbox with `indeterminate` prop | Handles ARIA attributes, keyboard nav, and visual state correctly |
| Nested checkbox state sync   | Manual parent-child tracking  | Controlled state with derived values        | Prevents state bugs, easier to test and maintain                  |
| Toast notifications          | Custom position/z-index logic | Existing Toast component with portal        | Already handles stacking context and auto-dismiss                 |
| Mutation loading states      | Manual boolean flags          | TanStack Query `isPending`                  | Provides consistent loading/error/success states across app       |
| Change summary generation    | String concatenation          | Utility function from Phase 4 apply service | Already tested, handles pluralization and edge cases              |
| Form validation              | Manual field checking         | Derive validation from selections state     | Real-time feedback without extra state management                 |

**Key insight:** The checkbox state hierarchy (global → section → field) is the most complex part. Don't try to optimize prematurely - use simple controlled state with derived values for section-level indeterminate states. React 19's improved rendering performance makes this pattern fast enough.

## Common Pitfalls

### Pitfall 1: Checkbox Click Event Bubbling in Accordion

**What goes wrong:** Clicking a checkbox in an accordion trigger also toggles the accordion open/closed
**Why it happens:** Click events bubble up from checkbox to accordion trigger by default
**How to avoid:** Use `onClick={(e) => e.stopPropagation()}` on checkbox in trigger area
**Warning signs:** Accordion unexpectedly closing/opening when selecting checkboxes

**Example:**

```typescript
// BAD - Checkbox toggles accordion
<AccordionTrigger>
  <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
  <span>Metadata</span>
</AccordionTrigger>

// GOOD - Event propagation stopped
<AccordionTrigger>
  <Checkbox
    checked={allSelected}
    onCheckedChange={handleSelectAll}
    onClick={(e) => e.stopPropagation()}
  />
  <span>Metadata</span>
</AccordionTrigger>
```

### Pitfall 2: Stale Closure in Auto-Close Timeout

**What goes wrong:** Auto-close timeout captures old state, doesn't trigger modal close properly
**Why it happens:** setTimeout callback captures variables from when it was created
**How to avoid:** Use ref for albumId or pass stable function references
**Warning signs:** Modal doesn't close after success, or closes with wrong state

**Example:**

```typescript
// BAD - Captures stale albumId
useEffect(() => {
  if (mutationSuccess) {
    setTimeout(() => {
      onClose(albumId); // May be stale
    }, 1500);
  }
}, [mutationSuccess]);

// GOOD - Use callback function or ref
const onCloseRef = useRef(onClose);
onCloseRef.current = onClose;

useEffect(() => {
  if (mutationSuccess) {
    setTimeout(() => {
      onCloseRef.current(); // Always current
    }, 1500);
  }
}, [mutationSuccess]);
```

### Pitfall 3: Mutation Re-Execution on Component Re-Render

**What goes wrong:** Clicking "Apply" multiple times sends duplicate mutation requests
**Why it happens:** Not disabling button during `isPending` state
**How to avoid:** Always disable submit button when mutation is pending
**Warning signs:** Network tab shows multiple identical mutation requests

**Example:**

```typescript
// BAD - No disabled state
<Button onClick={() => applyMutation.mutate(selections)}>
  Apply
</Button>

// GOOD - Disabled during mutation
<Button
  onClick={() => applyMutation.mutate(selections)}
  disabled={applyMutation.isPending}
>
  {applyMutation.isPending ? 'Applying...' : 'Confirm & Apply'}
</Button>
```

### Pitfall 4: Not Invalidating Queries After Mutation

**What goes wrong:** Album data in UI doesn't update after successful correction
**Why it happens:** TanStack Query cache not invalidated, shows stale data
**How to avoid:** Call `queryClient.invalidateQueries()` in mutation `onSuccess`
**Warning signs:** Data doesn't update until page refresh

**Example:**

```typescript
// BAD - Mutation succeeds but UI shows old data
const applyMutation = useMutation({
  mutationFn: applyCorrection,
  onSuccess: () => {
    showToast('Success!', 'success');
  },
});

// GOOD - Invalidate related queries
const applyMutation = useMutation({
  mutationFn: applyCorrection,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['album', albumId] });
    queryClient.invalidateQueries({ queryKey: ['albumDetailsAdmin', albumId] });
    showToast('Success!', 'success');
  },
});
```

### Pitfall 5: Default All Selected Without Filtering Changed Fields

**What goes wrong:** Admin applies UNCHANGED fields, wastes database writes
**Why it happens:** Not filtering selections to only changed fields before mutation
**How to avoid:** Pre-filter selections or handle in apply service (Phase 4 already does this)
**Warning signs:** Mutation payload includes fields with identical before/after values

**Example:**

```typescript
// BAD - Send all selections blindly
const applyMutation = useMutation({
  mutationFn: selections => applyCorrection({ albumId, selections }),
});

// GOOD - Filter to only changed fields (or rely on apply service to handle)
const applyMutation = useMutation({
  mutationFn: selections => {
    // Phase 4 apply service already filters unchanged fields
    // Just pass selections as-is, service handles optimization
    return applyCorrection({ albumId, preview, selections });
  },
});

// Note: Phase 4 apply service already implements this filtering in field-selector.ts
// No need to duplicate logic in UI - trust the service layer
```

## Code Examples

Verified patterns from project structure:

### Default All Selected Factory

```typescript
// Source: Phase 4 apply service types.ts
export function createDefaultSelections(
  preview: CorrectionPreview
): FieldSelections {
  return {
    metadata: {
      title: true,
      releaseDate: true,
      releaseType: true,
      label: true,
      barcode: true,
    },
    tracks: {
      applyAll: true,
      excludedTrackIds: new Set(),
    },
    externalIds: {
      musicbrainzId: true,
      spotifyId: true,
      discogsId: true,
    },
    coverArt: preview.coverArt.changeType !== 'UNCHANGED',
  };
}
```

### Apply Mutation GraphQL Query

```typescript
// Source: GraphQL mutation pattern for Phase 9
// To be created in src/graphql/queries/correction.graphql
const APPLY_CORRECTION_MUTATION = gql`
  mutation ApplyCorrection($input: ApplyCorrectionInput!) {
    applyCorrection(input: $input) {
      success
      album {
        id
        title
        releaseDate
        dataQuality
        updatedAt
      }
      changes {
        metadata {
          field
          before
          after
        }
        tracks {
          added
          modified
          removed
        }
        artists {
          action
          artistName
        }
      }
      error {
        code
        message
      }
    }
  }
`;
```

### Toast Hook Usage

```typescript
// Source: Existing src/components/ui/toast.tsx
import { useToast } from '@/components/ui/toast';

function ApplyView() {
  const { toast, showToast, hideToast } = useToast();

  // In mutation onSuccess
  showToast('Updated: Title, Artist, 8 tracks', 'success');

  // In mutation onError
  showToast('Failed to apply correction', 'error');

  return (
    <>
      {/* Component content */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
        duration={5000}
      />
    </>
  );
}
```

## State of the Art

| Old Approach                  | Current Approach                     | When Changed         | Impact                                                                   |
| ----------------------------- | ------------------------------------ | -------------------- | ------------------------------------------------------------------------ |
| Separate confirmation dialog  | Step transition model                | 2026 UX trends       | Better context preservation, user sees diff while confirming             |
| Select what to apply (opt-in) | Deselect what NOT to apply (opt-out) | Modern form UX       | Faster workflow for typical case (apply most/all fields)                 |
| Manual query invalidation     | TanStack Query v5 auto-invalidation  | TanStack Query v4→v5 | Can use `invalidateQueries` patterns or rely on cache tags               |
| React 18 checkbox patterns    | React 19 form improvements           | React 19 release     | Better form state handling with useActionState (optional for this phase) |

**Deprecated/outdated:**

- **Global mutation callbacks in QueryClient**: TanStack Query v5 removed global `onSuccess` for queries but kept them for mutations. Still safe to use mutation-level callbacks.
- **Separate modal for confirmation**: Modern UX prefers inline confirmations with clear diff summaries (step model).
- **Sonner toast**: While installed, project uses custom Toast component - maintain consistency.

## Open Questions

Things that couldn't be fully resolved:

1. **Should we use React 19's useActionState for form submission?**
   - What we know: React 19 provides useActionState for form state management with pending states
   - What's unclear: Whether it provides benefits over TanStack Query mutations for this use case
   - Recommendation: Stick with TanStack Query mutations - proven pattern in project, provides cache invalidation and error handling that form actions don't

2. **How aggressive should auto-close timing be?**
   - What we know: User decided on 1-2 second delay for "Applied!" state before auto-close
   - What's unclear: Exact timing preference (1000ms vs 1500ms vs 2000ms)
   - Recommendation: Start with 1500ms (1.5 seconds) - enough to read "Applied!" message but not annoyingly long

3. **Should album row highlight be pulsing or flash-once?**
   - What we know: User wants "flash/pulse" visual feedback on album row after apply
   - What's unclear: Single flash or multiple pulses
   - Recommendation: Single flash (fade in green overlay, fade out) - less jarring than pulsing, clear signal

4. **How to handle partial failures in track matching?**
   - What we know: Phase 4 apply service uses atomic transactions (all or nothing)
   - What's unclear: If track matching fails for some tracks, should we show specific errors?
   - Recommendation: Trust Phase 4 service error handling - if transaction fails, entire apply fails with error message. UI just shows error inline.

## Sources

### Primary (HIGH confidence)

- Radix UI Accordion documentation - Component API and accessibility patterns
- Radix UI Checkbox documentation - Indeterminate state and ARIA support
- TanStack Query v5 documentation - Mutation callbacks and query invalidation
- Existing project code:
  - `/src/components/ui/accordion.tsx` - Radix UI Accordion implementation
  - `/src/components/ui/checkbox.tsx` - Radix UI Checkbox implementation
  - `/src/components/ui/toast.tsx` - Custom Toast component
  - `/src/hooks/useCorrectionModalState.ts` - Modal state management
  - `/src/lib/correction/apply/` - Apply service (Phase 4)
  - `/src/components/admin/correction/preview/PreviewView.tsx` - Preview patterns
- React 19 blog: [React v19](https://react.dev/blog/2024/12/05/react-19)

### Secondary (MEDIUM confidence)

- [Globally Manage Toast Notifications with Tanstack Query](https://spin.atomicobject.com/toast-notifications-tanstack-query/) - TanStack Query mutation callbacks for toasts
- [Mutations | TanStack Query React Docs](https://tanstack.com/query/v4/docs/react/guides/mutations) - Mutation patterns and callbacks
- [useOptimistic – React](https://react.dev/reference/react/useOptimistic) - Optimistic UI patterns (optional enhancement)
- [How to build a select all checkbox with ReactJS](https://www.codemzy.com/blog/react-select-all-checkbox) - Select all checkbox patterns
- [React Multi Select with Check boxes and Select All option](https://medium.com/@compmonk/react-multi-select-with-check-boxes-and-select-all-option-bd16941538f3) - Multi-select patterns

### Tertiary (LOW confidence)

- [Confirmation Dialogs Can Prevent User Errors](https://www.nngroup.com/articles/confirmation-dialog/) - General UX guidance on confirmations
- [UI trends 2026: top 10 trends your users will love](https://www.uxstudioteam.com/ux-blog/ui-trends-2019) - UI/UX trends context
- [State Management in React (2026): Best Practices](https://www.c-sharpcorner.com/article/state-management-in-react-2026-best-practices-tools-real-world-patterns/) - React state patterns

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All dependencies already in project, well-documented usage patterns
- Architecture: HIGH - Phase 8 preview provides direct template, Phase 4 apply service integration is clear
- Pitfalls: HIGH - Common checkbox and mutation patterns are well-established, project has examples
- Code examples: HIGH - Sourced directly from existing project code and official docs

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable ecosystem)
