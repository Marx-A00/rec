---
phase: 04-apply-service
plan: 03
subsystem: correction-service
tags: [prisma, transaction, audit, data-quality, atomic-update]
dependency-graph:
  requires: ['04-01', '04-02']
  provides:
    ['ApplyCorrectionService', 'applyCorrectionService', 'calculateDataQuality']
  affects: ['05-graphql-resolver', '08-admin-ui']
tech-stack:
  added: []
  patterns:
    [
      'interactive-transaction',
      'optimistic-locking',
      'singleton-pattern',
      'audit-logging',
    ]
files:
  created:
    - src/lib/correction/apply/data-quality-calculator.ts
    - src/lib/correction/apply/apply-service.ts
  modified:
    - src/lib/correction/apply/index.ts
    - src/lib/correction/index.ts
decisions:
  - id: 'data-quality-admin-high'
    choice: 'Admin corrections always return HIGH data quality'
    rationale: 'Admin-verified = highest confidence, no scoring needed'
  - id: 'audit-outside-transaction'
    choice: 'Audit logging happens AFTER transaction succeeds'
    rationale: 'Logging failure should not roll back a successful correction'
  - id: 'serializable-isolation'
    choice: 'Use Serializable isolation level for transactions'
    rationale: 'Strongest isolation prevents concurrent modification edge cases'
metrics:
  duration: 6min
  completed: 2026-01-24
---

# Phase 04 Plan 03: Apply Service Implementation Summary

ApplyCorrectionService with Prisma interactive transactions, optimistic locking, audit logging, and data quality updates.

## What Was Built

**1. Data Quality Calculator (`data-quality-calculator.ts`)**

- `DataQualityFactors` type with field presence booleans
- `calculateDataQuality()` - admin corrections return HIGH, others use weighted scoring
- `buildQualityFactors()` - extracts factors from album with relations
- Weighted scoring for future use (enrichment, user submissions)

**2. ApplyCorrectionService (`apply-service.ts`)**

- Core `applyCorrection()` method with three phases:
  - Pre-transaction: Fetch before-state, match tracks, prepare update data
  - Transaction: Optimistic lock check, album update, artist upsert/link, track CRUD
  - Post-transaction: Audit logging (isolated from transaction)
- `StaleDataError` for concurrent modification detection
- Error mapping: Prisma errors to ApplyErrorCode
- Singleton pattern for Next.js HMR safety

**3. Barrel Exports**

- `apply/index.ts` exports all service, types, and utilities
- `correction/index.ts` updated with full apply module exports

## Key Implementation Details

**Optimistic Locking:**

```typescript
const current = await tx.album.findUnique({
  where: { id: albumId },
  select: { updatedAt: true },
});
if (current?.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
  throw new StaleDataError('Album was modified. Refresh and retry.');
}
```

**Transaction Configuration:**

```typescript
await this.prisma.$transaction(async (tx) => { ... }, {
  timeout: 10000,  // 10s for admin operations
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable
});
```

**Audit Logging:**

- Creates `enrichmentLog` entry with `operation: 'admin_correction'`
- Captures before/after deltas for metadata, artists, tracks, cover art
- `triggeredBy: 'admin_ui'` for traceability
- Wrapped in try/catch - logging failure logs warning but doesn't fail correction

## Files Changed

**Created:**

- `src/lib/correction/apply/data-quality-calculator.ts` - Quality scoring
- `src/lib/correction/apply/apply-service.ts` - Core service

**Modified:**

- `src/lib/correction/apply/index.ts` - Added service and quality exports
- `src/lib/correction/index.ts` - Full apply module in correction barrel

## Decisions Made

- **Admin corrections = HIGH quality**: No weighted scoring for admin-verified data
- **Audit outside transaction**: Logging failure should not fail correction
- **Serializable isolation**: Strongest isolation for data integrity
- **Singleton pattern**: globalThis pattern prevents HMR recreation

## Verification Results

- [x] `pnpm type-check` passes
- [x] `pnpm lint` passes (no issues in apply module)
- [x] ApplyCorrectionService exported from @/lib/correction
- [x] Transaction uses `tx` client, not global `prisma`
- [x] Optimistic locking via expectedUpdatedAt implemented
- [x] Audit log captures before/after deltas
- [x] Data quality set to HIGH for admin corrections
- [x] Error codes mapped correctly (STALE_DATA, ALBUM_NOT_FOUND, TRANSACTION_FAILED)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

- `df1fc03`: feat(04-03): implement data quality calculator
- `800c2e7`: feat(04-03): implement ApplyCorrectionService core
- `a8fad3f`: feat(04-03): add audit logging and update barrel exports

## Next Phase Readiness

Phase 4 complete. Ready for Phase 5 (GraphQL Integration):

- `applyCorrectionService` singleton ready for resolver
- Types exported for GraphQL schema mapping
- Error codes ready for GraphQL error handling
