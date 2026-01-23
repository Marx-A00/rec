# Feature Research: Admin Data Correction

**Domain:** Admin metadata correction tools for music applications
**Researched:** 2026-01-23
**Confidence:** HIGH (based on established patterns from MusicBrainz Picard, admin panel UX literature, and data enrichment tools)

## Feature Landscape

### Table Stakes (Users Expect These)

Features admins assume exist. Missing these = correction workflow feels incomplete or risky.

**Search & Discovery**

- **Search external source by query**
  - Why Expected: Core workflow starts with finding correct data
  - Complexity: LOW (MusicBrainz API already integrated)
  - Notes: Support album title, artist name, release year queries

- **Search result confidence/match scores**
  - Why Expected: MusicBrainz Picard shows match percentages; admins need to evaluate which result is correct
  - Complexity: LOW (MusicBrainz returns scores)
  - Notes: Display score prominently (e.g., "95% match")

- **Multiple search results displayed**
  - Why Expected: First result isn't always correct; need to compare options
  - Complexity: LOW
  - Notes: Show 5-10 results with key differentiators visible

**Preview & Comparison**

- **Side-by-side data comparison (current vs. source)**
  - Why Expected: Standard pattern in MusicBrainz Picard ("Original Values" vs "New Values" panes); essential for confident corrections
  - Complexity: MEDIUM
  - Notes: Two-column layout with aligned fields

- **Changed fields visually highlighted**
  - Why Expected: AudioRanger, Picard, and every diff tool highlights changes; reduces cognitive load
  - Complexity: LOW
  - Notes: Use color coding (green=addition, yellow=modification, red=deletion)

- **Track listing preview**
  - Why Expected: Tracks are crucial for album identity; need to verify before applying
  - Complexity: LOW
  - Notes: Show track count, names, durations from source

**Application & Confirmation**

- **Field selection before apply**
  - Why Expected: Sometimes only want specific fields (e.g., fix artist name but keep existing cover art)
  - Complexity: MEDIUM
  - Notes: Checkbox per field group or individual field

- **Confirmation step before apply**
  - Why Expected: Bulk editing UX pattern—always confirm before irreversible changes
  - Complexity: LOW
  - Notes: Summary of what will change

- **Atomic corrections (all-or-nothing)**
  - Why Expected: Partial updates create inconsistent state; database integrity expectation
  - Complexity: MEDIUM (transaction handling)
  - Notes: Use Prisma transactions

**Audit & Safety**

- **Correction logging (who, what, when)**
  - Why Expected: Standard for admin tools; compliance/debugging requirement
  - Complexity: LOW (leverage existing enrichment_logs)
  - Notes: Store admin ID, timestamp, before/after values

- **Error feedback when correction fails**
  - Why Expected: Bulk action UX principle—explain failures, not just "error occurred"
  - Complexity: LOW
  - Notes: Show specific field or API error

### Differentiators (Competitive Advantage)

Features that make this correction tool notably better than alternatives. Not required, but valuable.

**Speed & Efficiency**

- **Manual field editing without search**
  - Value Proposition: Quick typo fixes (e.g., "Mama Cass*" to "Mama Cass") without full MusicBrainz lookup
  - Complexity: LOW
  - Notes: Inline edit mode bypasses search workflow entirely

- **One-click re-enrichment trigger**
  - Value Proposition: After manual ID fix, immediately queue full enrichment; eliminates second admin action
  - Complexity: LOW (BullMQ already exists)
  - Notes: Optional checkbox on apply confirmation

- **Recent corrections quick-access**
  - Value Proposition: See what was just fixed; catch mistakes quickly
  - Complexity: LOW
  - Notes: "Last 10 corrections" in sidebar or dropdown

**Smart Matching**

- **Artist auto-linking when correcting album**
  - Value Proposition: Album correction often reveals correct artist; update relationship automatically
  - Complexity: MEDIUM
  - Notes: Detect if source artist differs, offer to update

- **External ID validation**
  - Value Proposition: Catch invalid MBIDs before saving (format check + optional API verification)
  - Complexity: LOW
  - Notes: UUID format validation at minimum

**UX Refinements**

- **Keyboard shortcuts for power users**
  - Value Proposition: Admins correcting many albums work faster with shortcuts (Enter to apply, Esc to cancel)
  - Complexity: LOW
  - Notes: Document shortcuts in UI

- **Persisted search across modal close**
  - Value Proposition: Accidentally close modal? Don't lose search results
  - Complexity: LOW (session state)
  - Notes: Store in React state or sessionStorage

- **Copy values between current/source**
  - Value Proposition: Sometimes current has better data for one field; cherry-pick from both sides
  - Complexity: LOW
  - Notes: Click-to-copy button per field

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems or are explicitly out of scope.

