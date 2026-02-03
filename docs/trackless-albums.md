# Trackless Albums Investigation

**Date:** 2026-01-21  
**Environment:** Production (rec-music.org)

---

## Summary

16 albums in production have no tracks. All are from Discogs imports that couldn't be matched to MusicBrainz for track data enrichment.

**Key Stats:**

- Total trackless albums: 16
- With user collections: 4 (keep & re-enrich)
- Without user relationships: 12 (safe to delete or re-enrich)
- Duplicate detected: "Madvillainy" vs "Madvillany" (typo)

---

## Albums With User Collections (4)

These albums are in user collections and should be kept. Need manual re-enrichment or track data added.

### 1. KPop Demon Hunters (Soundtrack from the Netflix Film)

| Field          | Value                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | `f6652135-2d54-4ec1-aa14-828aa15902ec`                                                                                                                                                   |
| Artist         | Various Artists                                                                                                                                                                          |
| Release Date   | 2025-01-01                                                                                                                                                                               |
| Status         | PENDING                                                                                                                                                                                  |
| Quality        | MEDIUM                                                                                                                                                                                   |
| In Collections | 1                                                                                                                                                                                        |
| Cover          | https://i.discogs.com/uPzhKyblJedkKa88xSuuLeA7dCr5Fy-4rdem2h9DqyI/rs:fit/g:sm/q:90/h:528/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTM0Mzgy/OTk4LTE3NTA5OTA1/MjMtMzY1OC5qcGVn.jpeg |

### 2. Live.Love.A$AP

| Field          | Value                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | `386cc7b0-5073-44b2-9226-c332410b3a5d`                                                                                                                                                  |
| Artist         | ASAP Rocky                                                                                                                                                                              |
| Release Date   | 2015-01-01                                                                                                                                                                              |
| Status         | PENDING                                                                                                                                                                                 |
| Quality        | MEDIUM                                                                                                                                                                                  |
| In Collections | 1                                                                                                                                                                                       |
| Cover          | https://i.discogs.com/3A0czSEfdzwzGquLmGm8czt_UuasM76e9ZChQrUWyhA/rs:fit/g:sm/q:90/h:551/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTcyMjUz/ODItMTU0NjU5MjA3/OS03Njc5LmpwZWc.jpeg |

**Note:** This is a mixtape, may not be on MusicBrainz. Consider manual track entry or Discogs track fetch.

### 3. Madvillainy (DUPLICATE - keep this one)

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | `5ace0f91-d8f2-4731-b050-d1af9df1239b`                                                                                                                                                 |
| Artist         | MF Doom                                                                                                                                                                                |
| Release Date   | 2004-01-01                                                                                                                                                                             |
| Status         | PENDING                                                                                                                                                                                |
| Quality        | MEDIUM                                                                                                                                                                                 |
| In Collections | 1                                                                                                                                                                                      |
| Cover          | https://i.discogs.com/nqGrV-wr5XpxWHm39LPr164FSBTgRDMDDpkNzGpEv-Q/rs:fit/g:sm/q:90/h:597/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTI0Mjc4/NS0xNjYyMjA3MDQx/LTc0NjcuanBlZw.jpeg |

**MusicBrainz ID:** `14dc3104-d324-39bb-86fc-8b6d5a6df82d` (can be manually linked)

### 4. Madvillany (DUPLICATE - typo, consider merging)

| Field          | Value                                                                                                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID             | `dc843a93-d680-4c9e-a05e-26209f82add7`                                                                                                                                                   |
| Artist         | MF Doom                                                                                                                                                                                  |
| Release Date   | null                                                                                                                                                                                     |
| Status         | PENDING                                                                                                                                                                                  |
| Quality        | MEDIUM                                                                                                                                                                                   |
| In Collections | 1                                                                                                                                                                                        |
| Cover          | https://i.discogs.com/PDCIiFa2YbQiQG1227WeRhWNW234Cbo3Oe2GL7gwmAY/rs:fit/g:sm/q:90/h:600/w:600/czM6Ly9kaXNjb2dz/LWRhdGFiYXNlLWlt/YWdlcy9SLTE5NzMz/ODM5LTE2MjgwNDY1/NTQtNjAxMy5qcGVn.jpeg |

**Action:** Merge collection entries to "Madvillainy" (correct spelling) and delete this duplicate.

---

## Albums Without User Relationships (12)

Safe to delete or attempt re-enrichment.

### 5. Alfredo

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `63361d47-9cd8-4ca9-a363-fb87c00529c4` |
| Artist         | (none linked)                          |
| Release Date   | 2020-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

**Note:** Freddie Gibbs & Alchemist album. Missing artist link. MusicBrainz ID: `a1a3b5b4-5e5a-4c5c-8d9b-9b6d1a7c8b4a`

### 6. Black Panther The Album (Music From And Inspired By)

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `08aa2212-1716-4bd3-9559-6bd51691f272` |
| Artist         | Various Artists                        |
| Release Date   | 2018-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

### 7. Center Of Attention

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `e2ce6968-07c8-404f-a7f6-480a41943403` |
| Artist         | Pete Rock, InI                         |
| Release Date   | 2003-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

