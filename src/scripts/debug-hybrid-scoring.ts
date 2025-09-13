#!/usr/bin/env tsx
// src/scripts/debug-hybrid-scoring.ts
// Debug the hybrid scoring system by calling MusicBrainz directly

import { musicbrainzService } from '@/lib/musicbrainz/basic-service';

// Test cases from our pool
const testCases = [
  { title: "Discovery", artist: "Daft Punk" },
  { title: "To Pimp a Butterfly", artist: "Kendrick Lamar" },
  { title: "Selected Ambient Works 85-92", artist: "Aphex Twin" },
  { title: "OK Computer", artist: "Radiohead" },
  { title: "Kind of Blue", artist: "Miles Davis" },
];

// Jaccard similarity function (copied from our processor)
function calculateStringSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Our hybrid scoring logic
function calculateHybridScore(
  mbScore: number,
  titleSimilarity: number,
  artistSimilarity: number
): { combined: number; mbScore: number; jaccardScore: number } {
  // Jaccard similarity weighted: title 60%, artist 40%
  const jaccardScore = titleSimilarity * 0.6 + artistSimilarity * 0.4;
  
  // Hybrid: MB score 70%, Jaccard 30%
  const combinedScore = (mbScore / 100) * 0.7 + jaccardScore * 0.3;
  
  return {
    combined: combinedScore,
    mbScore: mbScore,
    jaccardScore: jaccardScore
  };
}

async function debugHybridScoring() {
  console.log('🔍 Debugging Hybrid Scoring System');
  console.log('🎯 Testing actual MusicBrainz search results vs our algorithm\n');

  for (const testCase of testCases) {
    console.log(`\n📀 Testing: "${testCase.title}" by ${testCase.artist}`);
    console.log('═'.repeat(60));

    try {
      // Search MusicBrainz
      const searchResults = await musicbrainzService.searchReleaseGroups(
        `releasegroup:"${testCase.title}" AND artist:"${testCase.artist}" AND type:album AND status:official`,
        5
      );

      if (!searchResults || searchResults.length === 0) {
        console.log('❌ No search results found');
        continue;
      }

      console.log(`🔍 Found ${searchResults.length} results:`);

      // Analyze each result
      searchResults.forEach((result, index) => {
        console.log(`\n  ${index + 1}. "${result.title}" by ${result.artistCredit?.map(ac => ac.name).join(', ')}`);
        console.log(`     MusicBrainz Score: ${result.score}/100`);

        // Calculate our similarities
        const titleSimilarity = calculateStringSimilarity(
          testCase.title.toLowerCase(),
          result.title.toLowerCase()
        );

        let artistSimilarity = 0;
        if (result.artistCredit && result.artistCredit.length > 0) {
          const resultArtist = result.artistCredit[0].name?.toLowerCase() || '';
          artistSimilarity = calculateStringSimilarity(
            testCase.artist.toLowerCase(),
            resultArtist
          );
        }

        // Calculate hybrid score
        const scores = calculateHybridScore(result.score, titleSimilarity, artistSimilarity);

        console.log(`     Title Similarity: ${(titleSimilarity * 100).toFixed(1)}%`);
        console.log(`     Artist Similarity: ${(artistSimilarity * 100).toFixed(1)}%`);
        console.log(`     Jaccard Combined: ${(scores.jaccardScore * 100).toFixed(1)}%`);
        console.log(`     🎯 HYBRID SCORE: ${(scores.combined * 100).toFixed(1)}%`);
        console.log(`     ${scores.combined > 0.8 ? '✅ PASS' : '❌ FAIL'} (80% threshold)`);
      });

      // Show best match
      const bestMatch = searchResults.reduce((best, current) => {
        const currentTitleSim = calculateStringSimilarity(
          testCase.title.toLowerCase(), 
          current.title.toLowerCase()
        );
        const currentArtistSim = result.artistCredit && result.artistCredit.length > 0 
          ? calculateStringSimilarity(testCase.artist.toLowerCase(), result.artistCredit[0].name?.toLowerCase() || '')
          : 0;
        const currentScore = calculateHybridScore(current.score, currentTitleSim, currentArtistSim);

        if (!best) return { result: current, score: currentScore };
        
        const bestTitleSim = calculateStringSimilarity(
          testCase.title.toLowerCase(),
          best.result.title.toLowerCase()
        );
        const bestArtistSim = best.result.artistCredit && best.result.artistCredit.length > 0
          ? calculateStringSimilarity(testCase.artist.toLowerCase(), best.result.artistCredit[0].name?.toLowerCase() || '')
          : 0;
        const bestScore = calculateHybridScore(best.result.score, bestTitleSim, bestArtistSim);

        return currentScore.combined > bestScore.combined ? { result: current, score: currentScore } : best;
      }, null);

      if (bestMatch) {
        console.log(`\n🏆 BEST MATCH: "${bestMatch.result.title}"`);
        console.log(`   Combined Score: ${(bestMatch.score.combined * 100).toFixed(1)}%`);
        console.log(`   Decision: ${bestMatch.score.combined > 0.8 ? 'ENRICH ✅' : 'SKIP ❌'}`);
      }

    } catch (error) {
      console.error(`❌ Error testing ${testCase.title}:`, error);
    }

    console.log('\n' + '─'.repeat(60));
  }

  console.log('\n🎉 Hybrid Scoring Debug Complete!');
  console.log('\n💡 Key Insights:');
  console.log('   • MusicBrainz scores range 0-100 (perfect matches = 100)');
  console.log('   • Our Jaccard similarity: exact word overlap ratio');
  console.log('   • Hybrid: 70% MB + 30% Jaccard > 80% threshold');
  console.log('   • Failed matches likely due to title/artist variations');
}

debugHybridScoring().catch(console.error);
