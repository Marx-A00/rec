export interface HintDefinition {
  id: string;
  title: string;
  description: string;
  page: string;
  pagePath: string | null;
}

export const HINT_DEFINITIONS: HintDefinition[] = [
  {
    id: 'search-bar',
    title: 'Search',
    description: 'Find albums, artists, tracks, and users across the platform.',
    page: 'Header',
    pagePath: null,
  },
  {
    id: 'browse-welcome',
    title: 'Discover Music',
    description:
      'Browse trending albums, discover new artists, and explore recommendations from the community.',
    page: 'Browse',
    pagePath: '/browse',
  },
  {
    id: 'profile-welcome',
    title: 'Your Profile',
    description:
      'This is your musical identity! See your recs, collections, followers, and music stats all in one place.',
    page: 'Profile',
    pagePath: '/profile',
  },
  {
    id: 'album-recs-tab',
    title: 'Album Recommendations',
    description:
      'See what the community recommends based on this album — both as a source and as a recommendation.',
    page: 'Album Detail',
    pagePath: null,
  },
  {
    id: 'album-interactions',
    title: 'Quick Actions',
    description:
      'Create a rec from this album, add it to your collection, or share it with friends.',
    page: 'Album Detail',
    pagePath: null,
  },
  {
    id: 'artist-discography',
    title: 'Artist Discography',
    description:
      "Explore this artist's albums. Click any album to see details, tracklists, and community recommendations.",
    page: 'Artist Detail',
    pagePath: null,
  },
];