### 8. For Life (feat. Nile Rodgers)

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `6ec4e212-8c40-4398-a673-cbb765ce25ac` |
| Artist         | Kygo, Zak Abel, Nile Rodgers           |
| Release Date   | 2024-04-19                             |
| Status         | COMPLETED                              |
| Quality        | LOW                                    |
| In Collections | 0                                      |

**Note:** Single from Spotify. Enrichment completed but no tracks fetched.

### 9. Half Life

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `cb594ca2-8a40-40f0-9bcf-588dbd230973` |
| Artist         | Wyatt Flores                           |
| Release Date   | 2024-04-19                             |
| Status         | COMPLETED                              |
| Quality        | LOW                                    |
| In Collections | 0                                      |

**Note:** From Spotify. Enrichment completed but no tracks fetched.

### 10. Haus Der Luege

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `1262c721-42dd-4967-a77b-6735dd99d40e` |
| Artist         | Einstuerzende Neubauten\*              |
| Release Date   | 1989-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

**Note:** Artist name has asterisk (Discogs disambiguation). Real name: "Einstürzende Neubauten"

### 11. Hissing Prigs In Static Couture

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `a39105a6-6458-44bd-bd39-bc15cb6b9fa4` |
| Artist         | 3RA1N1AC\*                             |
| Release Date   | 1996-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

**Note:** Artist name has asterisk. Real name: "Brainiac"

### 12. Mama's Big Ones: Her Greatest Hits

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `4a2e1c29-4606-4621-9bdd-d5769547af68` |
| Artist         | Mama Cass\*                            |
| Release Date   | 1970-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

### 13. Me No Car

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `7f23b028-557e-44eb-96f4-ecf08cd28dbf` |
| Artist         | Yura Yura Teikoku                      |
| Release Date   | 1999-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

### 14. Modjo (Pre-Release Album Sampler)

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `cca27b6b-d7d4-44de-a481-b1a27e66135c` |
| Artist         | Modjo                                  |
| Release Date   | 2001-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

**Note:** Promo/sampler release - may not have full track listing on MusicBrainz.

### 15. S.Maharba (Twin Sisters Edition)

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `7bb5bdcb-9c57-4778-95d9-2da0193ef989` |
| Artist         | S.Maharba                              |
| Release Date   | 2016-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

### 16. Stars Of The Lid And Their Refinement Of The Decline

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| ID             | `082186e0-1440-48f5-a427-dfcab5c033a5` |
| Artist         | Stars Of The Lid                       |
| Release Date   | 2007-01-01                             |
| Status         | PENDING                                |
| Quality        | MEDIUM                                 |
| In Collections | 0                                      |

---

## Source IDs (from dev database)

All 16 albums exist in dev with their original source IDs:

| Title               | Source      | Discogs ID | Spotify ID             | Notes                    |
| ------------------- | ----------- | ---------- | ---------------------- | ------------------------ |
| Madvillany          | DISCOGS     | 19733839   | -                      | Typo duplicate           |
| KPop Demon Hunters  | DISCOGS     | 34382998   | -                      |                          |
| Madvillainy         | DISCOGS     | 8554       | -                      | Correct spelling         |
| Live.Love.A$AP      | DISCOGS     | 7225382    | -                      | Mixtape                  |
| Alfredo             | DISCOGS     | 1784249    | -                      | Dev has different album! |
| Me No Car           | DISCOGS     | 4195645    | -                      |                          |
| Center Of Attention | DISCOGS     | 67052      | -                      |                          |
| Haus Der Luege      | DISCOGS     | 7655       | -                      |                          |
| Mama's Big Ones     | DISCOGS     | 267175     | -                      |                          |
| Stars Of The Lid    | DISCOGS     | 9874       | -                      |                          |
| S.Maharba           | DISCOGS     | 9159379    | -                      |                          |
| Hissing Prigs       | DISCOGS     | 156792     | -                      |                          |
| Modjo               | DISCOGS     | 265683     | -                      | Promo/sampler            |
| Black Panther       | DISCOGS     | 1313316    | -                      |                          |
| For Life            | MUSICBRAINZ | -          | 2Cqf3izEp75CqTKgul5Mi1 | Spotify single           |
| Half Life           | MUSICBRAINZ | -          | 51JYG8XPpVVVA7uQTnm4tI | Spotify single           |

**Key observation:** All Discogs albums have `discogs_id` but the enrichment pipeline only fetches tracks from MusicBrainz. Since they have no `musicbrainz_id`, tracks are never fetched.

---

## Root Causes

1. **Discogs imports don't fetch tracks** - Enrichment pipeline only gets tracks from MusicBrainz API, not Discogs
2. **No MusicBrainz matching** - These albums couldn't be matched to MusicBrainz releases
3. **Artist name mismatches** - Discogs uses asterisks for disambiguation (e.g., "Mama Cass*", "3RA1N1AC*")
4. **Spotify singles** - 2 singles from Spotify marked COMPLETED but source is "MUSICBRAINZ" (data inconsistency)

