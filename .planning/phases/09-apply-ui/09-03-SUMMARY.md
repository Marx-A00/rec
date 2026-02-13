---
phase: 09-apply-ui
plan: 03
subsystem: correction-ui
tags: [apply-mutation, toast-feedback, auto-close, react-query]
requires: [09-02]
provides:
  - Complete apply flow (Preview → Apply → Toast → Auto-close)
  - Toast notification with change summary
  - Query invalidation for UI refresh
  - Applied! success animation
affects: []
tech-stack:
  added: []
  patterns: [mutation-callbacks, toast-notifications, auto-close-modal]
key-files:
  created: []
  modified:
    - src/hooks/useCorrectionModalState.ts
    - src/components/admin/correction/preview/PreviewView.tsx
    - src/components/admin/correction/CorrectionModal.tsx
decisions:
  - id: '09-03-01'
    what: 'Toast shows field count + track count + data quality change'
    why: 'Gives admin clear summary of what was applied'
    alternatives:
      ['Just show generic success message', 'Show detailed field list']
    trade-offs: 'Compact but informative vs verbose detail'
  - id: '09-03-02'
    what: '1.5s delay before auto-close after Applied! state'
    why: 'Gives admin time to see success animation, feels responsive not jarring'
    alternatives: ['No delay (instant close)', '2s+ delay (too slow)']
    trade-offs: '1.5s is sweet spot between confirmation and speed'
  - id: '09-03-03'
    what: 'expectedUpdatedAt from previewData.currentAlbum.updatedAt'
    why: 'Optimistic locking prevents stale data overwrites (concurrent edits)'
    alternatives: ['No version check', 'Manual timestamp comparison']
    trade-offs: 'Safety vs simpler implementation'
metrics:
  tasks: 3
  commits: 3
  duration: 7min
  completed: '2026-01-26'
---

# Phase 09 Plan 03: Apply Mutation Integration Summary

**One-liner:** Complete apply flow with toast feedback, auto-close after 1.5s, and query invalidation

## What Was Built

**Task 1: Modal state hook (4 steps + isApplied)**

- Updated step validation: 0-3 (was 0-2)
- Changed isLastStep: currentStep === 3 (was === 2)
- Added isApplied state for tracking successful application
- Added isApplied to ModalState interface for sessionStorage persistence
- Reset isApplied on albumId change or clearState

**Task 2: PreviewView with Apply button**

- Added onApplyClick prop to trigger step transition
- Added onPreviewLoaded prop to expose CorrectionPreview to parent
- Call onPreviewLoaded via useEffect when preview query succeeds
- Added "Apply This Match" button at bottom with CheckCircle icon
- Button only shown when preview data loaded and onApplyClick provided

**Task 3: CorrectionModal integration (the big one)**

Imports:

- useApplyCorrectionMutation, useQueryClient from TanStack Query
- Toast, useToast from UI components
- ApplyView, toGraphQLSelections, UIFieldSelections from apply module

State:

- previewData: CorrectionPreview | null (shared between Preview and Apply steps)
- showAppliedState: boolean (success animation trigger)
- toast state from useToast hook

Apply mutation callbacks:

- **onSuccess:**
  - Set showAppliedState = true
  - Build toast message:
    - Field count: `changes.metadata.length + changes.externalIds.length`
    - Track count: `changes.tracks.added + modified + removed`
    - Data quality: Show "LOW → HIGH" if changed
  - Format: "Updated: 3 fields, 12 tracks • Data quality: LOW → HIGH"
  - Invalidate album queries: `queryClient.invalidateQueries({ queryKey: ['album', albumId] })`
  - Auto-close after 1.5s: `setTimeout(() => { clearState(); onClose(); }, 1500)`
- **onError:** Show toast with error message

Handlers:

- handlePreviewLoaded: Store preview data when PreviewView loads
- handleApplyClick: Call nextStep() to navigate from step 2 to step 3
- handleApply: Convert selections via toGraphQLSelections, extract expectedUpdatedAt from `previewData.currentAlbum.updatedAt`, call mutation

Step 3 rendering:

- If showAppliedState: Green checkmark + "Applied!" centered
- Else: ApplyView with preview, onApply, onBack, isApplying, error

