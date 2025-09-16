// src/scripts/migrate-production-data-v2.ts
// Enhanced migration script with MusicBrainz enrichment and proper dependency handling

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { musicBrainzService } from '../lib/musicbrainz/musicbrainz-service';

// Import the track processing function - we'll copy the implementation to avoid export issues
// The function will be defined below to keep migration self-contained

const prisma = new PrismaClient();

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

const log = {
  // Headers and sections
  header: (text: string) => console.log(chalk.bold.cyan(`\n${'='.repeat(60)}\n${text}\n${'='.repeat(60)}`)),
  section: (text: string) => console.log(chalk.bold.blue(`\n${text}`)),
  step: (step: number, text: string) => console.log(chalk.bold.magenta(`\n👥 Step ${step}: ${text}...`)),
  
  // Progress and status
  progress: (current: number, total: number, item: string, duration?: string) => {
    const percentage = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    const durationStr = duration ? chalk.gray(` - ${duration}`) : '';
    console.log(chalk.yellow(`📊 ${item}: ${current}/${total} (${percentage}%) [${progressBar}]${durationStr}`));
  },
  
  // Success states
  success: (text: string) => console.log(chalk.green(`✅ ${text}`)),
  complete: (text: string) => console.log(chalk.bold.green(`✅ ${text}`)),
  created: (count: number, item: string, duration?: string) => {
    const durationStr = duration ? chalk.gray(` in ${duration}`) : '';
    console.log(chalk.green(`✅ ${item}: ${count}/${count} (100%)${durationStr}`));
  },
  
  // Information states
  info: (text: string) => console.log(chalk.blue(`ℹ️  ${text}`)),
  mode: (text: string) => console.log(chalk.bold.blue(`📋 ${text}`)),
  test: (text: string) => console.log(chalk.bold.yellow(`🧪 ${text}`)),
  
  // Processing states
  search: (text: string) => console.log(chalk.cyan(`🔍 ${text}`)),
  enrich: (text: string) => console.log(chalk.magenta(`🎵 ${text}`)),
  create: (text: string) => console.log(chalk.blue(`🆕 ${text}`)),
  update: (text: string) => console.log(chalk.yellow(`🔄 ${text}`)),
  
  // Warning and error states  
  warn: (text: string) => console.log(chalk.yellow(`⚠️  ${text}`)),
  error: (text: string) => console.log(chalk.red(`❌ ${text}`)),
  
  // Special states
  match: (text: string) => console.log(chalk.green(`✅ ${text}`)),
  noMatch: (text: string) => console.log(chalk.red(`❌ ${text}`)),
  track: (text: string) => console.log(chalk.cyan(`🎵 ${text}`)),
  isrc: (text: string) => console.log(chalk.magenta(`🏷️  ${text}`)),
  
  // Summary stats
  stats: (title: string, stats: Record<string, number>) => {
    console.log(chalk.bold.green(`\n📊 ${title}`));
    console.log(chalk.bold.green('====================================='));
    Object.entries(stats).forEach(([key, value]) => {
      console.log(chalk.white(`${key}: ${chalk.bold.cyan(value)}`));
    });
  }
};

// ============================================================================
// TYPES - Old Schema Interfaces
// ============================================================================

