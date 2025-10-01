#!/usr/bin/env tsx
// @ts-nocheck - Script needs updating after MusicBrainz service refactor
// scripts/test-musicbrainz-mapping.ts

/**
 * Test script for MusicBrainz mapping and validation layer
 * Tests the complete flow: search -> validate -> map -> save to files
 * Run with: npx tsx scripts/test-musicbrainz-mapping.ts
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { 
  musicbrainzService,
  validateArtistSearchResult,
  validateReleaseGroupSearchResult,
  mapArtistSearchToCanonical,
  mapReleaseGroupSearchToCanonical,
  extractArtistCreditsFromReleaseGroup
} from '../src/lib/musicbrainz';

// Test data - mix of popular and obscure artists/albums
const TEST_QUERIES = {
  artists: [
    'Nirvana',
    'Aphex Twin', 
    'Radiohead',
    'Flying Lotus',
    'Death Grips'
  ],
  albums: [
    'Nevermind',
    'Selected Ambient Works 85-92',
    'OK Computer',
    'Cosmogramma',
    'The Money Store'
  ]
};

interface TestResult {
  query: string;
  searchResults: any[];
  validatedResults: any[];
  mappedResults: any[];
  errors: string[];
  processingTime: number;
}

async function testArtistMapping(): Promise<TestResult[]> {
  console.log('🎤 Testing Artist Search & Mapping...\n');
  const results: TestResult[] = [];

  for (const query of TEST_QUERIES.artists) {
    const startTime = Date.now();
    const testResult: TestResult = {
      query,
      searchResults: [],
      validatedResults: [],
      mappedResults: [],
      errors: [],
      processingTime: 0
    };

    try {
      console.log(`Searching for artist: "${query}"`);
      
      // 1. Search MusicBrainz
      const searchResults = await musicbrainzService.searchArtists(query, 3); // Limit to 3 results
      testResult.searchResults = searchResults;
      console.log(`  Found ${searchResults.length} results`);

      // 2. Validate each result
      for (const [index, result] of searchResults.entries()) {
        try {
          const validated = validateArtistSearchResult(result);
          testResult.validatedResults.push(validated);
          console.log(`  ✅ Result ${index + 1}: ${validated.name} (${validated.country || 'Unknown country'})`);
        } catch (error) {
          const errorMsg = `Validation failed for result ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          testResult.errors.push(errorMsg);
          console.log(`  ❌ ${errorMsg}`);
        }
      }

      // 3. Map to canonical format
      for (const validated of testResult.validatedResults) {
        try {
          const mapped = mapArtistSearchToCanonical(validated);
          testResult.mappedResults.push(mapped);
          console.log(`  🔄 Mapped: ${mapped.name} -> MBID: ${mapped.musicbrainzId}`);
        } catch (error) {
          const errorMsg = `Mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          testResult.errors.push(errorMsg);
          console.log(`  ❌ ${errorMsg}`);
        }
      }

    } catch (error) {
      const errorMsg = `Search failed for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      testResult.errors.push(errorMsg);
      console.log(`  ❌ ${errorMsg}`);
    }

    testResult.processingTime = Date.now() - startTime;
    results.push(testResult);
    console.log(`  ⏱️  Processed in ${testResult.processingTime}ms\n`);
  }

  return results;
}

async function testAlbumMapping(): Promise<TestResult[]> {
  console.log('💿 Testing Album Search & Mapping...\n');
  const results: TestResult[] = [];

  for (const query of TEST_QUERIES.albums) {
    const startTime = Date.now();
    const testResult: TestResult = {
      query,
      searchResults: [],
      validatedResults: [],
      mappedResults: [],
      errors: [],
      processingTime: 0
    };

    try {
      console.log(`Searching for album: "${query}"`);
      
      // 1. Search MusicBrainz
      const searchResults = await musicbrainzService.searchReleaseGroups(query, 3);
      testResult.searchResults = searchResults;
      console.log(`  Found ${searchResults.length} results`);

      // 2. Validate each result
      for (const [index, result] of searchResults.entries()) {
        try {
          const validated = validateReleaseGroupSearchResult(result);
          testResult.validatedResults.push(validated);
          
          const artistNames = validated.artistCredit?.map(ac => ac.artist.name).join(', ') || 'Unknown artist';
          console.log(`  ✅ Result ${index + 1}: ${validated.title} by ${artistNames}`);
          
          // Test artist credit extraction
          const artistCredits = extractArtistCreditsFromReleaseGroup(validated);
          console.log(`    🎨 Artist credits: ${artistCredits.map(ac => `${ac.name} (pos: ${ac.position})`).join(', ')}`);
          
        } catch (error) {
          const errorMsg = `Validation failed for result ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          testResult.errors.push(errorMsg);
          console.log(`  ❌ ${errorMsg}`);
        }
      }

      // 3. Map to canonical format
      for (const validated of testResult.validatedResults) {
        try {
          const mapped = mapReleaseGroupSearchToCanonical(validated);
          testResult.mappedResults.push(mapped);
          console.log(`  🔄 Mapped: ${mapped.title} -> MBID: ${mapped.musicbrainzId}`);
          console.log(`    📅 Release date: ${mapped.releaseDate ? mapped.releaseDate.toISOString().split('T')[0] : 'Unknown'}`);
        } catch (error) {
          const errorMsg = `Mapping failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          testResult.errors.push(errorMsg);
          console.log(`  ❌ ${errorMsg}`);
        }
      }

    } catch (error) {
      const errorMsg = `Search failed for "${query}": ${error instanceof Error ? error.message : 'Unknown error'}`;
      testResult.errors.push(errorMsg);
      console.log(`  ❌ ${errorMsg}`);
    }

    testResult.processingTime = Date.now() - startTime;
    results.push(testResult);
    console.log(`  ⏱️  Processed in ${testResult.processingTime}ms\n`);
  }

  return results;
}

async function generateTestReport(artistResults: TestResult[], albumResults: TestResult[]) {
  console.log('📊 Generating Test Report...\n');

  const outputDir = join(process.cwd(), 'test-output');
  
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    console.log('Output directory already exists or creation failed');
  }

  // Summary stats
  const summary = {
    timestamp: new Date().toISOString(),
    totalQueries: artistResults.length + albumResults.length,
    totalSearchResults: [...artistResults, ...albumResults].reduce((sum, r) => sum + r.searchResults.length, 0),
    totalValidatedResults: [...artistResults, ...albumResults].reduce((sum, r) => sum + r.validatedResults.length, 0),
    totalMappedResults: [...artistResults, ...albumResults].reduce((sum, r) => sum + r.mappedResults.length, 0),
    totalErrors: [...artistResults, ...albumResults].reduce((sum, r) => sum + r.errors.length, 0),
    averageProcessingTime: [...artistResults, ...albumResults].reduce((sum, r) => sum + r.processingTime, 0) / (artistResults.length + albumResults.length),
    successRate: {
      validation: 0,
      mapping: 0
    }
  };

  const totalSearchResults = summary.totalSearchResults;
  summary.successRate.validation = totalSearchResults > 0 ? (summary.totalValidatedResults / totalSearchResults * 100) : 0;
  summary.successRate.mapping = summary.totalValidatedResults > 0 ? (summary.totalMappedResults / summary.totalValidatedResults * 100) : 0;

  // Write individual result files
  writeFileSync(
    join(outputDir, 'artist-test-results.json'), 
    JSON.stringify(artistResults, null, 2)
  );

  writeFileSync(
    join(outputDir, 'album-test-results.json'), 
    JSON.stringify(albumResults, null, 2)
  );

  // Write summary report
  writeFileSync(
    join(outputDir, 'test-summary.json'), 
    JSON.stringify(summary, null, 2)
  );

  // Write human-readable report
  const readableReport = `
# MusicBrainz Mapping Test Report
Generated: ${summary.timestamp}

## Summary
- Total Queries: ${summary.totalQueries}
- Total Search Results: ${summary.totalSearchResults}
- Successfully Validated: ${summary.totalValidatedResults} (${summary.successRate.validation.toFixed(1)}%)
- Successfully Mapped: ${summary.totalMappedResults} (${summary.successRate.mapping.toFixed(1)}%)
- Total Errors: ${summary.totalErrors}
- Average Processing Time: ${summary.averageProcessingTime.toFixed(0)}ms

## Artist Results
${artistResults.map(r => `
### "${r.query}"
- Search Results: ${r.searchResults.length}
- Validated: ${r.validatedResults.length}
- Mapped: ${r.mappedResults.length}
- Errors: ${r.errors.length}
- Processing Time: ${r.processingTime}ms
${r.errors.length > 0 ? `- Error Details: ${r.errors.join('; ')}` : ''}
`).join('')}

## Album Results
${albumResults.map(r => `
### "${r.query}"
- Search Results: ${r.searchResults.length}
- Validated: ${r.validatedResults.length}
- Mapped: ${r.mappedResults.length}
- Errors: ${r.errors.length}
- Processing Time: ${r.processingTime}ms
${r.errors.length > 0 ? `- Error Details: ${r.errors.join('; ')}` : ''}
`).join('')}

## Sample Mapped Data

### Sample Artist:
\`\`\`json
${artistResults.find(r => r.mappedResults.length > 0)?.mappedResults[0] ? JSON.stringify(artistResults.find(r => r.mappedResults.length > 0)!.mappedResults[0], null, 2) : 'No successful mappings'}
\`\`\`

### Sample Album:
\`\`\`json
${albumResults.find(r => r.mappedResults.length > 0)?.mappedResults[0] ? JSON.stringify(albumResults.find(r => r.mappedResults.length > 0)!.mappedResults[0], null, 2) : 'No successful mappings'}
\`\`\`
`;

  writeFileSync(join(outputDir, 'test-report.md'), readableReport);

  console.log(`📄 Test results written to: ${outputDir}/`);
  console.log(`   - artist-test-results.json (detailed artist data)`);
  console.log(`   - album-test-results.json (detailed album data)`);
  console.log(`   - test-summary.json (stats summary)`);
  console.log(`   - test-report.md (human-readable report)`);
  
  return summary;
}

async function main() {
  console.log('🧪 MusicBrainz Mapping Test Suite\n');
  console.log('This will test the complete flow: search -> validate -> map\n');

  try {
    // Test artist mapping
    const artistResults = await testArtistMapping();
    
    // Small delay to be nice to MusicBrainz
    console.log('⏳ Waiting 2 seconds before album tests...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test album mapping
    const albumResults = await testAlbumMapping();
    
    // Generate report
    const summary = await generateTestReport(artistResults, albumResults);
    
    console.log('\n🎉 Test Suite Complete!');
    console.log(`✅ Success Rate: ${summary.successRate.mapping.toFixed(1)}% mapping success`);
    console.log(`⚡ Average Time: ${summary.averageProcessingTime.toFixed(0)}ms per query`);
    
    if (summary.totalErrors > 0) {
      console.log(`⚠️  ${summary.totalErrors} errors encountered - check test-report.md for details`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runMusicBrainzMappingTest };
