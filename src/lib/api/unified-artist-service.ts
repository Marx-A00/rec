import { Client } from 'disconnect';

import { prisma } from '@/lib/prisma';
import { getQueuedMusicBrainzService } from '@/lib/musicbrainz/queue-service';
import { musicbrainzService as baseMusicbrainzService } from '@/lib/musicbrainz/basic-service';
import { searchSpotifyArtists } from '@/lib/spotify/search';
import { calculateStringSimilarity } from '@/lib/utils/string-similarity';

export interface UnifiedArtistDetails {
  id: string;
  source: 'local' | 'musicbrainz' | 'discogs';
  name: string;
  realName?: string;
  disambiguation?: string;
  profile?: string;
  imageUrl?: string;
  urls?: string[];
  aliases?: Array<{ name: string }>;
  members?: any[];
  groups?: any[];
  country?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  // Source-specific data
  musicbrainzId?: string;
  discogsId?: string;
  _discogs?: {
    type: string;
    uri: string;
    resource_url: string;
  };
}

class UnifiedArtistService {
  private discogsClient: any;

  constructor() {
    if (process.env.CONSUMER_KEY && process.env.CONSUMER_SECRET) {
      this.discogsClient = new Client({
        userAgent: 'RecProject/1.0 +http://localhost:3000',
        consumerKey: process.env.CONSUMER_KEY,
        consumerSecret: process.env.CONSUMER_SECRET,
      }).database();
    }
  }

  /**
   * Attempt to resolve an artist image via MusicBrainz → Wikidata → Wikimedia
   */
  private async resolveArtistImageFromWikidata(
    mbid: string
  ): Promise<string | undefined> {
    try {
      const mbService = getQueuedMusicBrainzService();
      const mbArtist = await mbService.getArtist(mbid, ['url-rels']);
      try {
        const rels = Array.isArray(mbArtist?.relations)
          ? mbArtist.relations
          : [];

        console.log('[WikidataImage] MB artist relations', {
          mbid,
          relationCount: rels.length,
          relationTypes: rels
            .slice(0, 5)
            .map((r: any) => r?.type)
            .filter(Boolean),
        });
      } catch {}
      const qid = this.extractWikidataQid(mbArtist);

      console.log('[WikidataImage] Extracted QID', { mbid, qid: qid || null });
      if (!qid) return undefined;
      const filename = await this.fetchWikidataP18Filename(qid);

      console.log('[WikidataImage] P18 filename', {
        qid,
        filename: filename || null,
      });
      if (!filename) return undefined;
      const url = this.buildWikimediaThumbUrl(filename, 600);

      console.log('[WikidataImage] Wikimedia URL', { qid, url });
      return url;
    } catch (error) {
      console.warn('Wikidata image resolution failed:', error);
      return undefined;
    }
  }

  private extractWikidataQid(mbArtist: any): string | undefined {
    const rels = mbArtist?.relations || [];
    for (const rel of rels) {
      if (rel.type === 'wikidata' && rel.url?.resource) {
        const match = rel.url.resource.match(/\/wiki\/(Q\d+)/);
        if (match) return match[1];
      }
    }
    return undefined;
  }

