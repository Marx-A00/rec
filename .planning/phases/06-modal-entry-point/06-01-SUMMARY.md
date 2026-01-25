---
phase: 06-modal-entry-point
plan: 01
subsystem: admin-ui
tags: [modal, wizard, session-storage, radix-ui]

dependency_graph:
  requires:
    - "05-03: GraphQL client operations for correction workflow"
  provides:
    - "CorrectionModal shell with 3-step navigation"
    - "StepIndicator for wizard progress"
    - "useCorrectionModalState for session persistence"
  affects:
    - "06-02: Modal will integrate CurrentDataView"
    - "06-03: Modal will integrate SearchView and ApplyView"

tech_stack:
  added:
    - "@radix-ui/react-accordion"
  patterns:
    - "Session storage persistence per entity ID"
    - "Multi-step wizard with free navigation"
    - "Controlled modal with external open state"

key_files:
  created:
    - src/components/ui/accordion.tsx
    - src/components/admin/correction/CorrectionModal.tsx
    - src/components/admin/correction/StepIndicator.tsx
    - src/hooks/useCorrectionModalState.ts
  modified: []

decisions:
  - id: modal-width
    choice: "1100px max-width for modal"
    rationale: "Accommodates side-by-side comparison layout in preview step"
  - id: session-storage-key
    choice: "correction-modal-state-{albumId} key pattern"
    rationale: "Per-album persistence so multiple corrections can be in progress"
  - id: free-navigation
    choice: "All steps clickable, not locked progression"
    rationale: "Admin power users need to jump between steps quickly"

metrics:
  duration: "2.1min"
  completed: "2026-01-25"
---

# Phase 06 Plan 01: Modal Shell and Step Navigation Summary

**One-liner:** CorrectionModal shell with 3-step wizard, StepIndicator progress UI, and sessionStorage state persistence per album.

## What Was Built

This plan establishes the modal container and navigation infrastructure for the correction wizard.

**Components:**

- **CorrectionModal** - Dialog-based modal using shadcn/radix-ui Dialog primitive
  - 1100px max width to fit comparison layouts
  - 90vh max height with overflow scroll
  - Integrates step navigation and state management
  - Footer with Cancel/Back/Next/Apply buttons

- **StepIndicator** - Horizontal progress indicator
  - 3 numbered circles with connecting lines
  - Visual states: current (filled), completed (tinted), pending (border)
  - All steps clickable for free navigation
  - Responsive: labels hidden on small screens

**Hooks:**

- **useCorrectionModalState** - Session storage persistence
  - Key pattern: `correction-modal-state-{albumId}`
  - Provides: currentStep, setCurrentStep, nextStep, prevStep, clearState
  - Convenience flags: isFirstStep, isLastStep

**Primitives:**

- Installed shadcn accordion for future collapsible sections in step views

## Commits

- `773cd00` - feat(06-01): install accordion and create session state hook
- `bcd3db4` - feat(06-01): create StepIndicator component
- `bd6950e` - feat(06-01): create CorrectionModal shell with step navigation

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

**For Plan 06-02 (CurrentDataView):**
- Will replace step 0 placeholder div
- Will receive albumId from modal props

**For Plan 06-03 (SearchView/ApplyView):**
- Will replace step 1 and 2 placeholder divs
- Apply button will be enabled with mutation binding

## Next Phase Readiness

Phase 06-02 can proceed immediately. The modal shell is ready for content integration.

**Blockers:** None
**Concerns:** None
