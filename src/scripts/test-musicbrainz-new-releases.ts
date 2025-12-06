// Test MusicBrainz date-based search for new releases
// Using native fetch (Node 18+)

async function testMusicBrainzNewReleases() {
  console.log('🧪 Testing MusicBrainz New Releases Search...\n');

  // Get releases from the last 7 days
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const fromDate = weekAgo.toISOString().split('T')[0]; // YYYY-MM-DD
  const toDate = today.toISOString().split('T')[0];

  console.log(`📅 Searching for releases from ${fromDate} to ${toDate}\n`);

  // Build MusicBrainz query with filters
  // Available filters:
  // - primarytype: Album, EP, Single
  // - secondarytype: Compilation, Soundtrack, Live, Remix
  // - tag: genre tags like "rock", "pop", "electronic", "hip hop"
  // - status: Official, Promotion, Bootleg
  // - releases: number of releases (more = more popular/important)

  // Test 1: Basic query (all albums)
  const query = `firstreleasedate:[${fromDate} TO ${toDate}] AND primarytype:Album`;
  const url = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(query)}&fmt=json&limit=25`;

  console.log('\n=== TEST 1: All Albums ===');
  await testQuery(url, query);

  await sleep(1000); // Rate limit

  // Test 2: Filter by tag (rock/pop/electronic)
  const queryWithTag = `firstreleasedate:[${fromDate} TO ${toDate}] AND primarytype:Album AND (tag:rock OR tag:pop OR tag:"hip hop" OR tag:electronic OR tag:indie)`;
  const urlWithTag = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(queryWithTag)}&fmt=json&limit=25`;

  console.log('\n=== TEST 2: Popular Genres Only ===');
  await testQuery(urlWithTag, queryWithTag);

  await sleep(1000);

  // Test 3: Sort by number of releases (popularity proxy)
  const queryPopular = `firstreleasedate:[${fromDate} TO ${toDate}] AND primarytype:Album`;
  const urlPopular = `https://musicbrainz.org/ws/2/release-group?query=${encodeURIComponent(queryPopular)}&fmt=json&limit=50`;

  console.log('\n=== TEST 3: More Results (50) to Filter Client-Side ===');
  await testQuery(urlPopular, queryPopular, true);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testQuery(url: string, query: string, filterByReleases = false) {

  console.log('🔍 Query:', query);
  console.log('🌐 URL:', url);
  console.log('');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RecApp/1.0.0 ( contact@rec.app )',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: any = await response.json();

    console.log('✅ Search successful!\n');
    console.log(`📊 Results: ${data['release-groups']?.length || 0} albums found`);
    console.log('');

    if (data['release-groups'] && data['release-groups'].length > 0) {
      let results = data['release-groups'];

      // If filtering by releases count (popularity proxy)
      if (filterByReleases) {
        results = results
          .filter((rg: any) => {
            // Filter out releases with very few versions (likely obscure)
            const releaseCount = rg.releases?.length || 0;
            return releaseCount >= 2; // At least 2 releases = somewhat popular
          })
          .slice(0, 25); // Take top 25

        console.log(`📊 Filtered to ${results.length} more popular releases\n`);
      }

      console.log('🎵 New Releases:\n');
      results.forEach((rg: any, index: number) => {
        const artistName =
          rg['artist-credit']?.map((ac: any) => ac.name).join(', ') || 'Unknown';
        const releaseDate = rg['first-release-date'] || 'Unknown date';
        const releaseCount = rg.releases?.length || 0;
        const tags = rg.tags?.slice(0, 3).map((t: any) => t.name).join(', ') || 'No tags';

        console.log(`${index + 1}. "${rg.title}" by ${artistName}`);
        console.log(`   Release Date: ${releaseDate}`);
        console.log(`   Type: ${rg['primary-type'] || 'Unknown'}`);
        console.log(`   Releases: ${releaseCount} versions`);
        console.log(`   Tags: ${tags}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No releases found for this date range');
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch:', error.message);
  }
}

testMusicBrainzNewReleases();
