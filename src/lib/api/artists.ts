import { Client, DiscogsImage } from 'disconnect';

import { ArtistDetails } from '@/types/artist';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +https://github.com/Marx-A00/rec',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

// Default placeholder image for artists without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function getArtistDetails(id: string): Promise<ArtistDetails> {
  if (!id) {
    throw new Error('Artist ID is required');
  }

  console.log(`Fetching artist details for ID: ${id}`);

  // Try to get the artist details
  let artistDetails;
  try {
    artistDetails = await db.getArtist(id);
    console.log(`Found artist: ${artistDetails.name}`);
  } catch (artistError) {
    console.error('Error fetching artist details:', artistError);
    throw new Error('Artist not found');
  }

  // Get the best image URL
  let imageUrl = PLACEHOLDER_IMAGE;
  if (artistDetails.images && artistDetails.images.length > 0) {
    // Find the largest image or use the first one
    const bestImage = artistDetails.images.reduce(
      (best: DiscogsImage, current: DiscogsImage) => {
        if (!best) return current;
        const bestSize = (best.width || 0) * (best.height || 0);
        const currentSize = (current.width || 0) * (current.height || 0);
        return currentSize > bestSize ? current : best;
      }
    );
    imageUrl = bestImage.uri || bestImage.uri150 || PLACEHOLDER_IMAGE;
  }

  // Format the artist data
  const artist: ArtistDetails = {
    id: id.toString(),
    title: artistDetails.name || 'Unknown Artist',
    subtitle: artistDetails.realname || '',
    type: 'artist',
    image: {
      url: imageUrl,
      width: 400,
      height: 400,
      alt: `${artistDetails.name || 'Artist'} photo`,
    },
    // Additional artist-specific data
    realname: artistDetails.realname || '',
    profile: artistDetails.profile || '',
    urls: artistDetails.urls || [],
    aliases: artistDetails.aliases || [],
    members: artistDetails.members || [],
    groups: artistDetails.groups || [],
    _discogs: {
      type: 'artist',
      uri: artistDetails.uri || '',
      resource_url: artistDetails.resource_url || '',
    },
  };

  console.log(`Successfully formatted artist: ${artist.title}`);
  return artist;
}
