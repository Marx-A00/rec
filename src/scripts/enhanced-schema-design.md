# Enhanced Multi-Source Schema Design

## Core Concept: Source-First, Enrichment-Optional

Instead of assuming everything can be enriched, we start with the source and try to enrich when possible.

## Proposed Schema Changes

### 1. Add Source Enum

```prisma
enum ContentSource {
  YOUTUBE
  BANDCAMP
  SOUNDCLOUD
  SPOTIFY
  APPLE_MUSIC
  DISCOGS
  MUSICBRAINZ
  USER_SUBMITTED  // For when user just types in text
  UNKNOWN
}
```

### 2. Add Enrichment Status Enum

```prisma
enum EnrichmentStatus {
  NOT_ATTEMPTED    // Fresh user submission
  IN_PROGRESS     // Currently being enriched
  ENRICHED        // Successfully enriched with metadata
  FAILED          // Attempted but couldn't enrich
  NOT_ENRICHABLE  // Determined to be impossible to enrich
  MANUAL_OVERRIDE // User said "don't enrich this"
}
```

### 3. Enhanced Album Model

```prisma
model Album {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

  // Source tracking
  primarySource   ContentSource     @default(USER_SUBMITTED)
  sourceUrl       String?           // Original YouTube/Bandcamp/etc URL
  sourceId        String?           // Platform-specific ID

  // Enrichment tracking
  enrichmentStatus EnrichmentStatus @default(NOT_ATTEMPTED)
  enrichmentAttempts Int             @default(0)
  lastEnrichmentAttempt DateTime?

  // Core data (may be incomplete for user submissions)
  title           String
  releaseDate     DateTime?         // Optional - user might not know
  releaseYear     Int?             // Optional - user might not know
  imageUrl        String?          // Optional - might not have cover art

  // External platform IDs (filled during enrichment)
  musicbrainzId   String?   @unique @map("musicbrainz_id") @db.Uuid
  discogsId       String?   @map("discogs_id") @db.VarChar(20)
  spotifyId       String?   @unique @map("spotify_id") @db.VarChar(50)
  youtubeId       String?   @map("youtube_id") @db.VarChar(50)
  bandcampId      String?   @map("bandcamp_id") @db.VarChar(100)

  // Rich metadata (filled during enrichment, optional)
  description     String?   @db.Text
  genre           String[]  @default([])
  recordLabel     String?
  releaseType     String?   // album, EP, single, compilation
  trackCount      Int?
  duration        Int?      // Total duration in seconds

  // Relationships
  artists         AlbumArtist[]
  tracks          Track[]
  collectionAlbums CollectionAlbum[]

  @@index([primarySource])
  @@index([enrichmentStatus])
  @@index([sourceUrl])
  @@map("albums")
}
```

### 4. Enhanced Track Model

```prisma
model Track {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  albumId         String   @map("album_id") @db.Uuid

  // Source tracking
  primarySource   ContentSource     @default(USER_SUBMITTED)
  sourceUrl       String?           // Direct YouTube/Bandcamp track URL
  sourceId        String?           // Platform-specific ID

  // Enrichment tracking
  enrichmentStatus EnrichmentStatus @default(NOT_ATTEMPTED)
  enrichmentAttempts Int             @default(0)
  lastEnrichmentAttempt DateTime?

  // Core data (may be incomplete)
  title           String
  trackNumber     Int?             // Optional - user might not know
  discNumber      Int?             @default(1)
  duration        Int?             // In seconds, optional

  // External platform IDs (filled during enrichment)
  musicbrainzId   String?   @unique @map("musicbrainz_id") @db.Uuid
  spotifyId       String?   @unique @map("spotify_id") @db.VarChar(50)
  youtubeId       String?   @map("youtube_id") @db.VarChar(50)
  isrc            String?   @unique @db.VarChar(12)

  // Rich metadata (filled during enrichment, optional)
  lyrics          String?   @db.Text
  explicitContent Boolean?

  // Audio analysis (filled during enrichment, optional)
  bpm             Float?
  key             Int?      @map("key_signature") // 0-11 musical key
  mode            Int?      // 0=minor, 1=major
  timeSignature   Int?      @map("time_signature") // beats per bar

  // Relationships
  album           Album     @relation(fields: [albumId], references: [id], onDelete: Cascade)
  artists         TrackArtist[]

  @@index([albumId, discNumber, trackNumber])
  @@index([primarySource])
  @@index([enrichmentStatus])
  @@index([sourceUrl])
  @@map("tracks")
}
```

### 5. User Submission Workflow

```prisma
model UserSubmission {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String   @map("user_id")
  submissionType  String   // 'album', 'track', 'artist'

  // Raw user input
  sourceUrl       String?           // YouTube/Bandcamp/etc URL they provided
  title           String
  artist          String?
  album           String?           // For track submissions
  additionalInfo  Json?             // Any extra info they provided

  // Processing status
  status          String   @default("pending") // pending, processed, failed
  processedAt     DateTime?

  // Results (if successfully processed)
  createdAlbumId  String?  @db.Uuid
  createdTrackId  String?  @db.Uuid
  createdArtistId String?  @db.Uuid

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
  @@map("user_submissions")
}
```

## Migration Strategy Changes

With this new design, we need to decide:

1. **Current Discogs Data**: Mark as `ContentSource.DISCOGS` and `EnrichmentStatus.ENRICHED`
2. **Future Submissions**: Start as `ContentSource.USER_SUBMITTED` and `EnrichmentStatus.NOT_ATTEMPTED`

## Benefits

1. **Flexible**: Supports any source (YouTube, Bandcamp, user text)
2. **Progressive**: Items can be enriched over time
3. **Realistic**: Acknowledges some content can't be enriched
4. **User-friendly**: Users can add anything, even if incomplete
5. **Trackable**: Clear visibility into what's enriched vs. raw

## User Experience

- User pastes YouTube link → System extracts basic info → Tries to enrich
- User types "Some random band - Cool song" → Creates minimal record → Tries to enrich later
- User adds Bandcamp album → Rich initial data → Still tries MusicBrainz enrichment for completeness

Would you like me to:

1. Design the migration script to accommodate this new schema?
2. Create the enhanced Prisma schema file?
3. Think through the enrichment pipeline architecture?
