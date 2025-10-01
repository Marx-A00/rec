import { unifiedArtistService } from './unified-artist-service';

export async function getArtistDetails(id: string, options?: { source?: 'local' | 'musicbrainz' | 'discogs' }) {
  return unifiedArtistService.getArtistDetails(id, options);
}

export async function getArtistDiscography(id: string) {
  return unifiedArtistService.getArtistDiscography(id);
}
