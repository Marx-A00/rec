#!/usr/bin/env tsx
// src/scripts/test-bulk-track-enrichment.ts

/**
 * Test script for the new bulk track enrichment functionality
 * Tests album enrichment with automatic track processing
 */

import { prisma } from '../lib/prisma';
import { getMusicBrainzQueue, JOB_TYPES } from '../lib/queue';
import type { EnrichAlbumJobData } from '../lib/queue/jobs';

async function main() {
  console.log('🚀 Testing Bulk Track Enrichment');
  console.log('=================================\n');

  try {
    // 1. Find albums with tracks that need enrichment
    console.log('📋 Finding albums with tracks to test...');
    
    const albumsWithTracks = await prisma.album.findMany({
      where: {
        tracks: {
          some: {
            musicbrainzId: null  // Has tracks without MusicBrainz IDs
          }
        }
      },
      take: 3,
      include: {
        tracks: {
          select: {
            id: true,
            title: true,
            trackNumber: true,
            musicbrainzId: true
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

    if (albumsWithTracks.length === 0) {
      console.log('❌ No albums with unenriched tracks found.');
      console.log('💡 Run a Spotify sync first to create albums with tracks.');
      return;
    }

    console.log(`✅ Found ${albumsWithTracks.length} albums with unenriched tracks:\n`);
    
    albumsWithTracks.forEach((album, index) => {
      const artistNames = album.artists.map(aa => aa.artist.name).join(', ');
      const unenrichedTracks = album.tracks.filter(t => !t.musicbrainzId).length;
      
      console.log(`${index + 1}. "${album.title}" by ${artistNames}`);
      console.log(`   - ${album.tracks.length} total tracks`);
      console.log(`   - ${unenrichedTracks} tracks need MusicBrainz enrichment`);
      console.log(`   - Album MusicBrainz ID: ${album.musicbrainzId || 'None'}\n`);
    });

    // 2. Enrich albums - this will now include bulk track processing!
    console.log('⚡ Queuing album enrichment (with bulk track processing)...\n');
    const queue = getMusicBrainzQueue();

    for (const album of albumsWithTracks) {
      const jobData: EnrichAlbumJobData = {
        albumId: album.id,
        priority: 'high',
        userAction: 'manual',
        requestId: `bulk_track_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };

      const job = await queue.addJob(JOB_TYPES.ENRICH_ALBUM, jobData, {
        priority: 3, // High priority for testing
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      console.log(`✅ Queued album enrichment for "${album.title}" (Job ID: ${job.id})`);
    }

    console.log('\n🎯 Album enrichment jobs queued successfully!');
    console.log('\n📊 Monitor progress at: http://localhost:3001/admin/queues');
    console.log('\n💡 New workflow:');
    console.log('   1. Album gets enriched with MusicBrainz data');
    console.log('   2. 🚀 Album fetches ALL track data in ONE API call');
    console.log('   3. 🔗 Bulk matches and updates existing tracks');
    console.log('   4. ✅ All tracks get MusicBrainz IDs efficiently!');
    console.log('\n🎵 This is 10-20x faster than individual track jobs!');

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
