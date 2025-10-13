// scripts/test-fuzzy-match.ts
/**
 * Test script for fuzzy matching utility
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { searchLastFmArtists } from '../src/lib/lastfm/search';
import {
  findLastFmMatch,
  normalizeArtistName,
  getMatchConfidence,
} from '../src/lib/utils/fuzzy-match';

console.log('🧪 Testing Fuzzy Matching Utility\n');

// Test 1: Normalization
console.log('Test 1: Artist name normalization');
console.log('---');
const testCases = [
  { input: 'A$AP Rocky', expected: 'asap rocky' },
  { input: 'Björk & The Gang', expected: 'bjork and the gang' },
  { input: 'Death  Grips', expected: 'death grips' },
  { input: 'Pink Floyd', expected: 'pink floyd' },
];

for (const { input, expected } of testCases) {
  const normalized = normalizeArtistName(input);
  const status = normalized === expected ? '✅' : '❌';
  console.log(`${status} "${input}" → "${normalized}" (expected: "${expected}")`);
}

// Test 2: Match confidence levels
console.log('\nTest 2: Match confidence levels');
console.log('---');
const scores = [
  { score: -500, expected: 'high' },
  { score: -2000, expected: 'medium' },
  { score: -4000, expected: 'low' },
  { score: -6000, expected: 'none' },
];

for (const { score, expected } of scores) {
  const confidence = getMatchConfidence(score);
  const status = confidence === expected ? '✅' : '❌';
  console.log(`${status} Score ${score} → ${confidence} (expected: ${expected})`);
}

// Test 3: Fuzzy matching with real Last.fm data
console.log('\nTest 3: Fuzzy matching with real Last.fm data');
console.log('---');

async function testFuzzyMatching() {
  try {
    // Test exact match
    console.log('\n3a. Testing exact match: "Pink Floyd"');
    const pinkFloydResults = await searchLastFmArtists('Pink Floyd');
    const pinkFloydMatch = findLastFmMatch('Pink Floyd', pinkFloydResults);

    if (pinkFloydMatch) {
      console.log(`✅ Match found: "${pinkFloydMatch.match.name}"`);
      console.log(`   Score: ${pinkFloydMatch.score}`);
      console.log(`   Confidence: ${pinkFloydMatch.confidence}`);
    } else {
      console.log('❌ No match found');
    }

    // Test case-insensitive match
    console.log('\n3b. Testing case-insensitive: "radiohead" → "Radiohead"');
    const radioheadResults = await searchLastFmArtists('Radiohead');
    const radioheadMatch = findLastFmMatch('radiohead', radioheadResults);

    if (radioheadMatch) {
      console.log(`✅ Match found: "${radioheadMatch.match.name}"`);
      console.log(`   Score: ${radioheadMatch.score}`);
      console.log(`   Confidence: ${radioheadMatch.confidence}`);
    } else {
      console.log('❌ No match found');
    }

    // Test special characters
    console.log('\n3c. Testing special characters: "A$AP Rocky" → "ASAP Rocky"');
    const asapResults = await searchLastFmArtists('ASAP Rocky');
    const asapMatch = findLastFmMatch('A$AP Rocky', asapResults);

    if (asapMatch) {
      console.log(`✅ Match found: "${asapMatch.match.name}"`);
      console.log(`   Score: ${asapMatch.score}`);
      console.log(`   Confidence: ${asapMatch.confidence}`);
    } else {
      console.log('❌ No match found');
    }

    // Test spacing variations
    console.log('\n3d. Testing spacing: "Death  Grips" (double space)');
    const deathGripsResults = await searchLastFmArtists('Death Grips');
    const deathGripsMatch = findLastFmMatch('Death  Grips', deathGripsResults);

    if (deathGripsMatch) {
      console.log(`✅ Match found: "${deathGripsMatch.match.name}"`);
      console.log(`   Score: ${deathGripsMatch.score}`);
      console.log(`   Confidence: ${deathGripsMatch.confidence}`);
    } else {
      console.log('❌ No match found');
    }

    // Test no match (gibberish)
    console.log('\n3e. Testing no match: "XYZ123NotAnArtist"');
    const noMatchResults = await searchLastFmArtists('Pink Floyd');
    const noMatch = findLastFmMatch('XYZ123NotAnArtist', noMatchResults);

    if (noMatch) {
      console.log(`⚠️ Unexpected match found: "${noMatch.match.name}"`);
      console.log(`   Score: ${noMatch.score}`);
      console.log(`   Confidence: ${noMatch.confidence}`);
    } else {
      console.log('✅ No match found (as expected)');
    }

    console.log('\n✅ All fuzzy matching tests completed!');
  } catch (error) {
    console.error('\n❌ Error during fuzzy matching tests:', error);
  }
}

testFuzzyMatching();
