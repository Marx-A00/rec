#!/usr/bin/env tsx
/**
 * Database Cleanup Orchestrator
 *
 * A beautiful CLI tool that runs all database cleanup tasks with
 * real-time progress updates using @clack/prompts.
 *
 * Usage:
 *   pnpm db:cleanup              # Run all tasks
 *   pnpm db:cleanup --dry-run    # Preview without making changes
 *   pnpm db:cleanup --task 1     # Run specific task
 *   pnpm db:cleanup --interactive # Confirm each step
 */

import { PrismaClient } from '@prisma/client';
import * as p from '@clack/prompts';
import color from 'picocolors';

import { getMusicBrainzQueue } from '@/lib/queue';
import { JOB_TYPES } from '@/lib/queue/jobs';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TaskConfig {
  id: number;
  name: string;
  description: string;
  dependencies: number[];
  priority: 'high' | 'medium' | 'low';
  run: (ctx: TaskContext) => Promise<TaskResult>;
}

interface TaskContext {
  prisma: PrismaClient;
  dryRun: boolean;
  log: (message: string) => void;
  warn: (message: string) => void;
}

interface TaskResult {
  success: boolean;
  message: string;
  stats?: Record<string, number | string | undefined>;
  warnings?: string[];
}

type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

// ═══════════════════════════════════════════════════════════════════════════
// TASK IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════

