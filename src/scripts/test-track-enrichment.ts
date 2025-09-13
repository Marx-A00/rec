#!/usr/bin/env tsx
// src/scripts/test-track-enrichment.ts

/**
 * Test script for track enrichment functionality
 * Tests the new CHECK_TRACK_ENRICHMENT and ENRICH_TRACK job types
 */

import { prisma } from '../lib/prisma';
import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';
import type { CheckTrackEnrichmentJobData } from '../lib/queue/jobs';

async function main() {
  console.log('🎵 Testing Track Enrichment Jobs');
  console.log('================================\n');

  try {
    // 1. Find some tracks in the database
    console.log('📋 Finding tracks to test...');
    const tracks = await prisma.track.findMany({
      take: 3,
      include: {
        album: {
          select: {
            title: true
          }
        },
        artists: {
          include: {
            artist: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (tracks.length === 0) {
      console.log('❌ No tracks found in database. Run a Spotify sync first.');
      return;
    }

    console.log(`✅ Found ${tracks.length} tracks to test:\n`);
    
    tracks.forEach((track, index) => {
      const artistNames = track.artists.map(ta => ta.artist.name).join(', ');
      console.log(`${index + 1}. "${track.title}" by ${artistNames}`);
      console.log(`   Album: "${track.album.title}"`);
      console.log(`   Track ${track.trackNumber}, Duration: ${track.durationMs ? Math.round(track.durationMs / 1000) + 's' : 'Unknown'}`);
      console.log(`   MusicBrainz ID: ${track.musicbrainzId || 'None'}\n`);
    });

    // 2. Queue track enrichment jobs
    console.log('⚡ Queuing track enrichment jobs...\n');
    const queue = getMusicBrainzQueue();

    for (const track of tracks) {
      const jobData: CheckTrackEnrichmentJobData = {
        trackId: track.id,
        source: 'manual',
        priority: 'high',
        requestId: `track_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const job = await queue.addJob(JOB_TYPES.CHECK_TRACK_ENRICHMENT, jobData, {
        priority: 5, // High priority for testing
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      console.log(`✅ Queued enrichment for "${track.title}" (Job ID: ${job.id})`);
    }

    console.log('\n🎯 Track enrichment jobs queued successfully!');
    console.log('\n📊 Monitor progress at: http://localhost:3001/admin/queues');
    console.log('\n💡 Jobs will:');
    console.log('   1. Check if track needs enrichment (CHECK_TRACK_ENRICHMENT)');
    console.log('   2. If needed, queue actual enrichment (ENRICH_TRACK)');
    console.log('   3. Search MusicBrainz by ISRC (if available) or title + artist');
    console.log('   4. Update track with MusicBrainz ID and metadata');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
    process.exit(0);
  }
}

// Run the test
main().catch(console.error);