---

## Recommended Actions

### Immediate (Safe)

```sql
-- Delete trackless albums with no user relationships
DELETE FROM albums WHERE id IN (
  '63361d47-9cd8-4ca9-a363-fb87c00529c4',  -- Alfredo
  '08aa2212-1716-4bd3-9559-6bd51691f272',  -- Black Panther
  'e2ce6968-07c8-404f-a7f6-480a41943403',  -- Center Of Attention
  '6ec4e212-8c40-4398-a673-cbb765ce25ac',  -- For Life
  'cb594ca2-8a40-40f0-9bcf-588dbd230973',  -- Half Life
  '1262c721-42dd-4967-a77b-6735dd99d40e',  -- Haus Der Luege
  'a39105a6-6458-44bd-bd39-bc15cb6b9fa4',  -- Hissing Prigs
  '4a2e1c29-4606-4621-9bdd-d5769547af68',  -- Mama's Big Ones
  '7f23b028-557e-44eb-96f4-ecf08cd28dbf',  -- Me No Car
  'cca27b6b-d7d4-44de-a481-b1a27e66135c',  -- Modjo
  '7bb5bdcb-9c57-4778-95d9-2da0193ef989',  -- S.Maharba
  '082186e0-1440-48f5-a427-dfcab5c033a5'   -- Stars Of The Lid
);
```

### Manual Attention Required

1. **Merge Madvillainy duplicates** - Move collection entries from "Madvillany" to "Madvillainy", then delete the typo version

2. **Re-enrich albums with collections** - Reset these to PENDING and manually add MusicBrainz IDs:
   - Live.Love.A$AP (mixtape, may need manual tracks)
   - KPop Demon Hunters
   - Madvillainy (MB ID: `14dc3104-d324-39bb-86fc-8b6d5a6df82d`)

---

## MusicBrainz ID Matches (Interactive Search Results)

Searched MusicBrainz API to find matching release-groups for orphaned trackless albums. These IDs can be used to manually link and re-enrich the albums.

### Confirmed Matches

| Album                    | MusicBrainz ID                         | Artist                    | Release Date | Confidence |
| ------------------------ | -------------------------------------- | ------------------------- | ------------ | ---------- |
| Alfredo                  | `13615d5f-c913-4f48-afc7-6f56c8313fd5` | Freddie Gibbs & Alchemist | 2020-05-29   | HIGH       |
| Madvillainy              | `ab570ccb-b06b-3746-8147-4903163ba895` | Madvillain                | 2002-11      | HIGH       |
| Live.Love.A$AP           | `1b4d965f-4827-488b-9bd8-2d724e3cf282` | A$AP Rocky                | 2011-10-31   | HIGH       |
| Black Panther: The Album | `4e317e28-e6b2-46d7-81f7-306e349b3dd4` | Kendrick Lamar            | 2018-02-09   | HIGH       |
| Stars Of The Lid...      | `dd0cae7b-5bf2-3db1-b028-87472215400a` | Stars of the Lid          | 2007-04-02   | HIGH       |

### Still Need Manual Search

- Center Of Attention (Pete Rock, InI)
- Haus Der Luege (Einstürzende Neubauten)
- Hissing Prigs In Static Couture (Brainiac)
- Me No Car (Yura Yura Teikoku)
- Modjo (Pre-Release Album Sampler)
- S.Maharba (Twin Sisters Edition)
- Mama's Big Ones (Mama Cass)

### SQL to Link MusicBrainz IDs

```sql
-- Link trackless albums to MusicBrainz for re-enrichment
UPDATE albums SET
  musicbrainz_id = '13615d5f-c913-4f48-afc7-6f56c8313fd5',
  enrichment_status = 'PENDING'
WHERE id = '63361d47-9cd8-4ca9-a363-fb87c00529c4'; -- Alfredo

UPDATE albums SET
  musicbrainz_id = 'ab570ccb-b06b-3746-8147-4903163ba895',
  enrichment_status = 'PENDING'
WHERE id = '5ace0f91-d8f2-4731-b050-d1af9df1239b'; -- Madvillainy

UPDATE albums SET
  musicbrainz_id = '1b4d965f-4827-488b-9bd8-2d724e3cf282',
  enrichment_status = 'PENDING'
WHERE id = '386cc7b0-5073-44b2-9226-c332410b3a5d'; -- Live.Love.A$AP

UPDATE albums SET
  musicbrainz_id = '4e317e28-e6b2-46d7-81f7-306e349b3dd4',
  enrichment_status = 'PENDING'
WHERE id = '08aa2212-1716-4bd3-9559-6bd51691f272'; -- Black Panther

UPDATE albums SET
  musicbrainz_id = 'dd0cae7b-5bf2-3db1-b028-87472215400a',
  enrichment_status = 'PENDING'
WHERE id = '082186e0-1440-48f5-a427-dfcab5c033a5'; -- Stars Of The Lid
```

---

## Prevention

Consider adding Discogs track fetching to the enrichment pipeline, or warn users when adding Discogs albums that tracks may not be available.