**Auto-Suggestion Without User Action**

- Why Requested: "System should automatically find fixes for problem albums"
- Why Problematic: 
  - False positives damage trust (wrong album applied automatically)
  - MusicBrainz matching isn't 100% accurate
  - Creates background noise admins must review anyway
- Alternative: Surface problem albums in existing admin views; manual search when admin decides to fix

**Bulk Correction Queue**

- Why Requested: "Fix 100 albums at once instead of one by one"
- Why Problematic:
  - Each album needs human verification for correct match
  - Bulk mistakes are harder to undo
  - Rate limits make bulk operations slow anyway (1 req/sec)
  - Increases complexity significantly (queue UI, progress tracking, partial failure handling)
- Alternative: Fast single-item workflow (<1 min per fix); bulk can come in v2 after patterns are proven

**Real-Time MusicBrainz Sync**

- Why Requested: "Keep all albums automatically updated with MusicBrainz changes"
- Why Problematic:
  - MusicBrainz data changes frequently (it's community-edited)
  - Automatic updates could overwrite intentional local customizations
  - Rate limits prohibit scanning entire library
- Alternative: On-demand correction workflow; admin decides when to sync specific album

**Multi-Source Merging (Discogs + MusicBrainz + Spotify)**

- Why Requested: "Pull best data from each source"
- Why Problematic:
  - Conflict resolution is complex (which source wins for each field?)
  - Different ID namespaces complicate matching
  - Significantly increases API complexity and UI
- Alternative: MusicBrainz-only for v1; add sources incrementally with clear precedence rules

**Undo/Rollback Corrections**

- Why Requested: "Revert a bad correction to previous state"
- Why Problematic:
  - Requires storing complete before-state (bloats audit log)
  - Re-enrichment may have already run, creating cascading state
  - "Undo" semantics unclear (undo to last state? original state?)
- Alternative: Log before/after values for debugging; bad correction = apply another correction

**User-Submitted Corrections**

- Why Requested: "Let users suggest fixes, admins approve"
- Why Problematic:
  - Requires moderation queue, spam handling, notification system
  - Quality control burden shifts to admins anyway
  - MusicBrainz itself already handles community corrections
- Alternative: Admin-only for v1; users can report issues through existing feedback channels

## Feature Dependencies

```
[Search MusicBrainz] ─────────────────────────────────────────┐
    │                                                         │
    └──requires──> [Display Search Results]                   │
                       │                                      │
                       └──requires──> [Preview Source Data]   │
                                          │                   │
                                          ├──requires──> [Side-by-Side Comparison]
                                          │                   │
                                          └──requires──> [Field Highlighting]
                                                              │
                                                              └──requires──> [Field Selection]
                                                                                 │
                                                                                 └──requires──> [Apply Correction]
                                                                                                    │
                                                                                                    └──requires──> [Correction Logging]

[Manual Field Edit] ──(independent)──> [Apply Correction]

[Apply Correction] ──enhances──> [Re-enrichment Trigger]

[Artist Correction] ──parallel to──> [Album Correction]
```

### Dependency Notes

- **Search requires MusicBrainz API**: Already exists at `/src/lib/musicbrainz/musicbrainz-service.ts`
- **Preview requires Search**: Can't preview until user selects a search result
- **Apply requires Preview**: Don't allow blind application; must see diff first
- **Logging requires Apply**: Log entry created as part of apply transaction
- **Manual Edit bypasses Search**: Independent path for typo fixes
- **Artist Correction parallels Album**: Same UI patterns, different entity type

## MVP Definition

### Launch With (v1)

Minimum viable correction workflow — validates that admins can actually fix albums faster.

- [x] **Search MusicBrainz from album modal** — Core discovery mechanism
- [x] **Display results with match scores** — Enables informed selection
- [x] **Preview full album data from result** — Shows what you'll get
- [x] **Side-by-side comparison with highlighting** — Reduces error risk
- [x] **Field selection checkboxes** — Granular control over updates
- [x] **Apply with confirmation** — Safety gate
- [x] **Atomic database update** — Data integrity
- [x] **Correction logging** — Audit trail
- [x] **Manual field editing mode** — Quick typo fixes

### Add After Validation (v1.x)

Features to add once core workflow proves useful.

- [ ] **Re-enrichment trigger** — Add when admins request it post-correction
- [ ] **Artist correction workflow** — After album workflow is solid
- [ ] **Keyboard shortcuts** — When power users emerge
- [ ] **Recent corrections view** — When correction volume justifies it

### Future Consideration (v2+)

Features to defer until correction workflow is battle-tested.

- [ ] **Bulk correction queue** — Only if single-item is too slow for real usage
- [ ] **Discogs integration** — When MusicBrainz coverage proves insufficient
- [ ] **Auto-suggestion** — Only with high confidence threshold and opt-in

## Feature Prioritization Matrix

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

**P1 - Must Have**

- Search MusicBrainz by query
  - User Value: HIGH
  - Implementation Cost: LOW
  
- Search results with match scores
  - User Value: HIGH
  - Implementation Cost: LOW

- Side-by-side preview/comparison
  - User Value: HIGH
  - Implementation Cost: MEDIUM

- Field highlighting (additions/changes)
  - User Value: HIGH
  - Implementation Cost: LOW

- Field selection before apply
  - User Value: HIGH
  - Implementation Cost: MEDIUM

- Confirmation dialog
  - User Value: MEDIUM
  - Implementation Cost: LOW

- Atomic correction application
  - User Value: HIGH
  - Implementation Cost: MEDIUM

- Correction logging
  - User Value: MEDIUM
  - Implementation Cost: LOW

- Manual field edit mode
  - User Value: HIGH
  - Implementation Cost: LOW

**P2 - Should Have**

- Re-enrichment trigger option
  - User Value: MEDIUM
  - Implementation Cost: LOW

- Artist correction workflow
  - User Value: MEDIUM
  - Implementation Cost: MEDIUM

- External ID validation
  - User Value: MEDIUM
  - Implementation Cost: LOW

- Error feedback with specifics
  - User Value: MEDIUM
  - Implementation Cost: LOW

**P3 - Nice to Have**

- Keyboard shortcuts
  - User Value: LOW
  - Implementation Cost: LOW

- Recent corrections list
  - User Value: LOW
  - Implementation Cost: LOW

- Persisted search state
  - User Value: LOW
  - Implementation Cost: LOW

## Competitor Feature Analysis

**MusicBrainz Picard (Desktop Tagger)**

- Search: Cluster files, lookup by metadata or AcoustID fingerprint
- Preview: Bottom pane shows "Original Values" vs "New Values"
- Apply: Save button writes tags; files turn green when saved
- Our Approach: Similar two-pane preview; web-based instead of desktop

**Mp3tag (Desktop Tagger)**

- Search: Web source lookups (Discogs, MusicBrainz)
- Preview: Tag panel shows current vs. fetched values
- Bulk: Can tag multiple files at once
- Our Approach: Single-album focus for v1; explicit scope control

**Roon (Music Player)**

- Search: Identify album against metadata sources
- Preview: Shows matched album with confidence
- Manual Override: "Edit" mode for manual metadata changes
- Our Approach: Similar manual override capability; admin-only access

**Salesforce Data Enrichment Tools**

- Search: Lookup against enrichment providers
- Preview: Field-by-field comparison before merge
- Bulk: Enrich up to 100 records at once
- Our Approach: Skip bulk for v1; focus on atomic correctness

**Gainsight Person Merge**

- Search: Find duplicate records
- Preview: Side-by-side record comparison with dependency analysis
- Merge Types: Quick (no analysis) vs Standard (with report)
- Our Approach: Always require preview; no "quick merge" that skips review

## Sources

- [MusicBrainz Picard Quick Start](https://picard.musicbrainz.org/quick-start/) - Workflow patterns, preview interface
- [MusicBrainz Picard Metadata Workflow](https://picard-docs.musicbrainz.org/en/workflows/workflow_metadata.html) - File matching approach
- [MusicBrainz How Editing Works](https://musicbrainz.org/doc/How_Editing_Works) - Community editing patterns
- [Basis Design System - Bulk Editing](https://design.basis.com/patterns/bulk-editing) - Bulk action UX patterns
- [Eleken - Bulk Action UX Guidelines](https://www.eleken.co/blog-posts/bulk-actions-ux) - Confirmation, undo, error handling
- [UX Movement - Bulk Edit Data Tables](https://uxmovement.substack.com/p/the-best-bulk-edit-ui-for-data-tables) - Selection and edit patterns
- [NN/g - Comparison Tables](https://www.nngroup.com/articles/comparison-tables/) - Side-by-side UX principles
- [HubSpot Data Enrichment](https://knowledge.hubspot.com/records/get-started-with-data-enrichment) - Field update rules
- [Gainsight Manual Person Merge](https://support.gainsight.com/gainsight_nxt/People_Management/Admin_Guides/Manual_Person_Merge) - Merge workflow patterns
- [Admin Dashboard UX Best Practices 2025](https://medium.com/@CarlosSmith24/admin-dashboard-ui-ux-best-practices-for-2025-8bdc6090c57d) - General admin panel patterns

---
*Feature research for: Admin Album Data Correction*
*Researched: 2026-01-23*
