import { Client } from 'disconnect';
import { prisma } from '@/lib/prisma';
import { musicbrainzService } from '@/lib/musicbrainz/basic-service';

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
   * Detects the source of an artist ID based on its format
   */
  private detectSource(id: string): 'local' | 'musicbrainz' | 'discogs' {
    // MusicBrainz UUIDs
    if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return 'musicbrainz';
    }

    // Local database IDs (usually start with 'cm' from Prisma)
    if (id.startsWith('cm') || id.startsWith('ck') || id.startsWith('cl')) {
      return 'local';
    }

    // Discogs IDs are numeric
    if (/^\d+$/.test(id)) {
      return 'discogs';
    }

    // Default to local if uncertain
    return 'local';
  }

  /**
   * Get artist details from any source based on ID
   */
  async getArtistDetails(id: string): Promise<UnifiedArtistDetails> {
    const source = this.detectSource(id);

    switch (source) {
      case 'local':
        return this.getLocalArtist(id);
      case 'musicbrainz':
        return this.getMusicBrainzArtist(id);
      case 'discogs':
        return this.getDiscogsArtist(id);
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
  private async getMusicBrainzArtist(mbid: string): Promise<UnifiedArtistDetails> {
    try {
      // First check if we have this artist in our database
      const localArtist = await prisma.artist.findFirst({
        where: { musicbrainzId: mbid },
      });

      if (localArtist) {
        // Return local data with MusicBrainz ID preserved
        return this.getLocalArtist(localArtist.id);
      }

      // Fetch from MusicBrainz API
      const mbArtist = await musicbrainzService.getArtist(mbid, [
        'aliases',
        'url-rels',
        'tags',
      ]);

      return {
        id: mbid,
        source: 'musicbrainz',
        name: mbArtist.name,
        disambiguation: mbArtist.disambiguation || undefined,
        // MusicBrainz artist lookup may not include annotations reliably; omit profile
        country: mbArtist.country || undefined,
        lifeSpan: mbArtist['life-span'] ? {
          begin: mbArtist['life-span'].begin,
          end: mbArtist['life-span'].end,
          ended: mbArtist['life-span'].ended,
        } : undefined,
        musicbrainzId: mbid,
        urls: mbArtist.relations
          ?.filter((rel: any) => rel.type === 'official homepage')
          .map((rel: any) => rel.url?.resource) || [],
        aliases: mbArtist.aliases?.map((alias: any) => ({
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
  private async getDiscogsArtist(discogsId: string): Promise<UnifiedArtistDetails> {
    if (!this.discogsClient) {
      throw new Error('Discogs client not configured');
    }

    try {
      // First check if we have this artist in our database
      const localArtist = await prisma.artist.findFirst({
        where: { discogsId },
      });

      if (localArtist) {
        // Return local data with Discogs ID preserved
        return this.getLocalArtist(localArtist.id);
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
  async getArtistDiscography(id: string) {
    const source = this.detectSource(id);

    switch (source) {
      case 'local':
        return this.getLocalDiscography(id);
      case 'musicbrainz':
        return this.getMusicBrainzDiscography(id);
      case 'discogs':
        return this.getDiscogsDiscography(id);
      default:
        throw new Error(`Unable to determine source for artist ID: ${id}`);
    }
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
    const releaseGroups = await musicbrainzService.getArtistReleaseGroups(mbid, 100);

    const groups = releaseGroups['release-groups'] || [];

    // Normalize, filter to main albums, and sort newest -> oldest
    const excludedSecondaryTypes = new Set([
      'compilation',
      'live',
      'remix',
      'soundtrack',
      'dj-mix',
      'mixtape/street',
    ]);

    const normalized = groups.map((rg: any) => ({
      id: rg.id,
      title: rg.title,
      releaseDate: rg['first-release-date'] || null,
      primaryType: rg['primary-type'] as string | undefined,
      secondaryTypes: (rg['secondary-types'] as string[] | undefined) || [],
      // Use Cover Art Archive release-group front image (will 404 if not available; UI has fallback)
      imageUrl: `https://coverartarchive.org/release-group/${rg.id}/front-250`,
      source: 'musicbrainz' as const,
    }));

    const mainAlbums = normalized.filter(item => {
      const isAlbum = (item.primaryType || '').toLowerCase() === 'album';
      if (!isAlbum) return false;
      const hasExcludedSecondary = item.secondaryTypes.some(t => excludedSecondaryTypes.has(t.toLowerCase()));
      return !hasExcludedSecondary;
    });

    mainAlbums.sort((a, b) => {
      const aTime = a.releaseDate ? Date.parse(a.releaseDate) : -Infinity;
      const bTime = b.releaseDate ? Date.parse(b.releaseDate) : -Infinity;
      return bTime - aTime;
    });

    return mainAlbums;
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

    return releases.releases?.map((release: any) => ({
      id: release.id.toString(),
      title: release.title,
      releaseDate: release.year ? `${release.year}-01-01` : null,
      type: release.type,
      source: 'discogs',
    })) || [];
  }
}

export const unifiedArtistService = new UnifiedArtistService();