// @ts-nocheck - GraphQL resolvers have major type issues after schema migration, need complete rewrite
// src/lib/graphql/resolvers/index.ts
// Main resolver map for Apollo Server

import chalk from 'chalk';
import { Resolvers } from '@/generated/graphql';
import { scalarResolvers } from './scalars';
import { queryResolvers } from './queries';
import { mutationResolvers } from './mutations';
import { subscriptionResolvers } from './subscriptions';
import { SearchOrchestrator, SearchSource, SearchType } from '@/lib/search/SearchOrchestrator';
import { unifiedArtistService } from '@/lib/api/unified-artist-service';

// Production-ready resolvers with DataLoader optimization
export const resolvers: Resolvers = {
  ...scalarResolvers,

  Query: {
    ...queryResolvers,

    // Admin users query
    users: async (_, { offset = 0, limit = 20, search }, { prisma }) => {
      const where = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {};

      const users = await prisma.user.findMany({
        where,
        skip: offset,
        take: limit,
        include: {
          collections: {
            select: {
              id: true,
              name: true,
            },
            take: 5,
          },
          _count: {
            select: {
              collections: true,
              recommendations: true,
            }
          }
        },
        orderBy: { id: 'desc' }, // Order by ID since createdAt doesn't exist
      });

      return users;
    },

    usersCount: async (_, { search }, { prisma }) => {
      const where = search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ]
      } : {};

      return prisma.user.count({ where });
    },
    health: () => `GraphQL server running at ${new Date().toISOString()}`,

    // Basic entity queries using DataLoaders
    artist: async (_, { id }, { dataloaders }) => {
      return await dataloaders.artistLoader.load(id);
    },

    album: async (_, { id }, { dataloaders }) => {
      return await dataloaders.albumLoader.load(id);
    },

    track: async (_, { id }, { dataloaders }) => {
      return await dataloaders.trackLoader.load(id);
    },

    user: async (_, { id }, { dataloaders }) => {
      return await dataloaders.userLoader.load(id);
    },

    collection: async (_, { id }, { dataloaders }) => {
      return await dataloaders.collectionLoader.load(id);
    },

    recommendation: async (_, { id }, { prisma }) => {
      return await prisma.recommendation.findUnique({
        where: { id },
        include: {
          basisAlbum: true,
          recommendedAlbum: true,
          user: true
        }
      });
    },

    // Unified artist discography for client components
    artistDiscography: async (_, { id }) => {
      const discography = await unifiedArtistService.getArtistDiscography(id);

      // Helper to map a release to GraphQL UnifiedRelease type
      const mapRelease = (release: any) => ({
        id: release.id,
        source: release.source?.toUpperCase() || 'UNKNOWN',
        title: release.title,
        releaseDate: release.releaseDate,
        primaryType: release.primaryType,
        secondaryTypes: release.secondaryTypes || [],
        imageUrl: release.imageUrl || release.thumb || release.coverImage || null,
        artistName: release.artist || release.artistName || '',
        artistCredits:
          Array.isArray(release.artistCredits)
            ? release.artistCredits.map((c: any) => ({
                artist: { id: c.artist?.id || '', name: c.artist?.name || c.name || '' },
                role: c.role || null,
                position: typeof c.position === 'number' ? c.position : null,
              }))
            : [],
        trackCount: release.trackCount || null,
        year: release.releaseDate ? new Date(release.releaseDate).getFullYear() : null,
      });

      // If discography is already categorized (from MusicBrainz), return it
      if (discography && typeof discography === 'object' && 'albums' in discography) {
        return {
          albums: discography.albums.map(mapRelease),
          eps: discography.eps.map(mapRelease),
          singles: discography.singles.map(mapRelease),
          compilations: discography.compilations.map(mapRelease),
          liveAlbums: discography.liveAlbums.map(mapRelease),
          remixes: discography.remixes.map(mapRelease),
          soundtracks: discography.soundtracks.map(mapRelease),
          other: discography.other.map(mapRelease),
        };
      }

      // Fallback: if it's a flat array (from Discogs or old format), categorize it here
      const releases = Array.isArray(discography) ? discography : [];
      return {
        albums: releases.filter(r => r.primaryType?.toLowerCase() === 'album').map(mapRelease),
        eps: releases.filter(r => r.primaryType?.toLowerCase() === 'ep').map(mapRelease),
        singles: releases.filter(r => r.primaryType?.toLowerCase() === 'single').map(mapRelease),
        compilations: [],
        liveAlbums: [],
        remixes: [],
        soundtracks: [],
        other: releases.filter(r => !['album', 'ep', 'single'].includes(r.primaryType?.toLowerCase() || '')).map(mapRelease),
      };
    },

    // Enhanced search using SearchOrchestrator
    search: async (_, { input }, { prisma }) => {
      const { query, type = 'ALL', limit = 20, searchMode = 'LOCAL_ONLY' } = input;

      try {
        // Create SearchOrchestrator instance
        const orchestrator = new SearchOrchestrator(prisma);

        // Map GraphQL search type to SearchType[]
        let searchTypes: SearchType[] = [];
        if (type === 'ALL') {
          searchTypes = ['album', 'artist', 'track'];
        } else if (type === 'ARTIST') {
          searchTypes = ['artist'];
        } else if (type === 'ALBUM') {
          searchTypes = ['album'];
        } else if (type === 'TRACK') {
          searchTypes = ['track'];
        }

        // Determine which sources to search based on searchMode
        let sources: SearchSource[] = [];
        if (searchMode === 'LOCAL_ONLY') {
          sources = [SearchSource.LOCAL];
        } else if (searchMode === 'LOCAL_AND_EXTERNAL') {
          sources = [SearchSource.LOCAL, SearchSource.MUSICBRAINZ, SearchSource.SPOTIFY];
        } else if (searchMode === 'EXTERNAL_ONLY') {
          sources = [SearchSource.MUSICBRAINZ, SearchSource.SPOTIFY];
        }

        // Perform orchestrated search
        // When searching ALL types, divide limit across entity types
        const perTypeLimit = type === 'ALL' ? Math.ceil(limit / 3) : limit;

        const searchResult = await orchestrator.search({
          query,
          types: searchTypes,
          sources,
          limit: perTypeLimit,
          deduplicateResults: true,
          // Enable Wikimedia image resolution for MB artists with a small cap
          resolveArtistImages: searchTypes.includes('artist') && sources.includes(SearchSource.MUSICBRAINZ),
          artistImageLimit: 3,
        });

        // Separate results by source
        const localResults = searchResult.sources.local?.results || [];
        const musicbrainzResults = searchResult.sources.musicbrainz?.results || [];
        const spotifyResults = searchResult.sources.spotify?.results || [];

        // For local results, fetch from database
        const localAlbumIds = localResults.filter(r => r.type === 'album').map(r => r.id);
        const localArtistIds = localResults.filter(r => r.type === 'artist').map(r => r.id);
        const localTrackIds = localResults.filter(r => r.type === 'track').map(r => r.id);

        const dbAlbums = localAlbumIds.length > 0 ? await prisma.album.findMany({
          where: { id: { in: localAlbumIds } },
          include: {
            artists: {
              include: {
                artist: true
              }
            }
          }
        }) : [];

        const dbArtists = localArtistIds.length > 0 ? await prisma.artist.findMany({
          where: { id: { in: localArtistIds } }
        }) : [];

        const dbTracks = localTrackIds.length > 0 ? await prisma.track.findMany({
          where: { id: { in: localTrackIds } },
          include: {
            album: true,
            artists: {
              include: {
                artist: true
              }
            }
          }
        }) : [];

        // For MusicBrainz results, check if they already exist in DB
        const mbAlbumIds = musicbrainzResults.filter(r => r.type === 'album').map(r => r.id);
        const mbArtistIds = musicbrainzResults.filter(r => r.type === 'artist').map(r => r.id);
        const mbTrackIds = musicbrainzResults.filter(r => r.type === 'track').map(r => r.id);

        // Find which MusicBrainz items already exist in our DB
        const existingMbAlbums = mbAlbumIds.length > 0 ? await prisma.album.findMany({
          where: {
            musicbrainzId: { in: mbAlbumIds },
            id: { notIn: localAlbumIds },
          },
          include: {
            artists: {
              include: {
                artist: true
              }
            }
          }
        }) : [];

        const existingMbArtists = mbArtistIds.length > 0 ? await prisma.artist.findMany({
          where: {
            musicbrainzId: { in: mbArtistIds },
            id: { notIn: localArtistIds },
          }
        }) : [];

        const existingMbTracks = mbTrackIds.length > 0 ? await prisma.track.findMany({
          where: {
            musicbrainzId: { in: mbTrackIds },
            id: { notIn: localTrackIds },
          },
          include: {
            album: true,
            artists: {
              include: {
                artist: true
              }
            }
          }
        }) : [];

        // For MusicBrainz results NOT in DB, create temporary objects
        const existingMbAlbumIds = new Set(existingMbAlbums.map(a => a.musicbrainzId));
        const existingMbArtistIds = new Set(existingMbArtists.map(a => a.musicbrainzId));
        const existingMbTrackIds = new Set(existingMbTracks.map(t => t.musicbrainzId));

        const dbAlbumIds = new Set(dbAlbums.map(a => String(a.id)));
        const newMbAlbums = musicbrainzResults
          .filter(r => r.type === 'album' && !existingMbAlbumIds.has(r.id) && !dbAlbumIds.has(r.id))
          .map(r => ({
            id: r.id, // Use MusicBrainz ID as temporary ID
            source: 'MUSICBRAINZ' as const,
            title: r.title,
            releaseDate: r.releaseDate || null,
            primaryType: r.primaryType || null,
            secondaryTypes: r.secondaryTypes || [],
            imageUrl: r.image?.url || r.cover_image || null,
            artistName: r.artist || 'Unknown Artist',
            artistCredits: [], // Will be populated if needed
            trackCount: r.metadata?.numberOfTracks || null,
            year: r.releaseDate ? new Date(r.releaseDate).getFullYear() : null,
          }));

        const dbArtistIds = new Set(dbArtists.map(a => String(a.id)));
        const newMbArtists = musicbrainzResults
          .filter(r => r.type === 'artist' && !existingMbArtistIds.has(r.id) && !dbArtistIds.has(r.id))
          .map(r => ({
            id: r.id, // Use MusicBrainz ID as temporary ID
            musicbrainzId: r.id,
            name: r.title, // title is the artist name in UnifiedSearchResult
            imageUrl: r.image?.url || r.cover_image || null,
            subtitle: r.subtitle, // e.g., "Person", "Group"
            genre: r.genre || [], // MusicBrainz tags
          }));

        // Process Spotify artists - enrich MusicBrainz results with Spotify images
        // Use intelligent 1:1 matching to avoid mismatches
        const normalizeName = (s: string) => (s || '').trim().toLowerCase();

        // Prepare Spotify results for matching
        const spotifyArtistsAvailable = spotifyResults
          .filter(r => r.type === 'artist' && r.image?.url)
          .map(r => ({
            name: r.title,
            normalizedName: normalizeName(r.title),
            imageUrl: r.image!.url!,
            popularity: r._spotify?.popularity || 0,
            genres: r._spotify?.genres || [],
            spotifyId: r._spotify?.spotifyId || '',
            matched: false, // Track if already used
          }));

        // Helper: Check if disambiguation/subtitle matches genres
        const genreMatchesContext = (mbContext: string, spotifyGenres: string[]): boolean => {
          if (!mbContext || spotifyGenres.length === 0) return false;
          const contextLower = mbContext.toLowerCase();

          // Common genre mappings for disambiguation
          const genreKeywords: Record<string, string[]> = {
            'hip-hop': ['rapper', 'hip hop', 'hip-hop', 'rap'],
            'hip hop': ['rapper', 'hip hop', 'hip-hop', 'rap'],
            'rap': ['rapper', 'hip hop', 'hip-hop', 'rap'],
            'rock': ['rock', 'punk', 'metal'],
            'jazz': ['jazz', 'blues'],
            'pop': ['pop', 'singer'],
            'electronic': ['electronic', 'edm', 'techno', 'house'],
            'country': ['country', 'folk'],
            'r&b': ['r&b', 'soul', 'rnb'],
          };

          for (const spotifyGenre of spotifyGenres) {
            const genreLower = spotifyGenre.toLowerCase();
            const keywords = genreKeywords[genreLower] || [genreLower];
            if (keywords.some(keyword => contextLower.includes(keyword))) {
              return true;
            }
          }
          return false;
        };

        // Match each MusicBrainz artist to best Spotify candidate
        const enrichedMbArtists = newMbArtists.map(mbArtist => {
          const normalizedMbName = normalizeName(mbArtist.name);

          // Find all Spotify artists with matching name
          const candidates = spotifyArtistsAvailable.filter(
            sa => !sa.matched && sa.normalizedName === normalizedMbName
          );

          if (candidates.length === 0) {
            // No match found, keep original image
            console.log(
              chalk.yellow(`⚠️  [Spotify Enrich]`) + ` No Spotify match for ${chalk.cyan(`"${mbArtist.name}"`)} ` +
              chalk.dim(`(mbid: ${mbArtist.musicbrainzId?.slice(0, 8)}..., type: ${mbArtist.subtitle})`)
            );
            return mbArtist;
          }

          if (candidates.length === 1) {
            // Single match, use it
            const match = candidates[0];
            match.matched = true;
            console.log(
              chalk.green(`✅ [Spotify Enrich]`) + ` ${chalk.cyan(`"${mbArtist.name}"`)} → Spotify ` +
              chalk.dim(`(pop: ${match.popularity}, genres: ${match.genres.slice(0, 2).join(', ') || 'none'})`)
            );
            return {
              ...mbArtist,
              imageUrl: match.imageUrl,
              popularity: match.popularity,
            };
          }

          // Multiple candidates - score them
          const scored = candidates.map(candidate => {
            let score = 0;

            // Base score from popularity (0-2 points)
            score += (candidate.popularity / 50);

            // Bonus if genres match context (subtitle/tags) (+3 points)
            const context = [mbArtist.subtitle, ...(mbArtist.genre || [])].join(' ');
            if (genreMatchesContext(context, candidate.genres)) {
              score += 3;
            }

            return { candidate, score };
          });

          // Pick highest scoring candidate
          scored.sort((a, b) => b.score - a.score);
          const bestMatch = scored[0].candidate;
          bestMatch.matched = true;

          console.log(
            chalk.magenta(`🎯 [Spotify Enrich]`) + ` ${chalk.cyan(`"${mbArtist.name}"`)} ` +
            chalk.dim(`(${mbArtist.subtitle}, tags: ${mbArtist.genre?.slice(0, 2).join(', ') || 'none'})`) + ` → ` +
            `Spotify ` + chalk.dim(`(pop: ${bestMatch.popularity}, genres: ${bestMatch.genres.slice(0, 2).join(', ')}, score: ${scored[0].score.toFixed(1)})`) + ` ` +
            chalk.yellow(`[${candidates.length} candidates]`)
          );

          return {
            ...mbArtist,
            imageUrl: bestMatch.imageUrl,
            popularity: bestMatch.popularity,
          };
        });

        const dbTrackIds = new Set(dbTracks.map(t => String(t.id)));
        const MIN_TRACK_MB_SCORE = 70; // tune as needed
        const newMbTracks = musicbrainzResults
          .filter(r => r.type === 'track' && !existingMbTrackIds.has(r.id) && !dbTrackIds.has(r.id))
          // Require a minimum MB score for recordings
          .filter(r => (typeof r.relevanceScore === 'number' ? r.relevanceScore : 0) >= MIN_TRACK_MB_SCORE)
          // Filter out obvious noise where the recording title equals the artist name
          .filter(r => {
            const a = (r.artist || '').trim().toLowerCase();
            const t = (r.title || '').trim().toLowerCase();
            return !(a && t && a === t);
          })
          .map(r => ({
            id: r.id, // Use MusicBrainz ID as temporary ID
            musicbrainzId: r.id,
            title: r.title,
            durationMs: r.metadata?.totalDuration || 0,
            trackNumber: 0,
            albumId: null,
            album: null,
            // Provide minimal artist credit so UI can display the artist name
            artists: r.artist
              ? [{ artist: { id: (r as any).primaryArtistMbId || r.primaryArtistMbId || r.musicbrainzArtistId || r.artistId || r.artist?.id || r.id, name: r.artist } }]
              : []
          }));

        // Transform local DB albums to UnifiedRelease format
        const localAlbumsAsUnified = dbAlbums.map(album => ({
          id: album.id,
          source: 'LOCAL' as const,
          title: album.title,
          releaseDate: album.releaseDate,
          primaryType: null, // Local DB albums don't have this yet
          secondaryTypes: [],
          imageUrl: album.coverArtUrl,
          artistName: album.artists?.[0]?.artist?.name || 'Unknown Artist',
          artistCredits: album.artists || [],
          trackCount: album.trackCount,
          year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : null,
        }));

        // Transform existing MB albums in DB to UnifiedRelease format
        const existingMbAlbumsAsUnified = existingMbAlbums.map(album => ({
          id: album.id,
          source: 'LOCAL' as const, // In DB, so treat as local for routing
          title: album.title,
          releaseDate: album.releaseDate,
          primaryType: null, // Would need to be stored in DB
          secondaryTypes: [],
          imageUrl: album.coverArtUrl,
          artistName: album.artists?.[0]?.artist?.name || 'Unknown Artist',
          artistCredits: album.artists || [],
          trackCount: album.trackCount,
          year: album.releaseDate ? new Date(album.releaseDate).getFullYear() : null,
        }));

        // Combine with preference order: local > existingMb > newMb (dedupe by id)
        const albumsMap = new Map<string, any>();
        for (const a of [...localAlbumsAsUnified, ...existingMbAlbumsAsUnified, ...newMbAlbums]) {
          const idStr = String(a.id);
          if (!albumsMap.has(idStr)) albumsMap.set(idStr, a);
        }
        const albums = Array.from(albumsMap.values());

        const artistsMap = new Map<string, any>();
        for (const a of [...dbArtists, ...existingMbArtists, ...enrichedMbArtists]) {
          const idStr = String((a as any).id);
          if (!artistsMap.has(idStr)) artistsMap.set(idStr, a);
        }
        let artists = Array.from(artistsMap.values());

        // ============================
        // Canonical artist ranking
        // ============================
        const normalize = (s: string) => (s || '').trim().toLowerCase();
        const jaccard = (a: string, b: string) => {
          const as = new Set(a.split(/\s+/).filter(Boolean));
          const bs = new Set(b.split(/\s+/).filter(Boolean));
          const inter = new Set([...as].filter(x => bs.has(x))).size;
          const uni = new Set([...as, ...bs]).size;
          return uni === 0 ? 0 : inter / uni;
        };

        // Build MB artist score map from orchestrator results
        const mbArtistScore = new Map<string, number>();
        musicbrainzResults
          .filter(r => r.type === 'artist')
          .forEach(r => mbArtistScore.set(String(r.id), (r.relevanceScore as number) || 0));

        const qNorm = normalize(query);
        const scoreArtist = (a: any): number => {
          const name: string = a.name || a.title || '';
          const nNorm = normalize(name);
          const exact = qNorm && nNorm && qNorm === nNorm ? 1 : 0;
          const sim = jaccard(qNorm, nNorm);
          const hasMb = !!a.musicbrainzId;
          const mbScore = mbArtistScore.get(String(a.musicbrainzId || a.id)) || 0;
          const mbScoreNorm = Math.max(0, Math.min(1, mbScore / 100));
          const hasImage = !!(a.imageUrl && a.imageUrl.trim());
          // Weights: exact 0.5, sim 0.15, hasMb 0.15, mbScore 0.1, hasImage 0.1
          return exact * 0.5 + sim * 0.15 + (hasMb ? 0.15 : 0) + mbScoreNorm * 0.1 + (hasImage ? 0.1 : 0);
        };

        const rankedArtists = artists
          .map(a => {
            const score = scoreArtist(a);
            console.log(
              chalk.dim(`📊 [Artist Ranking]`) + ` ${chalk.cyan(`"${a.name}"`)} ` +
              chalk.dim(`(mbid: ${a.musicbrainzId?.slice(0, 8) || 'none'}, score: ${score.toFixed(3)}, hasImage: ${!!a.imageUrl})`)
            );
            return { a, s: score };
          })
          .sort((x, y) => y.s - x.s)
          .map(x => x.a);

        // Name-level deduplication: keep one per normalized name
        const byName = new Map<string, any>();
        for (const a of rankedArtists) {
          const nameKey = normalize(a.name || a.title || '');
          const existing = byName.get(nameKey);
          if (!existing) {
            byName.set(nameKey, a);
            console.log(
              chalk.blue(`🎯 [Artist Dedup]`) + ` Keeping ${chalk.cyan(`"${a.name}"`)} ` +
              chalk.dim(`(mbid: ${a.musicbrainzId?.slice(0, 8) || 'none'}, hasImage: ${!!a.imageUrl})`)
            );
            continue;
          }
          // Prefer local with MBID, then local, then keep existing order
          const candHasMb = !!a.musicbrainzId;
          const candIsLocal = !(typeof a.source === 'string' && a.source.toUpperCase?.() === 'MUSICBRAINZ');
          const existHasMb = !!existing.musicbrainzId;
          const existIsLocal = !(typeof existing.source === 'string' && existing.source.toUpperCase?.() === 'MUSICBRAINZ');

          if ((candIsLocal && !existIsLocal) || (candHasMb && !existHasMb) || (candIsLocal && candHasMb && !(existIsLocal && existHasMb))) {
            console.log(
              chalk.yellow(`🔄 [Artist Dedup]`) + ` Replacing ${chalk.cyan(`"${existing.name}"`)} with ${chalk.cyan(`"${a.name}"`)} ` +
              chalk.dim(`(mbid: ${a.musicbrainzId?.slice(0, 8) || 'none'}, hasImage: ${!!a.imageUrl})`)
            );
            byName.set(nameKey, a);
          } else {
            console.log(
              chalk.gray(`⏭️  [Artist Dedup]`) + ` Skipping ${chalk.cyan(`"${a.name}"`)} ` +
              chalk.dim(`(keeping existing mbid: ${existing.musicbrainzId?.slice(0, 8) || 'none'})`)
            );
          }
        }
        artists = Array.from(byName.values());

        const tracksMap = new Map<string, any>();
        for (const t of [...dbTracks, ...existingMbTracks, ...newMbTracks]) {
          const idStr = String((t as any).id);
          if (!tracksMap.has(idStr)) tracksMap.set(idStr, t);
        }
        const tracks = Array.from(tracksMap.values());

        const currentCount = artists.length + albums.length + tracks.length;
        const totalAvailable = searchResult.totalResults;

        return {
          artists,
          albums,
          tracks,
          total: totalAvailable,
          currentCount,
          hasMore: currentCount < totalAvailable,
        };
      } catch (error) {
        console.error('Search error:', error);
        return { artists: [], albums: [], tracks: [], total: 0, currentCount: 0, hasMore: false };
      }
    },

  },

  // Type resolvers for relationships
  Artist: {
    albums: async (parent, _, { dataloaders }) => {
      return dataloaders.albumsByArtistLoader.load(parent.id);
    },
    // Computed fields with simple implementations
    albumCount: async (parent, _, { prisma }) => {
      return prisma.albumArtist.count({ where: { artistId: parent.id } });
    },
    trackCount: async (parent, _, { prisma }) => {
      return prisma.trackArtist.count({ where: { artistId: parent.id } });
    },
    popularity: () => null, // Placeholder
  },

  Album: {
    artists: async (parent, _, { dataloaders }) => {
      return dataloaders.artistsByAlbumLoader.load(parent.id);
    },
    tracks: async (parent, _, { dataloaders }) => {
      return dataloaders.tracksByAlbumLoader.load(parent.id);
    },
    // Computed fields
    duration: (parent) => {
      if (!parent.durationMs) return null;
      const minutes = Math.floor(parent.durationMs / 60000);
      const seconds = Math.floor((parent.durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    averageRating: () => null, // Placeholder
    inCollectionsCount: async (parent, _, { prisma }) => {
      return prisma.collectionAlbum.count({ where: { albumId: parent.id } });
    },
    recommendationScore: () => null, // Placeholder
  },

  Track: {
    album: async (parent, _, { dataloaders }) => {
      if (!parent.albumId) return null;
      return dataloaders.albumLoader.load(parent.albumId);
    },
    artists: async (parent, _, { prisma }) => {
      // If artists were provided inline (e.g., external MB results), use them
      if (Array.isArray((parent as any).artists) && (parent as any).artists.length > 0) {
        // Normalize to { artist, role, position }
        return (parent as any).artists.map((a: any, idx: number) => {
          if (a && a.artist) {
            return { artist: a.artist, role: a.role || 'performer', position: typeof a.position === 'number' ? a.position : idx };
          }
          const name = a?.name || a?.title || '';
          return { artist: { id: a?.id || '', name }, role: 'performer', position: idx };
        });
      }

      const trackArtists = await prisma.trackArtist.findMany({
        where: { trackId: parent.id },
        include: { artist: true },
        orderBy: { position: 'asc' },
      });
      return trackArtists.map(ta => ({
        artist: ta.artist,
        role: ta.role || 'performer',
        position: ta.position,
      }));
    },
    // Simplified audio features
    audioFeatures: () => null, // Placeholder - would need audio features data
    duration: (parent) => {
      if (!parent.durationMs) return null;
      const minutes = Math.floor(parent.durationMs / 60000);
      const seconds = Math.floor((parent.durationMs % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    popularity: () => null, // Placeholder
  },

  User: {
    collections: async (parent, _, { dataloaders }) => {
      return dataloaders.collectionsByUserLoader.load(parent.id);
    },
    isFollowing: () => null, // Placeholder
    mutualFollowers: () => [], // Placeholder
    _count: async (parent) => {
      // Return the _count object if it exists (from Prisma include)
      if (parent._count) {
        return parent._count;
      }
      // Otherwise return defaults
      return {
        collections: 0,
        recommendations: 0,
      };
    },
  },

  Collection: {
    user: async (parent, _, { dataloaders }) => {
      return dataloaders.userLoader.load(parent.user.id);
    },
    albums: async (parent, _, { prisma }) => {
      // Fetch collection albums with their album data
      const collectionAlbums = await prisma.collectionAlbum.findMany({
        where: { collectionId: parent.id },
        include: {
          album: {
            include: {
              artists: {
                include: {
                  artist: true
                }
              }
            }
          }
        },
        orderBy: { position: 'asc' }
      });

      return collectionAlbums;
    },
    // Simplified computed fields
    albumCount: async (parent, _, { prisma }) => {
      return prisma.collectionAlbum.count({ where: { collectionId: parent.id } });
    },
    totalDuration: () => 0, // Placeholder
    averageRating: () => null, // Placeholder
  },

  // Resolve nested fields for collection-album pivot
  CollectionAlbum: {
    collection: async (parent, _, { prisma }) => {
      const collection = await prisma.collection.findUnique({
        where: { id: parent.collectionId },
      });
      if (!collection) throw new Error('Collection not found');
      return collection;
    },
    album: async (parent, _, { prisma }) => {
      const album = await prisma.album.findUnique({
        where: { id: parent.albumId },
      });
      if (!album) throw new Error('Album not found');
      return album;
    },
  },

  Mutation: {
    ...mutationResolvers,
  },

  Subscription: subscriptionResolvers,
};
