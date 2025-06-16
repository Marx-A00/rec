import { Client } from 'disconnect';
import { NextResponse } from 'next/server';
import chalk from 'chalk';

import { DiscogsMaster } from '@/types/discogs/master';

const log = console.log;

const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '25');

  log(chalk.blue('🎯 Fetching MASTERS for artist:'), chalk.yellow(id));

  if (!id) {
    log(chalk.red('❌ Missing artist ID parameter'));
    return NextResponse.json(
      { error: 'Artist ID is required', success: false },
      { status: 400 }
    );
  }

  try {
    const client = new Client({
      userAgent: 'RecProject/1.0 +http://localhost:3000',
      consumerKey: process.env.CONSUMER_KEY,
      consumerSecret: process.env.CONSUMER_SECRET,
    });
    const db = client.database();

    // Step 1: Get artist information to get the artist name
    log(chalk.cyan('📡 Fetching artist information...'));
    const artistInfo = await db.getArtist(id);
    const artistName = artistInfo.name;

    log(chalk.blue('🎤 Artist name:'), chalk.yellow(artistName));

    // Step 2: Use search API to find masters by this artist
    // This is MUCH more efficient than fetching all releases
    log(chalk.cyan('🔍 Searching for masters by artist...'));

    const searchResults = await db.search({
      type: 'master',
      artist: artistName,
      page: page,
      per_page: perPage,
    });

    log(chalk.green('✅ Search completed:'));
    log(chalk.yellow(`  Found: ${searchResults.results?.length || 0} masters`));
    log(
      chalk.yellow(
        `  Total: ${searchResults.pagination?.items || 0} masters available`
      )
    );

    if (!searchResults.results || searchResults.results.length === 0) {
      return NextResponse.json({
        error: `No masters found for ${artistName}`,
        success: false,
        pagination: searchResults.pagination || null,
        artistName,
        artistId: id,
      });
    }

    // Step 3: Filter search results to ensure they're actually by this artist
    // (search can sometimes return collaborations or similar artist names)
    const filteredMasters = searchResults.results.filter((result: any) => {
      // Check if any of the artists in the result match our target artist
      if (result.artists && Array.isArray(result.artists)) {
        return result.artists.some(
          (artist: any) =>
            artist.name === artistName || artist.id === parseInt(id)
        );
      }
      // Fallback: check if artist name appears in the result
      return (
        result.artist === artistName ||
        (result.artist && result.artist.includes(artistName))
      );
    });

    log(
      chalk.blue('🎯 After filtering:'),
      chalk.yellow(`${filteredMasters.length} verified masters`)
    );

    // Step 4: Fetch detailed data for the masters
    log(chalk.cyan('📡 Fetching detailed master data...'));

    const masterDetails = await Promise.all(
      filteredMasters.map(async (masterResult: any, index: number) => {
        try {
          log(
            chalk.cyan(
              `📡 Fetching master ${index + 1}/${filteredMasters.length}:`
            ),
            chalk.yellow(masterResult.title)
          );
          const detailedMaster = await db.getMaster(masterResult.id);
          return detailedMaster;
        } catch (error) {
          log(
            chalk.red(`❌ Failed to fetch master ${masterResult.id}:`, error)
          );
          return null;
        }
      })
    );

    const validMasters = masterDetails.filter(
      (master: any): master is DiscogsMaster => master !== null
    );

    log(
      chalk.green(
        `✅ Successfully fetched ${validMasters.length} detailed masters!`
      )
    );

    // Step 5: Sort masters by year (newest first)
    const sortedMasters = validMasters.sort(
      (a: DiscogsMaster, b: DiscogsMaster) => {
        const yearA = a.year || 0;
        const yearB = b.year || 0;
        return yearB - yearA; // Descending order (newest first)
      }
    );

    // Step 6: Display summary
    log(chalk.magenta('='.repeat(60)));
    log(chalk.magenta('🎯 MASTERS SUMMARY'));
    log(chalk.magenta('='.repeat(60)));

    sortedMasters.forEach((master: DiscogsMaster, index: number) => {
      log(
        chalk.blue(
          `📀 ${index + 1}. ${master.title} (${master.year || 'Unknown'})`
        )
      );
      log(
        chalk.gray(
          `   Artists: ${master.artists.map((a: any) => a.name).join(', ')}`
        )
      );
      log(chalk.gray(`   Genres: ${master.genres?.join(', ') || 'None'}`));
      log(chalk.gray(`   Tracks: ${master.tracklist?.length || 0}`));
    });

    // Step 7: Return results with pagination
    return NextResponse.json({
      success: true,
      artistId: id,
      artistName,
      masters: sortedMasters,
      pagination: searchResults.pagination,
      searchInfo: {
        totalFound: searchResults.pagination?.items || 0,
        currentPage: page,
        resultsThisPage: sortedMasters.length,
        filteredFromSearch: filteredMasters.length,
        searchResultsCount: searchResults.results?.length || 0,
      },
    });
  } catch (error) {
    log(chalk.red('❌ Error fetching masters:'), error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch masters',
        success: false,
      },
      { status: 500 }
    );
  }
}