Footer buttons:

- Step 3: Show only Cancel + Back (no Next, apply is inside ApplyView)
- Step 2: Show Cancel + Back + Next (no apply button)

Toast:

- Rendered at bottom of modal with toast state from useToast

## How It Works

**Full apply flow:**

1. Admin reviews preview, clicks "Apply This Match"
2. Modal navigates to step 3 (Apply)
3. ApplyView shows field selection + diff summary
4. Admin clicks "Confirm & Apply"
5. handleApply converts selections, extracts expectedUpdatedAt, calls mutation
6. Mutation succeeds:
   - showAppliedState = true → green checkmark + "Applied!"
   - Toast shows: "Updated: 3 fields, 12 tracks • Data quality: LOW → HIGH"
   - Query invalidated (ensures data quality badge updates)
   - After 1.5s: modal closes, state cleared
7. Admin sees updated album with new data quality badge

**Error recovery:**

- If mutation fails: Toast shows error, stays on apply step
- Admin can fix selections and retry by clicking Apply again
- Error details expandable via stack trace toggle

## Key Patterns

**Toast message construction:**

```typescript
const fieldCount = changes.metadata.length + changes.externalIds.length;
const trackCount =
  changes.tracks.added + changes.tracks.modified + changes.tracks.removed;

const parts = [];
if (fieldCount > 0)
  parts.push(`${fieldCount} field${fieldCount !== 1 ? 's' : ''}`);
if (trackCount > 0)
  parts.push(`${trackCount} track${trackCount !== 1 ? 's' : ''}`);

let message = `Updated: ${parts.join(', ')}`;

if (changes.dataQualityBefore !== changes.dataQualityAfter) {
  message += ` • Data quality: ${changes.dataQualityBefore} → ${changes.dataQualityAfter}`;
}
```

**Query invalidation pattern:**

```typescript
queryClient.invalidateQueries({ queryKey: ['album', albumId] });
```

This triggers refetch of album data → UI components re-render with fresh data → data quality badge updates automatically.

**Optimistic locking:**

```typescript
const expectedUpdatedAt = previewData.currentAlbum.updatedAt;
applyMutation.mutate({
  input: {
    albumId,
    releaseGroupMbid: previewData.sourceResult.releaseGroupMbid,
    selections: graphqlSelections,
    expectedUpdatedAt, // Backend checks this matches current DB value
  },
});
```

## Testing Checklist

- [x] Step indicator shows 4 steps (Current Data, Search, Preview, Apply)
- [x] "Apply This Match" button appears in preview step
- [x] Clicking "Apply This Match" navigates to apply step
- [x] ApplyView renders with field selection and summary
- [x] Clicking "Confirm & Apply" calls mutation with correct input
- [x] Success shows "Applied!" state for 1.5s
- [x] Toast shows: "Updated: X fields, Y tracks" (+ data quality if changed)
- [x] Modal auto-closes after 1.5s
- [x] Album queries invalidated (data quality badge updates)
- [x] Error stays on apply step, shows inline error, allows retry

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 10 (Manual Edit UI) can proceed:**

- Apply flow complete and working
- Toast feedback pattern established
- Query invalidation working (UI refreshes after correction)

**APPLY-06 (Data quality UI update) satisfied:**

- Query invalidation ensures data quality indicator updates after correction
- No additional UI work needed

## Lessons Learned

**Template literal escaping in bash:**

- Using heredocs with single quotes still caused issues with ${} syntax
- Node.js script with proper escaping was most reliable
- Future complex files: consider using Node/Python instead of bash

**Toast message construction:**

- Building message from response.changes gives clear feedback
- Including data quality change is valuable (most visible benefit to admin)
- Pluralization logic (`${count} field${count !== 1 ? 's' : ''}`) keeps messages clean

**Auto-close timing:**

- 1.5s feels right - long enough to see success, short enough to not feel sluggish
- Alternative: No auto-close and require explicit "Done" click (more work for admin)

**Query invalidation is powerful:**

- Single invalidateQueries call refreshes entire album UI
- No need to manually update React Query cache
- Covers all places album data is displayed (current data view, data quality badge, etc.)
