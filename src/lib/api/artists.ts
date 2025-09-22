import { unifiedArtistService } from './unified-artist-service';

export async function getArtistDetails(id: string) {
  return unifiedArtistService.getArtistDetails(id);
}

export async function getArtistDiscography(id: string) {
  return unifiedArtistService.getArtistDiscography(id);
}