interface OldSchemaUser {
  id: string;
  email: string;
  displayName: string | null;
  avatar: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OldSchemaCollection {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OldSchemaCollectionAlbum {
  id: string;
  collectionId: string;
  albumDiscogsId: string;
  albumTitle: string;
  albumArtist: string;
  albumYear: number | null;
  albumImageUrl: string | null;
  personalRating: number | null;
  personalNotes: string | null;
  position: number;
  addedAt: Date;
}

interface OldSchemaRecommendation {
  id: string;
  score: number;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  basisAlbumDiscogsId: string;
  basisAlbumTitle: string;
  basisAlbumArtist: string;
  basisAlbumYear: number | null;
  basisAlbumImageUrl: string | null;
  recommendedAlbumDiscogsId: string;
  recommendedAlbumTitle: string;
  recommendedAlbumArtist: string;
  recommendedAlbumYear: number | null;
  recommendedAlbumImageUrl: string | null;
}

interface OldSchemaUserFollow {
  followerId: string;
  followedId: string;
  createdAt: Date;
}

// ============================================================================
// TYPES - Migration Results
// ============================================================================

interface MigrationStats {
  usersCreated: number;
  collectionsCreated: number;
  albumsCreated: number;
  artistsCreated: number;
  albumArtistRelationsCreated: number;
  collectionAlbumsCreated: number;
  recommendationsCreated: number;
  userFollowsCreated: number;
  musicbrainzLookups: number;
  musicbrainzMatches: number;
}

// ============================================================================
// TYPES - Album Enrichment
// ============================================================================

interface DiscogsAlbumData {
  discogsId: string;
  title: string;
  artist: string;
  year: number | null;
  imageUrl: string | null;
}

interface MusicBrainzAlbumResult {
  id: string;  // MusicBrainz UUID
  title: string;
  releaseDate: string | null;
  coverArtUrl: string | null;
  artistCredits: Array<{
    artist: {
      id: string;
      name: string;
    };
  }>;
  releaseGroup?: {
    primaryType: string;
    secondaryTypes: string[];
  };
  labelInfo?: Array<{
    label: {
      name: string;
    };
    catalogNumber: string;
  }>;
}

// ============================================================================
// UTILITIES
// ============================================================================

class MigrationProgress {
  private completed = 0;
  private startTime = Date.now();

  constructor(private total: number, private taskName: string) {
    console.log(`📊 Starting ${taskName}: 0/${total}`);
  }

  update(completed: number) {
    this.completed = completed;
    const percent = Math.round((completed / this.total) * 100);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    process.stdout.write(`\r📊 ${this.taskName}: ${completed}/${this.total} (${percent}%) - ${elapsed}s`);
  }

  done() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n✅ ${this.taskName} complete: ${this.completed}/${this.total} in ${elapsed}s`);
  }
}

// ============================================================================
// MUSICBRAINZ ENRICHMENT FUNCTIONS
// ============================================================================

async function searchMusicBrainzAlbum(title: string, artist: string): Promise<MusicBrainzAlbumResult | null> {
  try {
    log.search(`Searching MusicBrainz: ${chalk.yellow(title)} by ${chalk.cyan(artist)}`);
    
    // Try multiple search strategies for better compilation matching
    const searchStrategies = [
      // Standard album search
      `releasegroup:"${title}" AND artist:"${artist}" AND type:album AND status:official`,
      // Compilation-specific search  
      `releasegroup:"${title}" AND artist:"${artist}" AND type:compilation AND status:official`,
      // Broader search without type restriction
      `releasegroup:"${title}" AND artist:"${artist}" AND status:official`,
      // Fuzzy title search for slight variations
      `releasegroup:${title.replace(/[^\w\s]/g, '').split(' ').join(' AND ')} AND artist:"${artist}"`,
    ];
    
    for (const [index, query] of searchStrategies.entries()) {
      try {
        const releaseGroups = await musicBrainzService.safeSearchReleaseGroups(query, 5);
        
        if (releaseGroups.length > 0) {
          const bestMatch = releaseGroups[0];
          const threshold = index === 0 ? 85 : (index === 1 ? 80 : 75); // Lower threshold for compilation searches
          
          if (bestMatch.score >= threshold) {
            log.match(`Found MusicBrainz match: ${chalk.green(bestMatch.id)} (score: ${chalk.bold(bestMatch.score)}, strategy: ${index + 1})`);
            
            // Convert to our expected format
            return {
              id: bestMatch.id,
              title: bestMatch.title,
              releaseDate: bestMatch.firstReleaseDate || null,
              coverArtUrl: null, // Will be fetched separately
              artistCredits: bestMatch.artistCredit || [],
              releaseGroup: {
                primaryType: bestMatch.primaryType || 'Album',
                secondaryTypes: bestMatch.secondaryTypes || []
              }
            };
          }
        }
      } catch (error) {
        log.warn(`Search strategy ${index + 1} failed: ${error}`);
        continue;
      }
    }
    
    log.noMatch(`No MusicBrainz match found for: ${chalk.yellow(title)} by ${chalk.cyan(artist)}`);
    return null;
    
  } catch (error) {
    log.error(`MusicBrainz search failed for ${title} by ${artist}: ${error}`);
    return null;
  }
}

async function getCoverArtUrl(musicbrainzId: string): Promise<string | null> {
  try {
    const url = `https://coverartarchive.org/release/${musicbrainzId}`;
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      if (data.images && data.images.length > 0) {
        // Get the front cover or first available image
        const frontCover = data.images.find((img: any) => img.front) || data.images[0];
        return frontCover.image;
      }
    }
    return null;
  } catch (error) {
    console.error(`❌ Cover art fetch failed for ${musicbrainzId}:`, error);
    return null;
  }
}

// ============================================================================
// ALBUM ENRICHMENT - Core Function
// ============================================================================

const albumCache = new Map<string, string>(); // discogsId -> albumId