const tasks: TaskConfig[] = [
  {
    id: 1,
    name: 'Create Database Triggers',
    description: 'Add PostgreSQL triggers for automatic count sync',
    dependencies: [],
    priority: 'high',
    run: async ctx => {
      ctx.log('Checking for existing triggers...');

      const existingTriggers = await ctx.prisma.$queryRaw<{ tgname: string }[]>`
        SELECT tgname FROM pg_trigger 
        WHERE tgname IN ('user_follow_count_trigger', 'recommendation_count_trigger')
      `;

      if (existingTriggers.length > 0) {
        return {
          success: true,
          message: 'Triggers already exist',
          stats: { 'Existing triggers': existingTriggers.length },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: 'Would create 2 triggers',
          stats: { 'Triggers to create': 2 },
        };
      }

      ctx.log('Creating follower count trigger...');
      await ctx.prisma.$executeRaw`
        CREATE OR REPLACE FUNCTION update_follower_counts() RETURNS TRIGGER AS $$
        BEGIN
          IF (TG_OP = 'INSERT') THEN
            UPDATE "User" SET "followersCount" = "followersCount" + 1 WHERE id = NEW."followedId";
            UPDATE "User" SET "followingCount" = "followingCount" + 1 WHERE id = NEW."followerId";
          ELSIF (TG_OP = 'DELETE') THEN
            UPDATE "User" SET "followersCount" = GREATEST("followersCount" - 1, 0) WHERE id = OLD."followedId";
            UPDATE "User" SET "followingCount" = GREATEST("followingCount" - 1, 0) WHERE id = OLD."followerId";
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `;

      await ctx.prisma.$executeRaw`
        DROP TRIGGER IF EXISTS user_follow_count_trigger ON user_follows;
        CREATE TRIGGER user_follow_count_trigger
        AFTER INSERT OR DELETE ON user_follows
        FOR EACH ROW EXECUTE FUNCTION update_follower_counts();
      `;

      ctx.log('Creating recommendation count trigger...');
      await ctx.prisma.$executeRaw`
        CREATE OR REPLACE FUNCTION update_recommendations_count() RETURNS TRIGGER AS $$
        BEGIN
          IF (TG_OP = 'INSERT') THEN
            UPDATE "User" SET "recommendationsCount" = "recommendationsCount" + 1 WHERE id = NEW."userId";
          ELSIF (TG_OP = 'DELETE') THEN
            UPDATE "User" SET "recommendationsCount" = GREATEST("recommendationsCount" - 1, 0) WHERE id = OLD."userId";
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `;

      await ctx.prisma.$executeRaw`
        DROP TRIGGER IF EXISTS recommendation_count_trigger ON "Recommendation";
        CREATE TRIGGER recommendation_count_trigger
        AFTER INSERT OR DELETE ON "Recommendation"
        FOR EACH ROW EXECUTE FUNCTION update_recommendations_count();
      `;

      return {
        success: true,
        message: 'Created 2 database triggers',
        stats: { 'Triggers created': 2, 'Functions created': 2 },
      };
    },
  },

  {
    id: 2,
    name: 'Sync User Counts',
    description: 'Recalculate follower/following/recommendation counts',
    dependencies: [1],
    priority: 'high',
    run: async ctx => {
      ctx.log('Checking for count mismatches...');

      const followerMismatches = await ctx.prisma.$queryRaw<{ id: string }[]>`
        SELECT u.id FROM "User" u 
        LEFT JOIN user_follows f ON u.id = f."followedId" 
        GROUP BY u.id HAVING u."followersCount" != COUNT(f."followedId")
      `;

      const followingMismatches = await ctx.prisma.$queryRaw<{ id: string }[]>`
        SELECT u.id FROM "User" u 
        LEFT JOIN user_follows f ON u.id = f."followerId" 
        GROUP BY u.id HAVING u."followingCount" != COUNT(f."followerId")
      `;

      const recMismatches = await ctx.prisma.$queryRaw<{ id: string }[]>`
        SELECT u.id FROM "User" u 
        LEFT JOIN "Recommendation" r ON u.id = r."userId" 
        GROUP BY u.id HAVING u."recommendationsCount" != COUNT(r.id)
      `;

      const total =
        followerMismatches.length +
        followingMismatches.length +
        recMismatches.length;

      if (total === 0) {
        return {
          success: true,
          message: 'All counts already in sync',
          stats: { Mismatches: 0 },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would fix ${total} count mismatches`,
          stats: {
            'Follower mismatches': followerMismatches.length,
            'Following mismatches': followingMismatches.length,
            'Recommendation mismatches': recMismatches.length,
          },
        };
      }

      ctx.log('Syncing counts...');
      await ctx.prisma.$executeRaw`
        UPDATE "User" u SET 
          "followersCount" = COALESCE((SELECT COUNT(*) FROM user_follows WHERE "followedId" = u.id), 0),
          "followingCount" = COALESCE((SELECT COUNT(*) FROM user_follows WHERE "followerId" = u.id), 0),
          "recommendationsCount" = COALESCE((SELECT COUNT(*) FROM "Recommendation" WHERE "userId" = u.id), 0)
      `;

      return {
        success: true,
        message: `Fixed ${total} count mismatches`,
        stats: {
          'Follower fixes': followerMismatches.length,
          'Following fixes': followingMismatches.length,
          'Recommendation fixes': recMismatches.length,
        },
      };
    },
  },

  {
    id: 3,
    name: 'Remove Manual Count Updates',
    description: 'Code change: Remove increment/decrement from mutations',
    dependencies: [1, 2],
    priority: 'medium',
    run: async ctx => {
      ctx.log('This requires manual code changes...');

      return {
        success: true,
        message: 'Manual step - review mutations.ts',
        warnings: [
          'File: src/lib/graphql/resolvers/mutations.ts',
          'Remove count updates from followUser, unfollowUser, createRecommendation, deleteRecommendation',
          'Triggers now handle count updates automatically',
        ],
      };
    },
  },

  {
    id: 4,
    name: 'Fix Album Genre Enrichment',
    description: 'Debug enrichment pipeline to capture genres',
    dependencies: [],
    priority: 'high',
    run: async ctx => {
      ctx.log('Checking albums without genres...');

      const withoutGenres = await ctx.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM albums 
        WHERE musicbrainz_id IS NOT NULL 
        AND (genres IS NULL OR array_length(genres, 1) IS NULL)
      `;

      const withGenres = await ctx.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM albums WHERE array_length(genres, 1) > 0
      `;

      return {
        success: true,
        message: 'Analysis complete - code changes needed',
        stats: {
          'Albums with genres': Number(withGenres[0]?.count || 0),
          'Albums missing genres': Number(withoutGenres[0]?.count || 0),
        },
        warnings: [
          'Check src/lib/musicbrainz/enrichment-logic.ts',
          'Ensure API calls include ?inc=tags',
        ],
      };
    },
  },

  {
    id: 5,
    name: 'Process Pending DISCOGS Albums',
    description: 'Mark DISCOGS albums as completed',
    dependencies: [4],
    priority: 'medium',
    run: async ctx => {
      ctx.log('Finding pending DISCOGS albums...');

      const pending = await ctx.prisma.$queryRaw<
        { id: string; title: string }[]
      >`
        SELECT id, title FROM albums 
        WHERE enrichment_status = 'PENDING' AND source = 'DISCOGS'
      `;

      if (pending.length === 0) {
        return {
          success: true,
          message: 'No pending DISCOGS albums',
          stats: { 'Pending albums': 0 },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would process ${pending.length} albums`,
          stats: {
            'Albums to process': pending.length,
            Albums: pending.map(a => a.title).join(', '),
          },
        };
      }

      ctx.log(`Processing ${pending.length} albums...`);
      await ctx.prisma.$executeRaw`
        UPDATE albums SET enrichment_status = 'COMPLETED', data_quality = 'MEDIUM', updated_at = NOW()
        WHERE enrichment_status = 'PENDING' AND source = 'DISCOGS'
      `;

      return {
        success: true,
        message: `Processed ${pending.length} DISCOGS albums`,
        stats: { 'Albums processed': pending.length },
      };
    },
  },

  {
    id: 6,
    name: 'Enrich Artist Images',
    description:
      'Queue artist image enrichment jobs (DEPRECATED - use apply-artist-images-standalone.ts instead)',
    dependencies: [],
    priority: 'high',
    run: async ctx => {
      ctx.warn(
        'DEPRECATED: Use apply-artist-images-standalone.ts instead for instant results without Redis'
      );
      ctx.warn('Run: npx tsx src/scripts/apply-artist-images-standalone.ts');
      ctx.log('Finding artists without images...');

      // Find artists with MBID but no image
      const artists = await ctx.prisma.artist.findMany({
        where: {
          musicbrainzId: { not: null },
          OR: [{ imageUrl: null }, { imageUrl: '' }],
        },
        select: { id: true, name: true },
      });

      // Also get counts for stats
      const withImages = await ctx.prisma.artist.count({
        where: { imageUrl: { not: null } },
      });

      if (artists.length === 0) {
        return {
          success: true,
          message: 'All artists with MusicBrainz IDs have images',
          stats: {
            'Artists with images': withImages,
            'Artists needing images': 0,
          },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would queue ${artists.length} artists for enrichment`,
          stats: {
            'Artists with images': withImages,
            'Artists to enrich': artists.length,
            'Estimated time': `~${Math.ceil(artists.length / 60)} minutes`,
          },
        };
      }

      // Queue enrichment jobs
      ctx.log(`Queueing ${artists.length} artist enrichment jobs...`);
      const queue = getMusicBrainzQueue();
      let queued = 0;

      for (const artist of artists) {
        await queue.addJob(
          JOB_TYPES.ENRICH_ARTIST,
          {
            artistId: artist.id,
            priority: 'medium',
            userAction: 'admin_manual',
            requestId: `cli-task6-${artist.id}`,
          },
          {
            priority: 5,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          }
        );
        queued++;
        if (queued % 50 === 0) ctx.log(`Queued ${queued}/${artists.length}...`);
      }

      return {
        success: true,
        message: `Queued ${queued} artists for enrichment`,
        stats: {
          'Artists with images': withImages,
          'Jobs queued': queued,
          Rate: '1 request/second',
          'Estimated time': `~${Math.ceil(queued / 60)} minutes`,
        },
        warnings: [
          'Monitor progress: pnpm queue:dev (Bull Board at localhost:3001)',
        ],
      };
    },
  },

  {
    id: 7,
    name: 'Fix Artist Enrichment Pipeline',
    description: 'Update artist creation to fetch images',
    dependencies: [6],
    priority: 'medium',
    run: async ctx => {
      ctx.log('This requires code changes...');

      return {
        success: true,
        message: 'Manual code changes needed',
        warnings: [
          'Update src/lib/musicbrainz/enrichment-logic.ts',
          'Ensure new artists get imageUrl from Spotify',
        ],
      };
    },
  },

  {
    id: 8,
    name: 'Fix Orphaned Albums',
    description: 'Link albums missing artist relationships',
    dependencies: [],
    priority: 'medium',
    run: async ctx => {
      ctx.log('Finding orphaned albums...');

      const orphaned = await ctx.prisma.$queryRaw<
        { id: string; title: string; source: string }[]
      >`
        SELECT a.id, a.title, a.source FROM albums a
        LEFT JOIN album_artists aa ON a.id = aa.album_id
        WHERE aa.album_id IS NULL
      `;

      if (orphaned.length === 0) {
        return {
          success: true,
          message: 'No orphaned albums found',
          stats: { 'Orphaned albums': 0 },
        };
      }

      return {
        success: true,
        message: `Found ${orphaned.length} orphaned albums`,
        stats: {
          'Orphaned albums': orphaned.length,
          Albums: orphaned.map(a => `${a.title} (${a.source})`).join(', '),
        },
        warnings: [
          'Manual step: Link albums to artists via album_artists table',
        ],
      };
    },
  },

  {
    id: 9,
    name: 'Create Missing User Settings',
    description: 'Create default settings for users without them',
    dependencies: [],
    priority: 'low',
    run: async ctx => {
      ctx.log('Finding users without settings...');

      const users = await ctx.prisma.$queryRaw<
        { id: string; username: string }[]
      >`
        SELECT u.id, u.username FROM "User" u
        LEFT JOIN "UserSettings" us ON u.id = us."userId"
        WHERE us.id IS NULL
      `;

      if (users.length === 0) {
        return {
          success: true,
          message: 'All users have settings',
          stats: { 'Users without settings': 0 },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would create settings for ${users.length} users`,
          stats: { 'Users to fix': users.length },
        };
      }

      ctx.log(`Creating settings for ${users.length} users...`);
      for (const user of users) {
        await ctx.prisma.$executeRaw`
          INSERT INTO "UserSettings" (
            id, "userId", theme, language, "profileVisibility",
            "showRecentActivity", "showCollections", "showListenLaterInFeed",
            "showCollectionAddsInFeed", "showOnboardingTour", "emailNotifications",
            "recommendationAlerts", "followAlerts", "defaultCollectionView",
            "autoplayPreviews", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), ${user.id}, 'dark', 'en', 'public',
            true, true, true, true, true, true, true, true, 'grid', false,
            NOW(), NOW()
          )
        `;
      }

      return {
        success: true,
        message: `Created settings for ${users.length} users`,
        stats: { 'Settings created': users.length },
      };
    },
  },

  {
    id: 10,
    name: 'Clean Expired Cache',
    description: 'Delete expired cache entries',
    dependencies: [],
    priority: 'low',
    run: async ctx => {
      ctx.log('Checking for expired cache entries...');

      const expired = await ctx.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) as count FROM cache_data WHERE expires < NOW()
      `;
      const expiredCount = Number(expired[0]?.count || 0);

      if (expiredCount === 0) {
        return {
          success: true,
          message: 'No expired cache entries',
          stats: { 'Expired entries': 0 },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would delete ${expiredCount} expired entries`,
          stats: { 'Expired entries': expiredCount },
        };
      }

      ctx.log(`Deleting ${expiredCount} expired entries...`);
      await ctx.prisma
        .$executeRaw`DELETE FROM cache_data WHERE expires < NOW()`;

      return {
        success: true,
        message: `Deleted ${expiredCount} expired cache entries`,
        stats: { 'Entries deleted': expiredCount },
      };
    },
  },

  {
    id: 11,
    name: 'Delete Junk Genre-Named Albums',
    description:
      'Remove albums with genre-like titles (e.g., "Hip Hop, Nu Skool")',
    dependencies: [],
    priority: 'high',
    run: async ctx => {
      ctx.log('Finding junk albums with genre-like names...');

      // These are albums that have genre keywords as their title
      // and have zero user relationships (no collections, no recommendations)
      const junkAlbums = await ctx.prisma.$queryRaw<
        { id: string; title: string }[]
      >`
        SELECT a.id, a.title FROM albums a
        WHERE (
          a.title ~* '^(Hip[- ]?Hop|Electronic|Indie|Rock|Pop|Alternative|Jazz|Soul|Metal|R&B)[,\\s/&]'
          OR a.title ~* '[,\\s/&](Hip[- ]?Hop|Electronic|Indie|Rock|Pop|Alternative|Jazz|Soul|Metal)[,\\s/&]?'
          OR a.title ~* '^(Urban|Uplifting).*(Pop|Rock|Hip|Indie|Electronic)'
        )
        AND a.id NOT IN (SELECT album_id FROM "CollectionAlbum")
        AND a.id NOT IN (SELECT basis_album_id FROM "Recommendation")
        AND a.id NOT IN (SELECT recommended_album_id FROM "Recommendation")
      `;

      if (junkAlbums.length === 0) {
        return {
          success: true,
          message: 'No junk albums found',
          stats: { 'Junk albums': 0 },
        };
      }

      ctx.log(`Found ${junkAlbums.length} junk albums`);

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would delete ${junkAlbums.length} junk albums`,
          stats: {
            'Albums to delete': junkAlbums.length,
            'Sample titles': junkAlbums
              .slice(0, 5)
              .map(a => a.title)
              .join(', '),
          },
        };
      }

      ctx.log(`Deleting ${junkAlbums.length} junk albums...`);
      const ids = junkAlbums.map(a => a.id);

      // Delete related records first (tracks, album_artists)
      await ctx.prisma
        .$executeRaw`DELETE FROM tracks WHERE album_id = ANY(${ids}::uuid[])`;
      await ctx.prisma
        .$executeRaw`DELETE FROM album_artists WHERE album_id = ANY(${ids}::uuid[])`;
      await ctx.prisma
        .$executeRaw`DELETE FROM enrichment_logs WHERE album_id = ANY(${ids}::uuid[])`;
      await ctx.prisma
        .$executeRaw`DELETE FROM albums WHERE id = ANY(${ids}::uuid[])`;

      return {
        success: true,
        message: `Deleted ${junkAlbums.length} junk albums`,
        stats: { 'Albums deleted': junkAlbums.length },
      };
    },
  },

  {
    id: 12,
    name: 'Re-enrich Trackless Albums',
    description:
      'Queue trackless albums for re-enrichment before considering deletion',
    dependencies: [],
    priority: 'high',
    run: async ctx => {
      ctx.log('Finding trackless albums...');

      const tracklessAlbums = await ctx.prisma.$queryRaw<
        { id: string; title: string; source: string }[]
      >`
        SELECT a.id, a.title, a.source::text FROM albums a
        WHERE a.id NOT IN (SELECT DISTINCT album_id FROM tracks)
        AND (a.musicbrainz_id IS NOT NULL OR a.spotify_id IS NOT NULL)
      `;

      if (tracklessAlbums.length === 0) {
        return {
          success: true,
          message: 'No trackless albums found',
          stats: { 'Trackless albums': 0 },
        };
      }

      // Group by source for stats
      const bySource = tracklessAlbums.reduce(
        (acc, a) => {
          acc[a.source] = (acc[a.source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      if (ctx.dryRun) {
        const albumList = tracklessAlbums.map(a => `${a.title} [${a.source}]`);

        return {
          success: true,
          message: `Would queue ${tracklessAlbums.length} trackless albums for re-enrichment`,
          stats: {
            'Albums to re-enrich': tracklessAlbums.length,
            'Estimated time': `~${Math.ceil(tracklessAlbums.length / 60)} minutes`,
            ...bySource,
          },
          warnings: ['Albums to be re-enriched:', ...albumList],
        };
      }

      ctx.log(`Queueing ${tracklessAlbums.length} albums for re-enrichment...`);

      // Queue actual ENRICH_ALBUM jobs (with Spotify fallback)
      const queue = getMusicBrainzQueue();
      let queued = 0;

      for (const album of tracklessAlbums) {
        await queue.addJob(
          JOB_TYPES.ENRICH_ALBUM,
          {
            albumId: album.id,
            priority: 'medium',
            force: true, // Force re-enrichment even if already enriched
            userAction: 'admin_manual',
            requestId: `cli-task12-${album.id}`,
          },
          {
            priority: 5,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
          }
        );
        queued++;
        if (queued % 50 === 0)
          ctx.log(`Queued ${queued}/${tracklessAlbums.length}...`);
      }

      return {
        success: true,
        message: `Queued ${queued} trackless albums for re-enrichment`,
        stats: {
          'Albums queued': queued,
          Rate: '1 request/second',
          'Estimated time': `~${Math.ceil(queued / 60)} minutes`,
          ...bySource,
        },
        warnings: [
          'Jobs will use MusicBrainz → Spotify fallback for tracks',
          'Monitor progress: pnpm queue:dev (Bull Board at localhost:3001)',
          'Run task 13 (Delete Orphan Trackless Albums) AFTER enrichment completes',
        ],
      };
    },
  },

  {
    id: 13,
    name: 'Delete Orphan Trackless Albums',
    description: 'Remove albums with no tracks and no user relationships',
    dependencies: [12], // Run after re-enrichment attempt
    priority: 'medium',
    run: async ctx => {
      ctx.log('Finding orphan trackless albums...');

      const orphanAlbums = await ctx.prisma.$queryRaw<
        { id: string; title: string; source: string }[]
      >`
        SELECT a.id, a.title, a.source::text FROM albums a
        WHERE a.id NOT IN (SELECT DISTINCT album_id FROM tracks)
        AND a.id NOT IN (SELECT album_id FROM "CollectionAlbum")
        AND a.id NOT IN (SELECT basis_album_id FROM "Recommendation")
        AND a.id NOT IN (SELECT recommended_album_id FROM "Recommendation")
      `;

      if (orphanAlbums.length === 0) {
        return {
          success: true,
          message: 'No orphan trackless albums found',
          stats: { 'Orphan albums': 0 },
        };
      }

      // Group by source for stats
      const bySource = orphanAlbums.reduce(
        (acc, a) => {
          acc[a.source] = (acc[a.source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      if (ctx.dryRun) {
        // Build album list as a single string for warnings output
        const albumList = orphanAlbums.map(a => `${a.title} [${a.source}]`);

        return {
          success: true,
          message: `Would delete ${orphanAlbums.length} orphan trackless albums`,
          stats: {
            'Albums to delete': orphanAlbums.length,
            ...bySource,
          },
          warnings: ['Albums to be deleted:', ...albumList],
        };
      }

      ctx.log(`Deleting ${orphanAlbums.length} orphan albums...`);
      const ids = orphanAlbums.map(a => a.id);

      await ctx.prisma
        .$executeRaw`DELETE FROM album_artists WHERE album_id = ANY(${ids}::uuid[])`;
      await ctx.prisma
        .$executeRaw`DELETE FROM enrichment_logs WHERE album_id = ANY(${ids}::uuid[])`;
      await ctx.prisma
        .$executeRaw`DELETE FROM albums WHERE id = ANY(${ids}::uuid[])`;

      return {
        success: true,
        message: `Deleted ${orphanAlbums.length} orphan trackless albums`,
        stats: { 'Albums deleted': orphanAlbums.length, ...bySource },
      };
    },
  },

  {
    id: 14,
    name: 'Delete Orphan Artists',
    description: 'Remove artists with no album relationships',
    dependencies: [11, 13], // Run after album cleanup
    priority: 'medium',
    run: async ctx => {
      ctx.log('Finding orphan artists (no albums)...');

      const orphanArtists = await ctx.prisma.$queryRaw<
        { id: string; name: string }[]
      >`
        SELECT a.id, a.name FROM artists a
        LEFT JOIN album_artists aa ON a.id = aa.artist_id
        WHERE aa.artist_id IS NULL
      `;

      if (orphanArtists.length === 0) {
        return {
          success: true,
          message: 'No orphan artists found',
          stats: { 'Orphan artists': 0 },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would delete ${orphanArtists.length} orphan artists`,
          stats: {
            'Artists to delete': orphanArtists.length,
            'Sample names': orphanArtists
              .slice(0, 10)
              .map(a => a.name)
              .join(', '),
          },
        };
      }

      ctx.log(`Deleting ${orphanArtists.length} orphan artists...`);
      const ids = orphanArtists.map(a => a.id);

      // Delete related records first
      await ctx.prisma
        .$executeRaw`DELETE FROM track_artists WHERE artist_id = ANY(${ids}::uuid[])`;
      await ctx.prisma
        .$executeRaw`DELETE FROM enrichment_logs WHERE artist_id = ANY(${ids}::uuid[])`;
      await ctx.prisma
        .$executeRaw`DELETE FROM artists WHERE id = ANY(${ids}::uuid[])`;

      return {
        success: true,
        message: `Deleted ${orphanArtists.length} orphan artists`,
        stats: { 'Artists deleted': orphanArtists.length },
      };
    },
  },

  {
    id: 15,
    name: 'Re-enrich Albums Missing Genres',
    description:
      'Queue albums with MusicBrainz IDs but no genres for re-enrichment',
    dependencies: [],
    priority: 'high',
    run: async ctx => {
      ctx.log('Finding albums missing genres...');

      const albumsMissingGenres = await ctx.prisma.$queryRaw<
        { id: string; title: string }[]
      >`
        SELECT id, title FROM albums
        WHERE musicbrainz_id IS NOT NULL
        AND (genres IS NULL OR array_length(genres, 1) IS NULL)
        AND enrichment_status = 'COMPLETED'
      `;

      if (albumsMissingGenres.length === 0) {
        return {
          success: true,
          message: 'No albums missing genres',
          stats: { 'Albums needing genres': 0 },
        };
      }

      ctx.log(`Found ${albumsMissingGenres.length} albums missing genres`);

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would queue ${albumsMissingGenres.length} albums for re-enrichment`,
          stats: {
            'Albums to re-enrich': albumsMissingGenres.length,
            'Estimated time': `~${Math.ceil(albumsMissingGenres.length / 60)} minutes (1 req/sec)`,
          },
          warnings: [
            'IMPORTANT: Fix the enrichment bug first!',
            "Add 'tags' to line 416 in enrichment-processor.ts",
          ],
        };
      }

      // Reset enrichment status in batches
      const BATCH_SIZE = 50;
      let processed = 0;

      for (let i = 0; i < albumsMissingGenres.length; i += BATCH_SIZE) {
        const batch = albumsMissingGenres.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(a => a.id);

        ctx.log(
          `Resetting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(albumsMissingGenres.length / BATCH_SIZE)} (${batch.length} albums)...`
        );

        await ctx.prisma.$executeRaw`
          UPDATE albums 
          SET enrichment_status = 'PENDING', updated_at = NOW()
          WHERE id = ANY(${batchIds}::uuid[])
        `;

        processed += batch.length;
      }

      return {
        success: true,
        message: `Queued ${processed} albums for re-enrichment`,
        stats: {
          'Albums queued': processed,
          'Estimated time': `~${Math.ceil(processed / 60)} minutes`,
        },
        warnings: [
          'Albums will be processed at 1 request/second',
          'Monitor progress: pnpm queue:dev (Bull Board at localhost:3001)',
          "Or query: SELECT COUNT(*) FROM albums WHERE enrichment_status = 'PENDING'",
        ],
      };
    },
  },

  {
    id: 16,
    name: 'Re-enrich Trackless Albums with Users',
    description:
      'Queue trackless albums that have user relationships for re-enrichment',
    dependencies: [],
    priority: 'medium',
    run: async ctx => {
      ctx.log('Finding trackless albums with user relationships...');

      const tracklessWithUsers = await ctx.prisma.$queryRaw<
        { id: string; title: string }[]
      >`
        SELECT DISTINCT a.id, a.title FROM albums a
        WHERE a.id NOT IN (SELECT DISTINCT album_id FROM tracks)
        AND (
          a.id IN (SELECT album_id FROM "CollectionAlbum")
          OR a.id IN (SELECT basis_album_id FROM "Recommendation")
          OR a.id IN (SELECT recommended_album_id FROM "Recommendation")
        )
      `;

      if (tracklessWithUsers.length === 0) {
        return {
          success: true,
          message: 'No trackless albums with user relationships',
          stats: { 'Albums to re-enrich': 0 },
        };
      }

      if (ctx.dryRun) {
        return {
          success: true,
          message: `Would queue ${tracklessWithUsers.length} albums for re-enrichment`,
          stats: {
            'Albums to re-enrich': tracklessWithUsers.length,
            'Sample titles': tracklessWithUsers
              .slice(0, 5)
              .map(a => a.title)
              .join(', '),
          },
        };
      }

      const ids = tracklessWithUsers.map(a => a.id);
      await ctx.prisma.$executeRaw`
        UPDATE albums 
        SET enrichment_status = 'PENDING', updated_at = NOW()
        WHERE id = ANY(${ids}::uuid[])
      `;

      return {
        success: true,
        message: `Queued ${tracklessWithUsers.length} albums for re-enrichment`,
        stats: { 'Albums queued': tracklessWithUsers.length },
        warnings: [
          'These albums have user collections/recommendations',
          'Re-enrichment will attempt to fetch tracks again',
        ],
      };
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    taskId: undefined as number | undefined,
    fromTask: undefined as number | undefined,
    interactive: false,
    help: false,
    selectedTasks: undefined as number[] | undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--task':
      case '-t':
        options.taskId = parseInt(args[++i], 10);
        break;
      case '--from':
      case '-f':
        options.fromTask = parseInt(args[++i], 10);
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
${color.bold('Database Cleanup Orchestrator')}

${color.cyan('Usage:')}
  pnpm db:cleanup [options]

${color.cyan('Options:')}
  -d, --dry-run       Preview changes without modifying database
  -t, --task <id>     Run only a specific task
  -f, --from <id>     Start from a specific task
  -i, --interactive   Confirm each task before running
  -h, --help          Show this help message

${color.cyan('Tasks:')}
${tasks.map(t => `  ${color.dim(t.id + '.')} ${t.name} ${color.yellow(`[${t.priority}]`)}`).join('\n')}

${color.cyan('Examples:')}
  pnpm db:cleanup --dry-run          Preview all changes
  pnpm db:cleanup --task 2           Run only task 2
  pnpm db:cleanup --from 5           Run tasks 5-10
  pnpm db:cleanup --interactive      Confirm each task
`);
}

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════

