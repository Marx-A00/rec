#!/usr/bin/env tsx
// scripts/migrate-discogs-to-musicbrainz.ts

/**
 * Comprehensive migration script: Discogs → MusicBrainz canonical schema
 * 
 * Features:
 * - Extracts all unique albums from CollectionAlbum + Recommendation tables
 * - Searches MusicBrainz for each album with rate limiting
 * - Validates and maps results to canonical schema
 * - Preview mode (--dry-run) to review before committing
 * - Checkpoint system for resuming interrupted migrations
 * - Comprehensive logging and error handling
 * 
 * Usage:
 *   npx tsx scripts/migrate-discogs-to-musicbrainz.ts --dry-run    # Preview only
 *   npx tsx scripts/migrate-discogs-to-musicbrainz.ts --execute   # Actually migrate
 *   npx tsx scripts/migrate-discogs-to-musicbrainz.ts --resume    # Resume from checkpoint
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import {
  musicbrainzService,
  validateReleaseGroupSearchResult,
  mapReleaseGroupSearchToCanonical,
  createMusicBrainzIntegrationService,
  type ValidatedReleaseGroupSearchResult
} from '../src/lib/musicbrainz';

// Types for our migration data
interface DiscogsAlbumData {
  discogsId: string;
  title: string;
  artist: string;
  year?: string;
  imageUrl?: string;
  source: 'collection' | 'recommendation_basis' | 'recommendation_target';
  sourceIds: string[]; // IDs of records that reference this album
}

interface MigrationResult {
  discogsId: string;
  discogsData: DiscogsAlbumData;
  musicbrainzResults: ValidatedReleaseGroupSearchResult[];
  selectedResult?: ValidatedReleaseGroupSearchResult;
  canonicalArtistId?: string;
  canonicalAlbumId?: string;
  status: 'pending' | 'searched' | 'mapped' | 'created' | 'error';
  error?: string;
  timestamp: string;
}

interface MigrationCheckpoint {
  totalAlbums: number;
  processedCount: number;
  results: MigrationResult[];
  createdAt: string;
  lastUpdated: string;
}

class DiscogsToMusicBrainzMigrator {
  private prisma: PrismaClient;
  private integrationService: ReturnType<typeof createMusicBrainzIntegrationService>;
  private outputDir: string;
  private checkpointFile: string;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.integrationService = createMusicBrainzIntegrationService(this.prisma);
    this.outputDir = join(process.cwd(), 'migration-output');
    this.checkpointFile = join(this.outputDir, 'migration-checkpoint.json');
    
    // Ensure output directory exists
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Extract all unique albums from backup files
   */
  async extractDiscogsAlbums(): Promise<DiscogsAlbumData[]> {
    console.log('🔍 Extracting all Discogs albums from backup files...');
    
    // Extract from COMPLETE_BACKUP_20250904.sql (CollectionAlbum data)
    const collectionAlbums = this.parseCollectionAlbumsFromBackup();
    
    // Extract from recommendations SQL dump
    const recommendations = this.parseRecommendationsFromBackup();
    
    console.log(`📀 Found ${collectionAlbums.length} collection albums in backup`);
    console.log(`🔗 Found ${recommendations.length} recommendations in backup`);

    // Build map of unique albums
    const albumsMap = new Map<string, DiscogsAlbumData>();

    // Process CollectionAlbums
    for (const album of collectionAlbums) {
      if (!album.albumDiscogsId) continue;
      
      const existing = albumsMap.get(album.albumDiscogsId);
      if (existing) {
        existing.sourceIds.push(album.id);
      } else {
        albumsMap.set(album.albumDiscogsId, {
          discogsId: album.albumDiscogsId,
          title: album.albumTitle,
          artist: album.albumArtist,
          year: album.albumYear || undefined,
          imageUrl: album.albumImageUrl || undefined,
          source: 'collection',
          sourceIds: [album.id]
        });
      }
    }

    // Process Recommendations
    for (const rec of recommendations) {
      // Handle basis album
      const basisId = rec.basisAlbumDiscogsId;
      if (basisId) {
        const existing = albumsMap.get(basisId);
        if (existing) {
          existing.sourceIds.push(`recommendation-basis-${rec.id}`);
          if (existing.source === 'collection') {
            existing.source = 'collection'; // Keep as collection if it's also in collections
          }
        } else {
          albumsMap.set(basisId, {
            discogsId: basisId,
            title: rec.basisAlbumTitle || `Unknown Album ${basisId}`,
            artist: rec.basisAlbumArtist || 'Unknown Artist',
            year: rec.basisAlbumYear || undefined,
            imageUrl: rec.basisAlbumImageUrl || undefined,
            source: 'recommendation_basis',
            sourceIds: [`recommendation-basis-${rec.id}`]
          });
        }
      }

      // Handle recommended album
      const recId = rec.recommendedAlbumDiscogsId;
      if (recId) {
        const existing = albumsMap.get(recId);
        if (existing) {
          existing.sourceIds.push(`recommendation-target-${rec.id}`);
        } else {
          albumsMap.set(recId, {
            discogsId: recId,
            title: rec.recommendedAlbumTitle || `Unknown Album ${recId}`,
            artist: rec.recommendedAlbumArtist || 'Unknown Artist',
            year: rec.recommendedAlbumYear || undefined,
            imageUrl: rec.recommendedAlbumImageUrl || undefined,
            source: 'recommendation_target',
            sourceIds: [`recommendation-target-${rec.id}`]
          });
        }
      }
    }

    const uniqueAlbums = Array.from(albumsMap.values());
    
    console.log(`✅ Found ${uniqueAlbums.length} unique albums:`);
    console.log(`   📀 From collections: ${uniqueAlbums.filter(a => a.source === 'collection').length}`);
    console.log(`   🎯 From recommendation basis: ${uniqueAlbums.filter(a => a.source === 'recommendation_basis').length}`);
    console.log(`   🔗 From recommendation targets: ${uniqueAlbums.filter(a => a.source === 'recommendation_target').length}`);

    // Save extracted data
    writeFileSync(
      join(this.outputDir, 'extracted-discogs-albums.json'),
      JSON.stringify(uniqueAlbums, null, 2)
    );

    return uniqueAlbums;
  }

  /**
   * Parse CollectionAlbum data from COMPLETE_BACKUP_20250904.sql
   */
  private parseCollectionAlbumsFromBackup(): any[] {
    const backupPath = join(process.cwd(), 'backups', 'COMPLETE_BACKUP_20250904.sql');
    
    if (!existsSync(backupPath)) {
      console.warn(`⚠️  Backup file not found: ${backupPath}`);
      return [];
    }

    const backupContent = readFileSync(backupPath, 'utf-8');
    const collectionAlbums: any[] = [];

    // Parse INSERT statements
    const insertLines = backupContent.split('\n').filter(line => 
      line.trim().startsWith('INSERT INTO "CollectionAlbum" VALUES')
    );

    for (const line of insertLines) {
      try {
        // Extract VALUES portion and parse
        const valuesMatch = line.match(/VALUES \((.*)\);/);
        if (!valuesMatch) continue;

        const values = valuesMatch[1];
        // Split by comma but respect quoted strings
        const parts = this.parseCSVLine(values);
        
        if (parts.length >= 11) {
          collectionAlbums.push({
            id: this.cleanQuotes(parts[0]),
            collectionId: this.cleanQuotes(parts[1]),
            albumDiscogsId: this.cleanQuotes(parts[2]),
            personalRating: parts[3] === 'NULL' ? null : parseInt(parts[3]),
            personalNotes: parts[4] === 'NULL' ? null : this.cleanQuotes(parts[4]),
            position: parseInt(parts[5]),
            addedAt: this.cleanQuotes(parts[6]),
            albumTitle: this.cleanQuotes(parts[7]),
            albumArtist: this.cleanQuotes(parts[8]),
            albumImageUrl: parts[9] === 'NULL' ? null : this.cleanQuotes(parts[9]),
            albumYear: parts[10] === 'NULL' ? null : this.cleanQuotes(parts[10])
          });
        }
      } catch (error) {
        console.warn(`⚠️  Could not parse collection album line: ${line.substring(0, 100)}...`);
      }
    }

    return collectionAlbums;
  }

  /**
   * Parse Recommendation data from recommendations SQL dump
   */
  private parseRecommendationsFromBackup(): any[] {
    const recommendationsPath = '/tmp/recommendations.sql';
    
    if (!existsSync(recommendationsPath)) {
      console.warn(`⚠️  Recommendations dump not found: ${recommendationsPath}`);
      console.log(`ℹ️  Run this first: pg_restore --data-only --table=Recommendation -f /tmp/recommendations.sql /path/to/production_dump.backup`);
      return [];
    }

    const content = readFileSync(recommendationsPath, 'utf-8');
    const recommendations: any[] = [];

    // Find COPY section
    const copyMatch = content.match(/COPY public\."Recommendation".*FROM stdin;\n([\s\S]*?)\n\\./);
    if (!copyMatch) {
      console.warn(`⚠️  Could not find COPY section in recommendations dump`);
      return [];
    }

    const dataLines = copyMatch[1].split('\n').filter(line => line.trim());

    for (const line of dataLines) {
      try {
        const parts = line.split('\t');
        if (parts.length >= 15) {
          recommendations.push({
            id: parts[0],
            score: parseInt(parts[1]),
            createdAt: parts[2],
            updatedAt: parts[3],
            userId: parts[4],
            basisAlbumDiscogsId: parts[5],
            recommendedAlbumDiscogsId: parts[6],
            basisAlbumTitle: parts[7],
            basisAlbumArtist: parts[8],
            basisAlbumImageUrl: parts[9],
            basisAlbumYear: parts[10],
            recommendedAlbumTitle: parts[11],
            recommendedAlbumArtist: parts[12],
            recommendedAlbumImageUrl: parts[13],
            recommendedAlbumYear: parts[14]
          });
        }
      } catch (error) {
        console.warn(`⚠️  Could not parse recommendation line: ${line.substring(0, 100)}...`);
      }
    }

    return recommendations;
  }

  /**
   * Parse CSV-like line with quoted strings
   */
  private parseCSVLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === "'" && !inQuotes) {
        inQuotes = true;
      } else if (char === "'" && inQuotes) {
        // Check if it's an escaped quote
        if (i + 1 < line.length && line[i + 1] === "'") {
          current += "'";
          i++; // Skip next quote
        } else {
          inQuotes = false;
        }
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  /**
   * Remove quotes from string values
   */
  private cleanQuotes(str: string): string {
    if (str === 'NULL') return '';
    return str.replace(/^'|'$/g, '').replace(/''/g, "'");
  }

  /**
   * Search MusicBrainz for all albums with rate limiting
   */
  async searchMusicBrainzForAlbums(
    albums: DiscogsAlbumData[], 
    resumeFromIndex = 0
  ): Promise<MigrationResult[]> {
    console.log(`🎵 Searching MusicBrainz for ${albums.length} albums...`);
    console.log(`⏱️  Rate limit: 1 request/second (estimated time: ~${Math.ceil(albums.length / 60)} minutes)`);
    
    const results: MigrationResult[] = [];
    
    for (let i = resumeFromIndex; i < albums.length; i++) {
      const album = albums[i];
      const progress = `[${i + 1}/${albums.length}]`;
      
      console.log(`${progress} Searching: "${album.title}" by "${album.artist}"`);
      
      try {
        // Search MusicBrainz with rate limiting
        const query = `"${album.title}" AND artist:"${album.artist}"`;
        const searchResults = await musicbrainzService.searchReleaseGroups(query, { limit: 5 });
        
        // Validate results
        const validatedResults: ValidatedReleaseGroupSearchResult[] = [];
        for (const result of searchResults) {
          try {
            const validated = validateReleaseGroupSearchResult(result);
            validatedResults.push(validated);
          } catch (error) {
            console.warn(`   ⚠️  Invalid result skipped:`, error.message);
          }
        }

        const migrationResult: MigrationResult = {
          discogsId: album.discogsId,
          discogsData: album,
          musicbrainzResults: validatedResults,
          selectedResult: validatedResults[0], // Auto-select best match for now
          status: validatedResults.length > 0 ? 'searched' : 'error',
          error: validatedResults.length === 0 ? 'No valid MusicBrainz results found' : undefined,
          timestamp: new Date().toISOString()
        };

        results.push(migrationResult);

        // Log result summary
        if (validatedResults.length > 0) {
          const best = validatedResults[0];
          console.log(`   ✅ Found ${validatedResults.length} result(s), best: "${best.title}" by "${best.artistCredits.map(ac => ac.name).join(', ')}" (score: ${best.score})`);
        } else {
          console.log(`   ❌ No valid results found`);
        }

        // Save checkpoint every 10 albums
        if ((i + 1) % 10 === 0 || i === albums.length - 1) {
          this.saveCheckpoint({
            totalAlbums: albums.length,
            processedCount: i + 1,
            results: results,
            createdAt: results[0]?.timestamp || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          });
          console.log(`   💾 Checkpoint saved (${i + 1}/${albums.length} processed)`);
        }

      } catch (error) {
        console.error(`   ❌ Error searching for album:`, error.message);
        results.push({
          discogsId: album.discogsId,
          discogsData: album,
          musicbrainzResults: [],
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      // Rate limiting: wait 1 second between requests (except for last item)
      if (i < albums.length - 1) {
        console.log(`   ⏳ Waiting 1 second for rate limit...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🎉 MusicBrainz search completed!`);
    console.log(`   ✅ Successful searches: ${results.filter(r => r.status === 'searched').length}`);
    console.log(`   ❌ Failed searches: ${results.filter(r => r.status === 'error').length}`);

    return results;
  }

  /**
   * Generate preview report of what would be migrated
   */
  generatePreviewReport(results: MigrationResult[]): void {
    console.log('\n📋 MIGRATION PREVIEW REPORT');
    console.log('=' .repeat(50));

    const successful = results.filter(r => r.status === 'searched' && r.selectedResult);
    const failed = results.filter(r => r.status === 'error' || !r.selectedResult);

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total albums to migrate: ${results.length}`);
    console.log(`   ✅ Successfully matched: ${successful.length}`);
    console.log(`   ❌ Failed to match: ${failed.length}`);
    console.log(`   Success rate: ${Math.round((successful.length / results.length) * 100)}%`);

    if (successful.length > 0) {
      console.log(`\n✅ SUCCESSFUL MATCHES (first 10):`);
      successful.slice(0, 10).forEach((result, i) => {
        const discogs = result.discogsData;
        const mb = result.selectedResult!;
        console.log(`   ${i + 1}. "${discogs.title}" by "${discogs.artist}"`);
        console.log(`      → "${mb.title}" by "${mb.artistCredits.map(ac => ac.name).join(', ')}" (score: ${mb.score})`);
        console.log(`      Sources: ${discogs.sourceIds.length} reference(s)`);
      });
      
      if (successful.length > 10) {
        console.log(`   ... and ${successful.length - 10} more`);
      }
    }

    if (failed.length > 0) {
      console.log(`\n❌ FAILED MATCHES:`);
      failed.forEach((result, i) => {
        const discogs = result.discogsData;
        console.log(`   ${i + 1}. "${discogs.title}" by "${discogs.artist}"`);
        console.log(`      Error: ${result.error || 'No suitable match found'}`);
        console.log(`      Sources: ${discogs.sourceIds.length} reference(s)`);
      });
    }

    // Save detailed report
    const reportPath = join(this.outputDir, 'migration-preview-report.json');
    writeFileSync(reportPath, JSON.stringify({
      summary: {
        totalAlbums: results.length,
        successfulMatches: successful.length,
        failedMatches: failed.length,
        successRate: Math.round((successful.length / results.length) * 100)
      },
      successful: successful,
      failed: failed,
      generatedAt: new Date().toISOString()
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    console.log(`\n⚠️  NEXT STEPS:`);
    console.log(`   1. Review the failed matches and successful matches above`);
    console.log(`   2. If satisfied, run with --execute to perform the actual migration`);
    console.log(`   3. Or run with --interactive to manually review questionable matches`);
  }

  /**
   * Save checkpoint for resuming
   */
  private saveCheckpoint(checkpoint: MigrationCheckpoint): void {
    writeFileSync(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
  }

  /**
   * Load checkpoint for resuming
   */
  private loadCheckpoint(): MigrationCheckpoint | null {
    if (!existsSync(this.checkpointFile)) {
      return null;
    }
    try {
      return JSON.parse(readFileSync(this.checkpointFile, 'utf-8'));
    } catch (error) {
      console.warn('⚠️  Could not load checkpoint file');
      return null;
    }
  }

  /**
   * Main execution method
   */
  async run(mode: 'dry-run' | 'execute' | 'resume' = 'dry-run'): Promise<void> {
    try {
      console.log('🚀 Discogs → MusicBrainz Migration Script');
      console.log(`Mode: ${mode.toUpperCase()}`);
      console.log('-'.repeat(50));

      let albums: DiscogsAlbumData[];
      let results: MigrationResult[];

      if (mode === 'resume') {
        console.log('🔄 Resuming from checkpoint...');
        const checkpoint = this.loadCheckpoint();
        if (!checkpoint) {
          throw new Error('No checkpoint found. Run in dry-run mode first.');
        }
        
        console.log(`📁 Loaded checkpoint: ${checkpoint.processedCount}/${checkpoint.totalAlbums} processed`);
        
        // Load original albums
        const extractedPath = join(this.outputDir, 'extracted-discogs-albums.json');
        if (!existsSync(extractedPath)) {
          throw new Error('Original extracted albums file not found. Please run extraction first.');
        }
        albums = JSON.parse(readFileSync(extractedPath, 'utf-8'));
        
        // Continue searching from where we left off
        const remainingAlbums = albums.slice(checkpoint.processedCount);
        if (remainingAlbums.length === 0) {
          console.log('✅ All albums already processed!');
          results = checkpoint.results;
        } else {
          console.log(`🔍 Continuing search for remaining ${remainingAlbums.length} albums...`);
          const newResults = await this.searchMusicBrainzForAlbums(albums, checkpoint.processedCount);
          results = newResults;
        }
      } else {
        // Extract all albums from database
        albums = await this.extractDiscogsAlbums();
        
        if (albums.length === 0) {
          console.log('ℹ️  No albums found to migrate.');
          return;
        }

        // Search MusicBrainz for all albums
        results = await this.searchMusicBrainzForAlbums(albums);
      }

      // Generate preview report
      this.generatePreviewReport(results);

      if (mode === 'execute') {
        console.log('\n🚨 EXECUTE MODE NOT YET IMPLEMENTED');
        console.log('This will be added in the next iteration after reviewing the preview results.');
        // TODO: Implement actual database migration
      }

    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--execute') ? 'execute' : 
              args.includes('--resume') ? 'resume' : 'dry-run';

  const migrator = new DiscogsToMusicBrainzMigrator();
  await migrator.run(mode);
}

if (require.main === module) {
  main();
}