async function findOrCreateEnrichedAlbum(discogsData: DiscogsAlbumData): Promise<{ id: string; isNew: boolean; albumArtistRelations: number }> {
  // Check cache first
  if (albumCache.has(discogsData.discogsId)) {
    return { id: albumCache.get(discogsData.discogsId)!, isNew: false, albumArtistRelations: 0 };
  }
  
  // Check if album already exists in DB
  const existing = await prisma.album.findFirst({
    where: { discogsId: discogsData.discogsId }
  });
  
  if (existing) {
    albumCache.set(discogsData.discogsId, existing.id);
    return { id: existing.id, isNew: false, albumArtistRelations: 0 };
  }
  
  // Search MusicBrainz for enrichment
  const mbResult = await searchMusicBrainzAlbum(discogsData.title, discogsData.artist);
  
  let albumData: any = {
    title: discogsData.title,
    discogsId: discogsData.discogsId,
    source: 'DISCOGS',
    dataQuality: 'MEDIUM',
    enrichmentStatus: 'PENDING'
  };
  
  // Enrich with MusicBrainz data if found
  if (mbResult) {
      log.enrich(`Enriching album with MusicBrainz data: ${chalk.green(mbResult.id)}`);
    
    const coverArtUrl = await getCoverArtUrl(mbResult.id);
    
    albumData = {
      ...albumData,
      musicbrainzId: mbResult.id,
      title: mbResult.title, // Use MusicBrainz canonical title
      releaseDate: mbResult.releaseDate ? new Date(mbResult.releaseDate) : null,
      coverArtUrl: coverArtUrl || discogsData.imageUrl,
      releaseType: mbResult.releaseGroup?.primaryType || null,
      secondaryTypes: mbResult.releaseGroup?.secondaryTypes || [],
      label: mbResult.labelInfo?.[0]?.label?.name || null,
      catalogNumber: mbResult.labelInfo?.[0]?.catalogNumber || null,
      source: 'MUSICBRAINZ', // Upgraded to MusicBrainz source
      dataQuality: 'HIGH',
      enrichmentStatus: 'COMPLETED'
    };
  } else {
    // Fallback to Discogs data only
    log.create(`Creating album with Discogs data only: ${chalk.yellow(discogsData.title)}`);
    albumData.coverArtUrl = discogsData.imageUrl;
    albumData.releaseDate = discogsData.year ? new Date(`${discogsData.year}-01-01`) : null;
  }
  
  // Create the album
  const album = await prisma.album.create({ data: albumData });
  
  // Handle artist relationships
  const albumArtistRelations = await createAlbumArtistRelationships(album.id, discogsData.artist, mbResult || undefined);
  
  // 🎵 FETCH TRACKS if we have MusicBrainz data (reusing existing queue logic)
  if (mbResult && mbResult.id) {
    try {
      log.track(`Fetching tracks for "${chalk.yellow(discogsData.title)}" from MusicBrainz...`);
      
      // Get release group to find the primary release
      const releaseGroup = await musicBrainzService.getReleaseGroup(mbResult.id, ['releases']);
      
      if (releaseGroup?.releases && releaseGroup.releases.length > 0) {
        // Get the first release (main edition) with all tracks
        const primaryRelease = releaseGroup.releases[0];
        
        const releaseWithTracks = await musicBrainzService.getRelease(primaryRelease.id, [
          'recordings',      // Get all track data
          'artist-credits', // Track-level artist info
          'isrcs',          // Track ISRCs
          'url-rels'        // Track URLs (YouTube, etc.)
        ]);
        
        if (releaseWithTracks?.media) {
          const totalTracks = releaseWithTracks.media.reduce((sum: number, medium: any) => 
            sum + (medium.tracks?.length || 0), 0);
          log.success(`Fetched ${chalk.bold(totalTracks)} tracks for "${chalk.yellow(discogsData.title)}" during migration!`);
          
          // Use existing track processing function from queue
          await processMusicBrainzTracksForAlbum(album.id, releaseWithTracks);
        }
      }
    } catch (error) {
      log.warn(`Failed to fetch tracks for "${discogsData.title}": ${error}`);
    }
  }
  
  albumCache.set(discogsData.discogsId, album.id);
  return { id: album.id, isNew: true, albumArtistRelations };
}

// ============================================================================
// ARTIST MANAGEMENT
// ============================================================================

const artistCache = new Map<string, string>(); // artistName -> artistId

async function findOrCreateArtist(artistName: string, mbArtistData?: any): Promise<string> {
  // Check cache first
  if (artistCache.has(artistName)) {
    return artistCache.get(artistName)!;
  }
  
  // Check if artist already exists
  const existing = await prisma.artist.findFirst({
    where: { name: artistName }
  });
  
  if (existing) {
    artistCache.set(artistName, existing.id);
    return existing.id;
  }
  
  // Create new artist
  let artistData: any = {
    name: artistName,
    source: 'DISCOGS',
    dataQuality: 'MEDIUM',
    enrichmentStatus: 'PENDING'
  };
  
  // Enrich with MusicBrainz data if available
  if (mbArtistData) {
    artistData = {
      ...artistData,
      musicbrainzId: mbArtistData.id,
      biography: mbArtistData.disambiguation || null,
      formedYear: mbArtistData.lifeSpan?.begin ? parseInt(mbArtistData.lifeSpan.begin.split('-')[0]) : null,
      countryCode: mbArtistData.country || null,
      artistType: mbArtistData.type || null,
      source: 'MUSICBRAINZ',
      dataQuality: 'HIGH',
      enrichmentStatus: 'COMPLETED'
    };
  }
  
  const artist = await prisma.artist.create({ data: artistData });
  artistCache.set(artistName, artist.id);
  return artist.id;
}