async function runOrchestrator(
  options: ReturnType<typeof parseArgs>,
  skipIntro = false
) {
  const prisma = new PrismaClient();
  const results = new Map<
    number,
    { status: TaskStatus; result?: TaskResult }
  >();

  // Initialize all tasks as pending
  for (const task of tasks) {
    results.set(task.id, { status: 'pending' });
  }

  if (!skipIntro) {
    console.clear();
    p.intro(color.bgCyan(color.black(' Database Cleanup Orchestrator ')));
  }

  if (options.dryRun) {
    p.log.warn(color.yellow('DRY RUN MODE - No changes will be made'));
  }

  // Filter tasks
  let tasksToRun = tasks;
  if (options.selectedTasks && options.selectedTasks.length > 0) {
    // Interactive menu selection
    tasksToRun = tasks.filter(t => options.selectedTasks!.includes(t.id));
  } else if (options.taskId) {
    tasksToRun = tasks.filter(t => t.id === options.taskId);
    if (tasksToRun.length === 0) {
      p.log.error(`Task ${options.taskId} not found`);
      process.exit(1);
    }
  } else if (options.fromTask) {
    tasksToRun = tasks.filter(t => t.id >= options.fromTask!);
  }

  p.log.info(`Running ${color.cyan(tasksToRun.length.toString())} tasks...`);

  try {
    for (const task of tasksToRun) {
      // Check dependencies
      const unmetDeps = task.dependencies.filter(depId => {
        const dep = results.get(depId);
        return dep?.status !== 'success';
      });

      if (unmetDeps.length > 0 && !options.taskId) {
        p.log.warn(
          `${color.dim(`Task ${task.id}:`)} ${task.name} - ${color.yellow('Skipped')} (waiting for tasks ${unmetDeps.join(', ')})`
        );
        results.set(task.id, {
          status: 'skipped',
          result: { success: false, message: 'Dependencies not met' },
        });
        continue;
      }

      // Interactive confirmation
      if (options.interactive) {
        const proceed = await p.confirm({
          message: `Run Task ${task.id}: ${task.name}?`,
        });

        if (p.isCancel(proceed) || !proceed) {
          results.set(task.id, {
            status: 'skipped',
            result: { success: false, message: 'Skipped by user' },
          });
          continue;
        }
      }

      // Run task with spinner
      const priorityColor =
        task.priority === 'high'
          ? color.red
          : task.priority === 'medium'
            ? color.yellow
            : color.dim;
      const s = p.spinner();
      s.start(
        `${color.bold(`Task ${task.id}:`)} ${task.name} ${priorityColor(`[${task.priority}]`)}`
      );

      const ctx: TaskContext = {
        prisma,
        dryRun: options.dryRun,
        log: msg => s.message(`${task.name} - ${msg}`),
        warn: msg => s.message(`${task.name} - ${color.yellow(msg)}`),
      };

      try {
        const result = await task.run(ctx);
        results.set(task.id, {
          status: result.success ? 'success' : 'failed',
          result,
        });

        if (result.success) {
          s.stop(
            `${color.bold(`Task ${task.id}:`)} ${task.name} ${color.green('✓')}`
          );
        } else {
          s.stop(
            `${color.bold(`Task ${task.id}:`)} ${task.name} ${color.red('✗')}`
          );
        }

        // Show result message
        if (result.success) {
          p.log.success(color.green(result.message));
        } else {
          p.log.error(color.red(result.message));
        }

        // Show stats
        if (result.stats) {
          const statsLines = Object.entries(result.stats)
            .filter(([, v]) => v !== undefined)
            .map(
              ([k, v]) =>
                `${color.dim('│')}  ${color.dim(k + ':')} ${color.cyan(String(v))}`
            );

          if (statsLines.length > 0) {
            console.log(statsLines.join('\n'));
          }
        }

        // Show warnings
        if (result.warnings && result.warnings.length > 0) {
          for (const warning of result.warnings) {
            p.log.warn(color.yellow(warning));
          }
        }

        console.log(); // Spacing between tasks
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        s.stop(
          `${color.bold(`Task ${task.id}:`)} ${task.name} ${color.red('✗')}`
        );
        p.log.error(color.red(`Error: ${errorMessage}`));
        results.set(task.id, {
          status: 'failed',
          result: { success: false, message: errorMessage },
        });
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  // Summary
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const [, { status }] of results) {
    if (status === 'success') successCount++;
    else if (status === 'failed') failedCount++;
    else if (status === 'skipped') skippedCount++;
  }

  const summaryParts = [
    color.green(`${successCount} passed`),
    failedCount > 0 ? color.red(`${failedCount} failed`) : null,
    skippedCount > 0 ? color.yellow(`${skippedCount} skipped`) : null,
  ].filter(Boolean);

  p.outro(
    failedCount === 0
      ? color.green('✨ All tasks completed successfully!')
      : color.yellow(`Done: ${summaryParts.join(' · ')}`)
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTIVE MENU
// ═══════════════════════════════════════════════════════════════════════════

async function showInteractiveMenu(): Promise<ReturnType<typeof parseArgs>> {
  console.clear();
  p.intro(color.bgCyan(color.black(' Database Cleanup Orchestrator ')));

  // Task selection with multiselect
  const selectedTasks = await p.multiselect({
    message: 'Select tasks to run (space to toggle, enter to confirm):',
    options: tasks.map(t => {
      const priorityColor =
        t.priority === 'high'
          ? color.red
          : t.priority === 'medium'
            ? color.yellow
            : color.dim;
      return {
        value: t.id,
        label: `${color.bold(`Task ${t.id}:`)} ${t.name} ${priorityColor(`[${t.priority}]`)}`,
        hint: t.description,
      };
    }),
    required: true,
  });

  if (p.isCancel(selectedTasks)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  // Dry run selection
  const dryRun = await p.confirm({
    message:
      'Run in dry-run mode? (preview changes without modifying database)',
    initialValue: true,
  });

  if (p.isCancel(dryRun)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  // Interactive confirmation per task
  const interactive = await p.confirm({
    message: 'Confirm each task before running?',
    initialValue: false,
  });

  if (p.isCancel(interactive)) {
    p.cancel('Cancelled');
    process.exit(0);
  }

  return {
    dryRun: dryRun as boolean,
    taskId: undefined,
    fromTask: undefined,
    interactive: interactive as boolean,
    help: false,
    selectedTasks: selectedTasks as number[],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  // If no args provided, show interactive menu
  if (args.length === 0) {
    const menuOptions = await showInteractiveMenu();
    await runOrchestrator(menuOptions, true); // skipIntro since menu already showed it
    return;
  }

  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  await runOrchestrator(options);
}

main().catch(err => {
  p.log.error(color.red(`Fatal error: ${err}`));
  process.exit(1);
});