  private async fetchWikidataP18Filename(
    qid: string
  ): Promise<string | undefined> {
    try {
      const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) return undefined;
      const data = await res.json();
      const entity = data?.entities?.[qid];
      const p18 = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (typeof p18 === 'string' && p18.length > 0) return p18; // filename
      return undefined;
    } catch {
      return undefined;
    }
  }

  private buildWikimediaThumbUrl(
    filename: string,
    width: number = 600
  ): string {
    const encoded = encodeURIComponent(filename);
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=${width}`;
  }

  /**
   * Get artist details from any source based on ID
   * @param id Artist ID
   * @param options REQUIRED source parameter - no auto-detection
   */
  async getArtistDetails(
    id: string,
    options: {
      source: 'local' | 'musicbrainz' | 'discogs';
      skipLocalCache?: boolean;
    }
  ): Promise<UnifiedArtistDetails> {
    const source = options.source;

    switch (source) {
      case 'local':
        return this.getLocalArtist(id);
      case 'musicbrainz':
        return this.getMusicBrainzArtist(id);
      case 'discogs':
        return this.getDiscogsArtist(id, options?.skipLocalCache);
      default:
        throw new Error(`Unable to determine source for artist ID: ${id}`);
    }
  }

  /**
   * Get artist from local database
   */
  private async getLocalArtist(id: string): Promise<UnifiedArtistDetails> {
    const artist = await prisma.artist.findUnique({
      where: { id },
    });

    if (!artist) {
      throw new Error(`Artist not found in database: ${id}`);
    }

    return {
      id: artist.id,
      source: 'local',
      name: artist.name,
      // Map available Prisma fields to unified shape where possible
      profile: artist.biography || undefined,
      imageUrl: artist.imageUrl || undefined,
      country: artist.countryCode || undefined,
      musicbrainzId: artist.musicbrainzId || undefined,
      discogsId: artist.discogsId || undefined,
      // Local artists may not have all the detailed fields
      urls: [],
      aliases: [],
    };
  }

  /**
   * Get artist from MusicBrainz
   */
  private async getMusicBrainzArtist(
    mbid: string
  ): Promise<UnifiedArtistDetails> {
    try {
      const mbService = getQueuedMusicBrainzService();
      // First check if we have this artist in our database
      const localArtist = await prisma.artist.findFirst({
        where: { musicbrainzId: mbid },
      });

      if (localArtist) {
        if (localArtist.imageUrl) {
          console.log('[MBArtist] Returning existing local with image', {
            id: localArtist.id,
            mbid,
          });
          return this.getLocalArtist(localArtist.id);
        }

        // Try to enrich image and persist
        const enrichedImage = await this.resolveArtistImageFromWikidata(mbid);
        if (enrichedImage) {
          try {
            await prisma.artist.update({
              where: { id: localArtist.id },
              data: { imageUrl: enrichedImage },
            });

            console.log(
              '[MBArtist] Persisted enriched image for local artist',
              { id: localArtist.id }
            );
          } catch (e) {
            console.warn('Failed to persist enriched artist image:', e);
          }
        }

        console.log('[MBArtist] Returning local after attempted image enrich', {
          id: localArtist.id,
        });
        return this.getLocalArtist(localArtist.id);
      }

      // Fetch from MusicBrainz API
      const includes = ['aliases', 'url-rels', 'tags'];
      const mbArtist = await mbService.getArtist(mbid, includes);
      try {
        const rels = Array.isArray(mbArtist?.relations)
          ? mbArtist.relations
          : [];

        console.log('[MBArtist] getArtist response', {
          mbid,
          includes,
          relationCount: rels.length,
          relationTypes: rels
            .slice(0, 5)
            .map((r: any) => r?.type)
            .filter(Boolean),
        });
      } catch {}

      // Try Spotify first (preferred, better images)
      let finalImageUrl: string | undefined;
      try {
        const spotifyResults = await searchSpotifyArtists(mbArtist.name);

        if (spotifyResults.length > 0) {
          // Find best match using name similarity
          let bestMatch = null;
          let bestScore = 0;

          for (const result of spotifyResults) {
            // Use fuzzy matching for better typo tolerance
            const nameScore = calculateStringSimilarity(
              mbArtist.name,
              result.name
            );

            const popularityBoost = (result.popularity || 0) / 100;
            const combinedScore = nameScore * 0.6 + popularityBoost * 0.1;

            // Accept if exact name match (100%) with 60%+ score, or 80%+ combined
            const isAcceptable =
              combinedScore >= 0.8 ||
              (nameScore === 1.0 && combinedScore >= 0.6);

            if (isAcceptable && combinedScore > bestScore) {
              bestScore = combinedScore;
              bestMatch = result;
            }
          }

          if (bestMatch?.imageUrl) {
            finalImageUrl = bestMatch.imageUrl;
            const matchType =
              bestMatch.name.toLowerCase() === mbArtist.name.toLowerCase()
                ? 'exact'
                : 'fuzzy';
            console.log('[MBArtist] Spotify image found', {
              mbid,
              artistName: mbArtist.name,
              spotifyMatch: bestMatch.name,
              matchType,
              score: `${(bestScore * 100).toFixed(1)}%`,
            });
          } else if (spotifyResults.length > 0) {
            console.log(
              '[MBArtist] Spotify returned results but no match met threshold',
              {
                mbid,
                artistName: mbArtist.name,
                resultCount: spotifyResults.length,
              }
            );
          }
        }
      } catch (error) {
        console.warn('[MBArtist] Spotify image fetch failed:', error);
      }

      // Fallback to Wikidata if no Spotify image
      if (!finalImageUrl) {
        finalImageUrl = await this.resolveArtistImageFromWikidata(mbid);

        console.log('[MBArtist] Wikidata image resolved', {
          mbid,
          hasImage: !!finalImageUrl,
        });
      }

      return {
        id: mbid,
        source: 'musicbrainz',
        name: mbArtist.name,
        disambiguation: mbArtist.disambiguation || undefined,
        imageUrl: finalImageUrl || undefined,
        country: mbArtist.country || undefined,
        lifeSpan: mbArtist['life-span']
          ? {
              begin: mbArtist['life-span'].begin,
              end: mbArtist['life-span'].end,
              ended: mbArtist['life-span'].ended,
            }
          : undefined,
        musicbrainzId: mbid,
        urls:
          mbArtist.relations
            ?.filter((rel: any) => rel.type === 'official homepage')
            .map((rel: any) => rel.url?.resource) || [],
        aliases:
          mbArtist.aliases?.map((alias: any) => ({
            name: alias.name,
          })) || [],
      };
    } catch (error) {
      console.error('Error fetching MusicBrainz artist:', error);
      throw new Error(`Failed to fetch artist from MusicBrainz: ${mbid}`);
    }
  }

  /**
   * Get artist from Discogs
   */
  private async getDiscogsArtist(
    discogsId: string,
    skipLocalCache = false
  ): Promise<UnifiedArtistDetails> {
    if (!this.discogsClient) {
      throw new Error('Discogs client not configured');
    }

    try {
      // First check if we have this artist in our database (unless skipLocalCache is true)
      if (!skipLocalCache) {
        const localArtist = await prisma.artist.findFirst({
          where: { discogsId },
        });

        if (localArtist) {
          // Return local data with Discogs ID preserved
          return this.getLocalArtist(localArtist.id);
        }
      }

      // Fetch from Discogs API
      const discogsArtist = await this.discogsClient.getArtist(discogsId);

      // Get the best image URL
      let imageUrl: string | undefined;
      if (discogsArtist.images && discogsArtist.images.length > 0) {
        const bestImage = discogsArtist.images.reduce(
          (best: any, current: any) => {
            if (!best) return current;
            const bestSize = (best.width || 0) * (best.height || 0);
            const currentSize = (current.width || 0) * (current.height || 0);
            return currentSize > bestSize ? current : best;
          }
        );
        imageUrl = bestImage.uri || bestImage.uri150;
      }

      return {
        id: discogsId,
        source: 'discogs',
        name: discogsArtist.name,
        realName: discogsArtist.realname || undefined,
        profile: discogsArtist.profile || undefined,
        imageUrl,
        discogsId,
        urls: discogsArtist.urls || [],
        aliases: discogsArtist.aliases || [],
        members: discogsArtist.members || [],
        groups: discogsArtist.groups || [],
        _discogs: {
          type: 'artist',
          uri: discogsArtist.uri || '',
          resource_url: discogsArtist.resource_url || '',
        },
      };
    } catch (error) {
      console.error('Error fetching Discogs artist:', error);
      throw new Error(`Failed to fetch artist from Discogs: ${discogsId}`);
    }
  }

  /**
   * Get artist discography based on source
   */
  async getArtistDiscography(
    id: string,
    options: {
      source: 'local' | 'musicbrainz' | 'discogs';
    }
  ) {
    const { source } = options;

    if (source === 'local') {
      // Look up local artist by UUID, then fetch discography via their MBID
      try {
        const localArtist = await prisma.artist.findUnique({ where: { id } });
        if (localArtist) {
          if (localArtist.musicbrainzId) {
            return this.getMusicBrainzDiscography(localArtist.musicbrainzId);
          }
          // No MBID available → return empty
          console.warn(
            `[UnifiedArtistService] Local artist has no MusicBrainz ID: ${id}`
          );
          return [];
        }
        // Artist not found in local DB
        console.warn(
          `[UnifiedArtistService] Artist not found in local DB: ${id}`
        );
        return [];
      } catch (e) {
        console.error(
          '[UnifiedArtistService] Error fetching local artist discography:',
          e
        );
        return [];
      }
    }

    if (source === 'musicbrainz') {
      // ID is already a MusicBrainz ID, use it directly
      return this.getMusicBrainzDiscography(id);
    }

    if (source === 'discogs') {
      // TODO: Implement Discogs discography fetching
      console.warn(
        '[UnifiedArtistService] Discogs discography not yet implemented'
      );
      return [];
    }

    return [];
  }

  private async getLocalDiscography(artistId: string) {
    const albums = await prisma.album.findMany({
      where: {
        artists: {
          some: {
            artistId,
          },
        },
      },
      include: {
        artists: {
          include: {
            artist: true,
          },
        },
      },
      orderBy: { releaseDate: 'desc' },
    });

    return albums;
  }

  private async getMusicBrainzDiscography(mbid: string) {
    // Use queued browse for artist release-groups
    const groupsResp =
      await getQueuedMusicBrainzService().browseReleaseGroupsByArtist(
        mbid,
        100,
        0
      );
    console.log(
      '🎶 MB queue browse response keys:',
      Object.keys(groupsResp || {})
    );
    console.log(
      '🎶 MB queue browse sample item:',
      groupsResp?.['release-groups']?.[0]
    );
    const groups: any[] = groupsResp['release-groups'] || [];

    // Normalize all releases (no filtering)
    const normalized = groups.map((rg: any) => ({
      id: rg.id,
      title: rg.title,
      releaseDate: rg['first-release-date'] || null,
      primaryType: rg['primary-type'] as string | undefined,
      secondaryTypes: (rg['secondary-types'] as string[] | undefined) || [],
      // Minimal artist credits for linking in the UI
      artistCredits: Array.isArray(rg['artist-credit'])
        ? rg['artist-credit'].map((ac: any, index: number) => ({
            name: ac.name,
            artist: { id: ac.artist?.id, name: ac.artist?.name || ac.name },
            position: index,
          }))
        : [],
      // Use Cover Art Archive release-group front image (will 404 if not available; UI has fallback)
      imageUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
      source: 'musicbrainz' as const,
    }));

    // Helper to sort by date (newest first)
    const sortByDate = (releases: any[]) => {
      return releases.sort((a, b) => {
        const aTime = a.releaseDate ? Date.parse(a.releaseDate) : -Infinity;
        const bTime = b.releaseDate ? Date.parse(b.releaseDate) : -Infinity;
        return bTime - aTime;
      });
    };

    // Helper to check if release has a specific secondary type
    const hasSecondaryType = (release: any, type: string) => {
      return release.secondaryTypes.some(
        (t: string) => t.toLowerCase() === type.toLowerCase()
      );
    };

    // Categorize releases by type
    const categorized = {
      albums: [] as any[],
      eps: [] as any[],
      singles: [] as any[],
      compilations: [] as any[],
      liveAlbums: [] as any[],
      remixes: [] as any[],
      soundtracks: [] as any[],
      other: [] as any[],
    };

    normalized.forEach(release => {
      const primary = (release.primaryType || '').toLowerCase();

      // Secondary types take precedence for categorization
      if (hasSecondaryType(release, 'compilation')) {
        categorized.compilations.push(release);
      } else if (hasSecondaryType(release, 'live')) {
        categorized.liveAlbums.push(release);
      } else if (hasSecondaryType(release, 'remix')) {
        categorized.remixes.push(release);
      } else if (hasSecondaryType(release, 'soundtrack')) {
        categorized.soundtracks.push(release);
      } else if (primary === 'album') {
        categorized.albums.push(release);
      } else if (primary === 'ep') {
        categorized.eps.push(release);
      } else if (primary === 'single') {
        categorized.singles.push(release);
      } else {
        // Broadcast, Other, or anything else
        categorized.other.push(release);
      }
    });

    // Sort each category by date
    Object.keys(categorized).forEach(key => {
      categorized[key as keyof typeof categorized] = sortByDate(
        categorized[key as keyof typeof categorized]
      );
    });

    return categorized;
  }

  private async getDiscogsDiscography(discogsId: string) {
    if (!this.discogsClient) {
      throw new Error('Discogs client not configured');
    }

    const releases = await this.discogsClient.getArtistReleases(discogsId, {
      page: 1,
      per_page: 100,
      sort: 'year',
      sort_order: 'desc',
    });

    return (
      releases.releases?.map((release: any) => ({
        id: release.id.toString(),
        title: release.title,
        releaseDate: release.year ? `${release.year}-01-01` : null,
        type: release.type,
        source: 'discogs',
      })) || []
    );
  }
}

export const unifiedArtistService = new UnifiedArtistService();
