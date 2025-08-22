import { Client } from 'disconnect';

import {
  mapDiscogsMasterToAlbum,
  mapDiscogsReleaseToAlbum,
} from '@/lib/discogs/mappers';
import { Album } from '@/types/album';
import { DiscogsMaster } from '@/types/discogs/master';
import { DiscogsRelease } from '@/types/discogs/release';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +https://github.com/Marx-A00/rec',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

export async function getAlbumDetails(id: string): Promise<Album> {
  if (!id) {
    throw new Error('Album ID is required');
  }

  console.log(`Fetching album details for ID: ${id}`);

  // Try to get the master release details first
  try {
    const albumDetails: DiscogsMaster = await db.getMaster(id);
    console.log(`Found master release: ${albumDetails.title}`);

    // Use the mapper to convert DiscogsMaster to Album
    const album = mapDiscogsMasterToAlbum(albumDetails);
    return album;
  } catch {
    console.log(`Not a master release, trying as regular release`);

    // If not a master, try as a regular release
    try {
      const releaseDetails: DiscogsRelease = await db.getRelease(id);
      console.log(`Found regular release: ${releaseDetails.title}`);

      // Use the mapper to convert DiscogsRelease to Album
      const album = mapDiscogsReleaseToAlbum(releaseDetails);
      return album;
    } catch (releaseError) {
      console.error('Error fetching release details:', releaseError);
      throw new Error('Album not found');
    }
  }
}