async function createAlbumArtistRelationships(albumId: string, artistName: string, mbResult?: MusicBrainzAlbumResult): Promise<number> {
  let relationsCreated = 0;
  
  console.log(`🔗 Creating album-artist relationships for album ${albumId} with artist "${artistName}"`);
  
  try {
    if (mbResult && mbResult.artistCredits && mbResult.artistCredits.length > 0) {
      console.log(`📀 Using MusicBrainz artist credits (${mbResult.artistCredits.length} artists)`);
      
      // Use MusicBrainz artist credits (more accurate)
      for (let i = 0; i < mbResult.artistCredits.length; i++) {
        const credit = mbResult.artistCredits[i];
        
        // Enrich artist with MusicBrainz data
        let mbArtistData = null;
        try {
          const artistSearchResults = await musicBrainzService.safeSearchArtists(credit.artist.name, 1);
          if (artistSearchResults.length > 0) {
            mbArtistData = artistSearchResults[0];
          }
        } catch (error) {
          console.warn(`⚠️ Could not enrich artist ${credit.artist.name}:`, error);
        }
        
        const artistId = await findOrCreateArtist(credit.artist.name, mbArtistData);
        const role = i === 0 ? 'primary' : 'featured';
        
        // Check if relationship already exists to avoid duplicates
        const existing = await prisma.albumArtist.findUnique({
          where: {
            albumId_artistId_role: {
              albumId,
              artistId,
              role
            }
          }
        });

        if (existing) {
          console.log(`⚠️ AlbumArtist relationship already exists: ${credit.artist.name} (${role})`);
        } else {
          const relation = await prisma.albumArtist.create({
            data: {
              albumId,
              artistId,
              role,
              position: i
            }
          });
          
          console.log(`✅ Created album-artist relation: ${credit.artist.name} (${relation.role})`);
          relationsCreated++;
        }
      }
    } else {
      console.log(`💿 Using Discogs artist name: "${artistName}"`);
      
      // Fallback to Discogs artist name with MusicBrainz enrichment attempt
      let mbArtistData = null;
      try {
        const artistSearchResults = await musicBrainzService.safeSearchArtists(artistName, 1);
        if (artistSearchResults.length > 0) {
          mbArtistData = artistSearchResults[0];
        }
      } catch (error) {
        console.warn(`⚠️ Could not enrich artist ${artistName}:`, error);
      }
      
      const artistId = await findOrCreateArtist(artistName, mbArtistData);
      
      // Check if relationship already exists to avoid duplicates
      const existing = await prisma.albumArtist.findUnique({
        where: {
          albumId_artistId_role: {
            albumId,
            artistId,
            role: 'primary'
          }
        }
      });

      if (existing) {
        console.log(`⚠️ AlbumArtist relationship already exists: ${artistName} (primary)`);
      } else {
        const relation = await prisma.albumArtist.create({
          data: {
            albumId,
            artistId,
            role: 'primary',
            position: 0
          }
        });
        
        console.log(`✅ Created album-artist relation: ${artistName} (primary)`);
        relationsCreated++;
      }
    }
  } catch (error) {
    console.error(`❌ Error creating album-artist relationships for ${albumId}:`, error);
    throw error; // Re-throw to see the error in migration logs
  }
  
  return relationsCreated;
}

// ============================================================================
// SQL PARSING FUNCTIONS
// ============================================================================

// Helper function to handle PostgreSQL \N (NULL) values
function parsePostgresValue(value: string): string | null {
  return value === '\\N' ? null : value;
}

