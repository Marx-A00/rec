import { Client, DiscogsImage } from 'disconnect';
import { NextResponse } from 'next/server';

// Create a client with consumer key and secret from environment variables
const db = new Client({
  userAgent: 'RecProject/1.0 +http://localhost:3000',
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
}).database();

// Default placeholder image for labels without images
const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/400x400?text=No+Image';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  if (!id) {
    console.log('Missing label ID parameter');
    return NextResponse.json(
      { error: 'Label ID is required' },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching label details for ID: ${id}`);

    // Try to get the label details
    let labelDetails;
    try {
      labelDetails = await db.getLabel(id);
      console.log(`Found label: ${labelDetails.name}`);
    } catch (labelError) {
      console.error('Error fetching label details:', labelError);
      return NextResponse.json({ error: 'Label not found' }, { status: 404 });
    }

    console.log('Raw label data:', JSON.stringify(labelDetails, null, 2));

    // Get the best image URL
    let imageUrl = PLACEHOLDER_IMAGE;
    if (labelDetails.images && labelDetails.images.length > 0) {
      // Find the largest image or use the first one
      const bestImage = labelDetails.images.reduce(
        (best: DiscogsImage, current: DiscogsImage) => {
          if (!best) return current;
          const bestSize = (best.width || 0) * (best.height || 0);
          const currentSize = (current.width || 0) * (current.height || 0);
          return currentSize > bestSize ? current : best;
        }
      );
      imageUrl = bestImage.uri || bestImage.uri150 || PLACEHOLDER_IMAGE;
    }

    // Format the label data
    const label = {
      id: id.toString(),
      title: labelDetails.name || 'Unknown Label',
      subtitle: labelDetails.contactinfo || '',
      type: 'label',
      image: {
        url: imageUrl,
        width: 400,
        height: 400,
        alt: `${labelDetails.name || 'Label'} logo`,
      },
      // Additional label-specific data
      profile: labelDetails.profile || '',
      contactinfo: labelDetails.contactinfo || '',
      urls: labelDetails.urls || [],
      sublabels: labelDetails.sublabels || [],
      parent_label: labelDetails.parent_label || null,
      _discogs: {
        type: 'label',
        uri: labelDetails.uri || '',
        resource_url: labelDetails.resource_url || '',
      },
    };

    console.log(`Successfully formatted label: ${label.title}`);

    return NextResponse.json({
      label,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching label:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch label',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