// Helper function to parse numbers with NULL handling
function parsePostgresNumber(value: string): number | null {
  if (value === '\\N' || value === '' || value === 'null') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

// Helper function to parse integers with NULL handling
function parsePostgresInt(value: string): number | null {
  if (value === '\\N' || value === '' || value === 'null') return null;
  const parsed = parseInt(value);
  return isNaN(parsed) ? null : parsed;
}

// Helper function to parse dates with NULL handling
function parsePostgresDate(value: string): Date | null {
  if (value === '\\N' || value === '' || value === 'null') return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Helper function to parse booleans with NULL handling
function parsePostgresBool(value: string): boolean {
  if (value === '\\N' || value === '' || value === 'null') return false;
  return value === 't' || value === 'true' || value === '1';
}

function parseUserLine(values: string[]): OldSchemaUser {
  // Column order: id, name, email, emailVerified, image, hashedPassword, bio, followersCount, followingCount, recommendationsCount, profileUpdatedAt
  return {
    id: values[0],
    email: parsePostgresValue(values[2]) || '', // Third column is email
    displayName: parsePostgresValue(values[1]),  // Second column is name (displayName)
    avatar: parsePostgresValue(values[4]),       // Fifth column is image (avatar)
    emailVerified: parsePostgresValue(values[3]) !== null ? new Date() : null, // Fourth column emailVerified (convert to DateTime)
    createdAt: parsePostgresDate(values[10]) || new Date(), // Last column is profileUpdatedAt
    updatedAt: parsePostgresDate(values[10]) || new Date(),
  };
}

function parseCollectionLine(values: string[]): OldSchemaCollection {
  // Field order from SQL: id, name, description, "userId", "isPublic", "createdAt", "updatedAt"
  return {
    id: values[0],
    name: parsePostgresValue(values[1]) || 'Untitled Collection',  // Fallback name
    description: parsePostgresValue(values[2]),
    userId: parsePostgresValue(values[3]) || '', // FIXED: was values[4], added fallback 
    isPublic: parsePostgresBool(values[4]), // FIXED: was values[3]
    createdAt: parsePostgresDate(values[5]) || new Date(),
    updatedAt: parsePostgresDate(values[6]) || new Date(),
  };
}

function parseCollectionAlbumLine(values: string[]): OldSchemaCollectionAlbum {
  // Field order from SQL: id, collectionId, albumDiscogsId, personalRating, personalNotes, position, addedAt, 
  // albumTitle, albumArtist, albumImageUrl, albumYear
  return {
    id: values[0],
    collectionId: values[1],
    albumDiscogsId: values[2],
    albumTitle: parsePostgresValue(values[7]) || 'Unknown Album',  // FIXED: was values[3]
    albumArtist: parsePostgresValue(values[8]) || 'Unknown Artist',  // FIXED: was values[4]  
    albumYear: parsePostgresInt(values[10]),  // FIXED: was values[5]
    albumImageUrl: parsePostgresValue(values[9]),  // FIXED: was values[6]
    personalRating: parsePostgresInt(values[3]),  // FIXED: was values[7]
    personalNotes: parsePostgresValue(values[4]),  // FIXED: was values[8]
    position: parsePostgresInt(values[5]) || 0,  // FIXED: was values[9]
    addedAt: parsePostgresDate(values[6]) || new Date(),  // FIXED: was values[10]
  };
}

function parseRecommendationLine(values: string[]): OldSchemaRecommendation {
  // Field order from SQL: id, score, createdAt, updatedAt, userId, basisAlbumDiscogsId, recommendedAlbumDiscogsId, 
  // basisAlbumTitle, basisAlbumArtist, basisAlbumImageUrl, basisAlbumYear, 
  // recommendedAlbumTitle, recommendedAlbumArtist, recommendedAlbumImageUrl, recommendedAlbumYear, 
  // basisAlbumArtistDiscogsId, recommendedAlbumArtistDiscogsId
  return {
    id: values[0],
    score: parsePostgresInt(values[1]) || 0,
    createdAt: parsePostgresDate(values[2]) || new Date(),
    updatedAt: parsePostgresDate(values[3]) || new Date(),
    userId: values[4],
    basisAlbumDiscogsId: values[5],
    basisAlbumTitle: parsePostgresValue(values[7]) || 'Unknown Album',  // FIXED: was values[6]
    basisAlbumArtist: parsePostgresValue(values[8]) || 'Unknown Artist',  // FIXED: was values[7]
    basisAlbumYear: parsePostgresInt(values[10]),  // FIXED: was values[8]
    basisAlbumImageUrl: parsePostgresValue(values[9]),
    recommendedAlbumDiscogsId: values[6],  // FIXED: was values[10] 
    recommendedAlbumTitle: parsePostgresValue(values[11]) || 'Unknown Album',
    recommendedAlbumArtist: parsePostgresValue(values[12]) || 'Unknown Artist',
    recommendedAlbumYear: parsePostgresInt(values[14]),  // FIXED: was values[13]
    recommendedAlbumImageUrl: parsePostgresValue(values[13]),  // FIXED: was values[14]
  };
}

function parseUserFollowLine(values: string[]): OldSchemaUserFollow {
  // Column order: id, followerId, followedId, createdAt
  return {
    followerId: values[1], // Second column is followerId
    followedId: values[2],  // Third column is followedId
    createdAt: parsePostgresDate(values[3]) || new Date(), // Fourth column is createdAt
  };
}

async function parseProductionDump(dumpPath: string) {
  log.info(`Parsing production dump: ${chalk.cyan(path.basename(dumpPath))}`);
  
  const content = await fs.readFile(dumpPath, 'utf-8');
  const lines = content.split('\n');
  
  const users: OldSchemaUser[] = [];
  const collections: OldSchemaCollection[] = [];
  const collectionAlbums: OldSchemaCollectionAlbum[] = [];
  const recommendations: OldSchemaRecommendation[] = [];
  const userFollows: OldSchemaUserFollow[] = [];
  
  let currentTable = '';
  
  for (const line of lines) {
    if (line.startsWith('COPY public."User"')) {
      currentTable = 'users';
      continue;
    } else if (line.startsWith('COPY public."Collection"')) {
      currentTable = 'collections';
      continue;
    } else if (line.startsWith('COPY public."CollectionAlbum"')) {
      currentTable = 'collectionAlbums';
      continue;
    } else if (line.startsWith('COPY public."Recommendation"')) {
      currentTable = 'recommendations';
      continue;
    } else if (line.startsWith('COPY public."UserFollow"')) {
      currentTable = 'userFollows';
      continue;
    } else if (line === '\\.' || line.startsWith('--') || line.trim() === '') {
      currentTable = '';
      continue;
    }
    
    if (currentTable && line.trim()) {
      const values = line.split('\t');
      
      try {
        switch (currentTable) {
          case 'users':
            users.push(parseUserLine(values));
            break;
          case 'collections':
            collections.push(parseCollectionLine(values));
            break;
          case 'collectionAlbums':
            collectionAlbums.push(parseCollectionAlbumLine(values));
            break;
          case 'recommendations':
            recommendations.push(parseRecommendationLine(values));
            break;
          case 'userFollows':
            userFollows.push(parseUserFollowLine(values));
            break;
        }
      } catch (error) {
        console.error(`❌ Error parsing ${currentTable} line:`, line, error);
      }
    }
  }
  
  log.stats('Parsed Data Summary', {
    'Users': users.length,
    'Collections': collections.length, 
    'Collection Albums': collectionAlbums.length,
    'Recommendations': recommendations.length,
    'User Follows': userFollows.length
  });
  
  return { users, collections, collectionAlbums, recommendations, userFollows };
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function runEnrichedMigration(isDryRun: boolean = false, isTestMode: boolean = false, testLimit: number = 5): Promise<MigrationStats> {
  const stats: MigrationStats = {
    usersCreated: 0,
    collectionsCreated: 0,
    albumsCreated: 0,
    artistsCreated: 0,
    albumArtistRelationsCreated: 0,
    collectionAlbumsCreated: 0,
    recommendationsCreated: 0,
    userFollowsCreated: 0,
    musicbrainzLookups: 0,
    musicbrainzMatches: 0
  };
  
  log.header('🚀 ENHANCED MIGRATION WITH MUSICBRAINZ ENRICHMENT');
  log.mode(`Mode: ${isDryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE MIGRATION')}`);
  if (isTestMode) {
    log.test(`TEST MODE: Limited to ${testLimit} items per type`);
  }
  
  // Parse the production dump
  const dumpPath = path.join(process.cwd(), 'backups', 'fresh-prod-dump-20250914.sql');
  let { users, collections, collectionAlbums, recommendations, userFollows } = await parseProductionDump(dumpPath);
  
  // Apply test mode limits if enabled
  if (isTestMode) {
    log.test('Limiting data for test mode:');
    log.info(`Before: ${users.length} users, ${collections.length} collections, ${collectionAlbums.length} collection albums, ${recommendations.length} recommendations, ${userFollows.length} follows`);
    
    // Take first N users
    users = users.slice(0, Math.min(testLimit, users.length));
    const userIds = new Set(users.map(u => u.id));
    
    // Only take collections that belong to the selected users
    collections = collections.filter(c => userIds.has(c.userId)).slice(0, Math.min(testLimit, collections.length));
    const collectionIds = new Set(collections.map(c => c.id));
    
    // Only take collection albums that belong to the selected collections
    collectionAlbums = collectionAlbums.filter(ca => collectionIds.has(ca.collectionId)).slice(0, Math.min(testLimit, collectionAlbums.length));
    
    // Only take recommendations from the selected users
    recommendations = recommendations.filter(r => userIds.has(r.userId)).slice(0, Math.min(testLimit, recommendations.length));
    
    // Only take follows between the selected users
    userFollows = userFollows.filter(f => userIds.has(f.followerId) && userIds.has(f.followedId)).slice(0, Math.min(testLimit, userFollows.length));
    
    log.info(`After: ${users.length} users, ${collections.length} collections, ${collectionAlbums.length} collection albums, ${recommendations.length} recommendations, ${userFollows.length} follows`);
  }
  
  if (isDryRun) {
    console.log('\n🔍 DRY RUN SUMMARY:');
    console.log('=====================================');
    console.log(`Would create ${users.length} users`);
    console.log(`Would create ${collections.length} collections`);
    console.log(`Would process ${collectionAlbums.length} collection albums with MusicBrainz enrichment`);
    console.log(`Would process ${recommendations.length} recommendations with MusicBrainz enrichment`);
    console.log(`Would create ${userFollows.length} user follows`);
    
    // Estimate unique albums that would be enriched
    const uniqueAlbums = new Set([
      ...collectionAlbums.map(ca => ca.albumDiscogsId),
      ...recommendations.map(r => r.basisAlbumDiscogsId),
      ...recommendations.map(r => r.recommendedAlbumDiscogsId)
    ]);
    console.log(`Would enrich ~${uniqueAlbums.size} unique albums via MusicBrainz`);
    
    return stats;
  }
  
  // Step 1: Migrate Users (no dependencies)
  log.step(1, 'Migrating Users');
  const userProgress = new MigrationProgress(users.length, 'Users');
  const userIdMap = new Map<string, string>(); // old ID -> new ID
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    try {
      const newUser = await prisma.user.create({
        data: {
          // Let Prisma generate new IDs
          email: user.email,
          name: user.displayName,
          image: user.avatar,
          emailVerified: user.emailVerified,
        }
      });
      
      // Map old ID to new ID for collection and follow references
      userIdMap.set(user.id, newUser.id);
      stats.usersCreated++;
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error);
    }
    userProgress.update(i + 1);
  }
  userProgress.done();
  
  // Step 2: Migrate Collections (depends on users)
  log.step(2, 'Migrating Collections');
  const collectionProgress = new MigrationProgress(collections.length, 'Collections');
  const collectionIdMap = new Map<string, string>(); // old ID -> new ID
  
  for (let i = 0; i < collections.length; i++) {
    const collection = collections[i];
    try {
      // Get the mapped user ID
      const newUserId = userIdMap.get(collection.userId);
      if (!newUserId) {
        log.error(`User ID ${collection.userId} not found in mapping for collection ${collection.name}`);
        continue;
      }
      
      // Create collection with new ID and mapped user ID
      const newCollection = await prisma.collection.create({
        data: {
          // Let Prisma generate the ID instead of using the old one
          name: collection.name,
          description: collection.description,
          isPublic: collection.isPublic,
          userId: newUserId, // Use mapped user ID
          createdAt: collection.createdAt,
          updatedAt: collection.updatedAt,
        }
      });
      
      // Map old ID to new ID for collection album references
      collectionIdMap.set(collection.id, newCollection.id);
      stats.collectionsCreated++;
    } catch (error) {
      console.error(`❌ Error creating collection ${collection.name}:`, error);
    }
    collectionProgress.update(i + 1);
  }
  collectionProgress.done();
  
  // Step 3: Process Collection Albums with MusicBrainz Enrichment
  console.log('\n📀 Step 3: Processing Collection Albums with MusicBrainz Enrichment...');
  const collectionAlbumProgress = new MigrationProgress(collectionAlbums.length, 'Collection Albums');
  
  for (let i = 0; i < collectionAlbums.length; i++) {
    const collectionAlbum = collectionAlbums[i];
    try {
      // Create enriched album
      const albumResult = await findOrCreateEnrichedAlbum({
        discogsId: collectionAlbum.albumDiscogsId,
        title: collectionAlbum.albumTitle,
        artist: collectionAlbum.albumArtist,
        year: collectionAlbum.albumYear,
        imageUrl: collectionAlbum.albumImageUrl
      });
      
      if (albumResult.isNew) {
        stats.albumsCreated++;
      }
      stats.albumArtistRelationsCreated += albumResult.albumArtistRelations;
      
      // Create collection album relationship using mapped collection ID
      const newCollectionId = collectionIdMap.get(collectionAlbum.collectionId);
      if (!newCollectionId) {
        log.error(`Collection ID ${collectionAlbum.collectionId} not found in mapping`);
        continue;
      }
      
      await prisma.collectionAlbum.create({
        data: {
          // Let Prisma generate the ID
          collectionId: newCollectionId,
          albumId: albumResult.id,
          discogsId: collectionAlbum.albumDiscogsId,
          personalRating: collectionAlbum.personalRating,
          personalNotes: collectionAlbum.personalNotes,
          position: collectionAlbum.position,
          addedAt: collectionAlbum.addedAt,
        }
      });
      
      stats.collectionAlbumsCreated++;
      stats.musicbrainzLookups++;
      
    } catch (error) {
      console.error(`❌ Error processing collection album ${collectionAlbum.id}:`, error);
    }
    
    collectionAlbumProgress.update(i + 1);
  }
  collectionAlbumProgress.done();
  
  // Step 4: Process Recommendations with MusicBrainz Enrichment
  console.log('\n🎵 Step 4: Processing Recommendations with MusicBrainz Enrichment...');
  const recommendationProgress = new MigrationProgress(recommendations.length, 'Recommendations');
  
  for (let i = 0; i < recommendations.length; i++) {
    const recommendation = recommendations[i];
    try {
      // Create enriched basis album
      const basisAlbumResult = await findOrCreateEnrichedAlbum({
        discogsId: recommendation.basisAlbumDiscogsId,
        title: recommendation.basisAlbumTitle,
        artist: recommendation.basisAlbumArtist,
        year: recommendation.basisAlbumYear,
        imageUrl: recommendation.basisAlbumImageUrl
      });
      
      // Create enriched recommended album
      const recommendedAlbumResult = await findOrCreateEnrichedAlbum({
        discogsId: recommendation.recommendedAlbumDiscogsId,
        title: recommendation.recommendedAlbumTitle,
        artist: recommendation.recommendedAlbumArtist,
        year: recommendation.recommendedAlbumYear,
        imageUrl: recommendation.recommendedAlbumImageUrl
      });
      
      if (basisAlbumResult.isNew) stats.albumsCreated++;
      if (recommendedAlbumResult.isNew) stats.albumsCreated++;
      stats.albumArtistRelationsCreated += basisAlbumResult.albumArtistRelations;
      stats.albumArtistRelationsCreated += recommendedAlbumResult.albumArtistRelations;
      
      // Get mapped user ID
      const newUserId = userIdMap.get(recommendation.userId);
      if (!newUserId) {
        log.error(`User ID ${recommendation.userId} not found in mapping for recommendation ${recommendation.id}`);
        continue;
      }
      
      // Create recommendation
      await prisma.recommendation.create({
        data: {
          // Let Prisma generate new ID
          score: recommendation.score,
          createdAt: recommendation.createdAt,
          updatedAt: recommendation.updatedAt,
          userId: newUserId, // Use mapped user ID
          basisAlbumId: basisAlbumResult.id,
          recommendedAlbumId: recommendedAlbumResult.id,
          basisDiscogsId: recommendation.basisAlbumDiscogsId,
          recommendedDiscogsId: recommendation.recommendedAlbumDiscogsId,
        }
      });
      
      stats.recommendationsCreated++;
      stats.musicbrainzLookups += 2; // Two lookups per recommendation
      
    } catch (error) {
      console.error(`❌ Error processing recommendation ${recommendation.id}:`, error);
    }
    
    recommendationProgress.update(i + 1);
  }
  recommendationProgress.done();
  
  // Step 5: Migrate User Follows (depends on users)
  log.step(5, 'Migrating User Follows');
  const followProgress = new MigrationProgress(userFollows.length, 'User Follows');
  
  for (let i = 0; i < userFollows.length; i++) {
    const follow = userFollows[i];
    try {
      // Get mapped user IDs
      const newFollowerId = userIdMap.get(follow.followerId);
      const newFollowedId = userIdMap.get(follow.followedId);
      
      if (!newFollowerId || !newFollowedId) {
        log.error(`User ID mapping not found for follow: ${follow.followerId} -> ${follow.followedId}`);
        continue;
      }
      
      await prisma.userFollow.create({
        data: {
          followerId: newFollowerId, // Use mapped user ID
          followedId: newFollowedId, // Use mapped user ID
          createdAt: follow.createdAt,
        }
      });
      stats.userFollowsCreated++;
    } catch (error) {
      console.error(`❌ Error creating user follow:`, error);
    }
    followProgress.update(i + 1);
  }
  followProgress.done();
  
  // Calculate final stats
  stats.artistsCreated = artistCache.size;
  stats.musicbrainzMatches = Array.from(albumCache.values()).length; // Albums that got created
  
  return stats;
}

// ============================================================================
// TRACK PROCESSING FUNCTIONS (Simplified from queue processor)
// ============================================================================

/**
 * Process all tracks for an album from MusicBrainz release data
 * Simplified version of the function from musicbrainz-processor.ts
 */
async function processMusicBrainzTracksForAlbum(albumId: string, mbRelease: any) {
  log.track(`Processing tracks for album ${chalk.cyan(albumId)} from MusicBrainz release`);
  
  try {
    let tracksCreated = 0;
    
    // Process each disc/medium
    for (const medium of mbRelease.media || []) {
      const discNumber = medium.position || 1;
      
      // Process each track on this disc
      for (const mbTrack of medium.tracks || []) {
        try {
          const trackNumber = mbTrack.position;
          const mbRecording = mbTrack.recording;
          
          if (!mbRecording) continue;
          
          // Create track from MusicBrainz data
          log.create(`Creating track: "${chalk.yellow(mbRecording.title)}" (${chalk.cyan(trackNumber)})`);
          
          // Extract ISRC if available
          const isrc = mbRecording.isrcs && mbRecording.isrcs.length > 0 ? mbRecording.isrcs[0] : null;
          
          const newTrack = await prisma.track.create({
            data: {
              albumId,
              title: mbRecording.title,
              trackNumber,
              discNumber,
              durationMs: mbRecording.length ? mbRecording.length * 1000 : null,
              explicit: false,
              previewUrl: null,
              musicbrainzId: mbRecording.id,
              isrc,
              source: 'MUSICBRAINZ',
              dataQuality: 'HIGH',
              enrichmentStatus: 'COMPLETED',
              lastEnriched: new Date()
            }
          });
          
          tracksCreated++;
          
          if (isrc) {
            log.isrc(`Added ISRC for "${chalk.yellow(mbRecording.title)}": ${chalk.green(isrc)}`);
          }
          
        } catch (error) {
          log.error(`Failed to create track ${mbTrack.position}: ${error}`);
        }
      }
    }

    log.success(`Created ${chalk.bold(tracksCreated)} tracks for album ${chalk.cyan(albumId)}`);

  } catch (error) {
    log.error(`Track processing failed for album ${albumId}: ${error}`);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || args.includes('-d');
  const isTestMode = args.includes('--test-mode') || args.includes('-t');
  const testLimitStr = args.find(arg => arg.startsWith('--limit='))?.split('=')[1];
  const testLimit = testLimitStr ? parseInt(testLimitStr) : 5;
  
  try {
    const stats = await runEnrichedMigration(isDryRun, isTestMode, testLimit);
    
    console.log('\n📊 Migration Complete!');
    console.log('=====================================');
    console.log(`Users Created: ${stats.usersCreated}`);
    console.log(`Collections Created: ${stats.collectionsCreated}`);
    console.log(`Albums Created: ${stats.albumsCreated}`);
    console.log(`Artists Created: ${stats.artistsCreated}`);
    console.log(`Album-Artist Relations: ${stats.albumArtistRelationsCreated}`);
    console.log(`Collection Albums: ${stats.collectionAlbumsCreated}`);
    console.log(`Recommendations: ${stats.recommendationsCreated}`);
    console.log(`User Follows: ${stats.userFollowsCreated}`);
    console.log(`MusicBrainz Lookups: ${stats.musicbrainzLookups}`);
    console.log(`MusicBrainz Matches: ${stats.musicbrainzMatches}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}
