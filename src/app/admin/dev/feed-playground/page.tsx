'use client';

import { useState, useMemo, useEffect } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import GroupedActivityItem from './PlaygroundGroupedActivityItem';
import type { GroupedActivity } from '@/utils/activity-grouping';
import type { TransformedActivity } from '@/utils/transform-activity';

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

const USERS = [
  { id: 'user-1', name: 'Jerome', image: null },
  { id: 'user-2', name: 'Sofia', image: null },
  { id: 'user-3', name: 'Marcus', image: null },
  { id: 'user-4', name: 'Yuki', image: null },
];

const ALBUMS = [
  {
    id: '9d103871-c3b0-4a92-b3ee-7bb47afd20ae',
    title: '100',
    artist: 'Ella Mai',
    artistId: '18977aed-c430-4d24-9b8e-b5b963c26e27',
    coverArtUrl: 'https://coverartarchive.org/release-group/074dd5d5-5976-4048-808d-7b39ad70976d/front',
    cloudflareImageId: 'album-9d103871-c3b0-4a92-b3ee-7bb47afd20ae',
  },
  {
    id: '729d9604-df16-47aa-9f6b-d0935aa6f3f9',
    title: '19',
    artist: 'Adele',
    artistId: 'b2992323-b2ea-4d35-86c4-6cac74af86b2',
    coverArtUrl: 'https://coverartarchive.org/release-group/9796da06-2d59-3176-8598-2105f31ee54a/front',
    cloudflareImageId: 'album-729d9604-df16-47aa-9f6b-d0935aa6f3f9',
  },
  {
    id: '3b32dabe-49e4-4ee4-b686-0b1aa504f29f',
    title: '1999',
    artist: 'Joey Bada$$',
    artistId: 'f87a1477-7539-45ff-a540-ac1c88489313',
    coverArtUrl: 'https://coverartarchive.org/release-group/72d8aef6-d915-408e-b391-c57e5fa0a0c4/front',
    cloudflareImageId: 'album-3b32dabe-49e4-4ee4-b686-0b1aa504f29f',
  },
  {
    id: '64788461-4102-4d97-88ca-344a90a775ed',
    title: '2001',
    artist: 'Dr. Dre',
    artistId: '48ec2bc6-9e7c-4d26-8a88-5622ff2137ae',
    coverArtUrl: 'https://coverartarchive.org/release-group/f28e065d-fd56-3929-b0a4-6aa1b4c78bdb/front',
    cloudflareImageId: 'album-64788461-4102-4d97-88ca-344a90a775ed',
  },
  {
    id: '35948f83-13d8-474a-ab71-f40a755ce601',
    title: '21',
    artist: 'Adele',
    artistId: 'b2992323-b2ea-4d35-86c4-6cac74af86b2',
    coverArtUrl: 'https://coverartarchive.org/release-group/e4174758-d333-4a8e-a31f-dd0edd51518e/front',
    cloudflareImageId: 'album-35948f83-13d8-474a-ab71-f40a755ce601',
  },
  {
    id: 'a1f37ff0-512e-4354-a757-218e89f13f88',
    title: '24K Magic',
    artist: 'Bruno Mars',
    artistId: 'defbeaf3-f805-49a6-b7fd-c058f1e4af07',
    coverArtUrl: 'https://coverartarchive.org/release-group/80ea43b7-2c32-4a79-9fb0-8ff1761ebe09/front',
    cloudflareImageId: 'album-a1f37ff0-512e-4354-a757-218e89f13f88',
  },
  {
    id: 'ed0bd42b-4c0e-406a-b4de-1c0b0d2734df',
    title: '16 Biggest Hits',
    artist: 'Lonestar',
    artistId: 'c80a70b4-bc8e-49d9-9372-15dc61aa378a',
    coverArtUrl: 'https://coverartarchive.org/release-group/f3da98bb-4bab-4d71-b384-88dfcc0d23a8/front',
    cloudflareImageId: 'album-ed0bd42b-4c0e-406a-b4de-1c0b0d2734df',
  },
  {
    id: '0d586279-8dea-406a-b9df-86166881b57e',
    title: '[&]',
    artist: 'LOONA',
    artistId: 'c776174f-cbec-4c27-bea7-a633215da1c7',
    coverArtUrl: 'https://coverartarchive.org/release-group/b6e368e5-05ac-4502-a0d6-c76e59b4862c/front',
    cloudflareImageId: 'album-0d586279-8dea-406a-b9df-86166881b57e',
  },
  {
    id: 'c957a190-7549-44b3-b4b4-9327387eefd0',
    title: '[12:00]',
    artist: 'LOONA',
    artistId: 'c776174f-cbec-4c27-bea7-a633215da1c7',
    coverArtUrl: 'https://coverartarchive.org/release-group/584fe437-9e6e-40f8-b61c-1f437139226b/front',
    cloudflareImageId: 'album-c957a190-7549-44b3-b4b4-9327387eefd0',
  },
  {
    id: '06bde19e-5d86-4271-9ed5-af5e4caef5b2',
    title: '4 Seasons of Boyz II Men',
    artist: 'Boyz II Men',
    artistId: '7530cee1-278f-4956-aef1-27f45f7fc85a',
    coverArtUrl: 'https://cdn-images.dzcdn.net/images/cover/87f12bd9d71e07e655ff27c008dceffa/1000x1000-000000-80-0-0.jpg',
    cloudflareImageId: 'album-06bde19e-5d86-4271-9ed5-af5e4caef5b2',
  },
];

// Use a fixed reference time to avoid SSR/client hydration mismatch from Date.now()
const REFERENCE_TIME = new Date('2025-06-24T12:00:00Z').getTime();

function minutesAgo(n: number): string {
  return new Date(REFERENCE_TIME - n * 60 * 1000).toISOString();
}

function makeRecActivity(
  id: string,
  user: (typeof USERS)[number],
  basisAlbum: (typeof ALBUMS)[number],
  recAlbum: (typeof ALBUMS)[number],
  score: number,
  ago: number
): TransformedActivity {
  return {
    id,
    type: 'recommendation',
    actorId: user.id,
    actorName: user.name,
    actorImage: user.image,
    albumId: recAlbum.id,
    albumTitle: recAlbum.title,
    albumArtist: recAlbum.artist,
    artistId: recAlbum.artistId,
    albumImage: recAlbum.coverArtUrl ?? null,
    albumCloudflareImageId: recAlbum.cloudflareImageId ?? null,
    createdAt: minutesAgo(ago),
    metadata: {
      score,
      basisAlbum: {
        id: basisAlbum.id,
        title: basisAlbum.title,
        coverArtUrl: basisAlbum.coverArtUrl,
        cloudflareImageId: basisAlbum.cloudflareImageId,
        artists: [{ artist: { name: basisAlbum.artist } }],
      },
    },
  };
}

function makeCollectionActivity(
  id: string,
  user: (typeof USERS)[number],
  album: (typeof ALBUMS)[number],
  rating: number | undefined,
  ago: number
): TransformedActivity {
  return {
    id,
    type: 'collection_add',
    actorId: user.id,
    actorName: user.name,
    actorImage: user.image,
    albumId: album.id,
    albumTitle: album.title,
    albumArtist: album.artist,
    artistId: album.artistId,
    albumImage: album.coverArtUrl ?? null,
    albumCloudflareImageId: album.cloudflareImageId ?? null,
    createdAt: minutesAgo(ago),
    metadata: {
      collectionName: 'Favorites',
      personalRating: rating,
    },
  };
}

function makeFollowActivity(
  id: string,
  user: (typeof USERS)[number],
  target: (typeof USERS)[number],
  ago: number
): TransformedActivity {
  return {
    id,
    type: 'follow',
    actorId: user.id,
    actorName: user.name,
    actorImage: user.image,
    targetId: target.id,
    targetName: target.name,
    targetImage: target.image,
    createdAt: minutesAgo(ago),
  };
}

function toGroup(activities: TransformedActivity[]): GroupedActivity {
  const first = activities[0];
  const last = activities[activities.length - 1];
  const ids = activities
    .map(a => a.id)
    .sort()
    .join('-');
  return {
    id: `group-${first.actorId}-${first.type}-${ids}`,
    type: first.type,
    actorId: first.actorId,
    actorName: first.actorName,
    actorImage: first.actorImage,
    createdAt: first.createdAt,
    earliestCreatedAt: last.createdAt,
    activities,
    isGrouped: activities.length > 1,
  };
}

// ---------------------------------------------------------------------------
// Pre-built mock groups
// ---------------------------------------------------------------------------

const MOCK_GROUPS: Record<string, { label: string; group: GroupedActivity }> = {
  rec_single_10: {
    label: 'Single Rec (score 10)',
    group: toGroup([
      makeRecActivity('r1', USERS[0], ALBUMS[0], ALBUMS[1], 10, 5),
    ]),
  },
  rec_single_8: {
    label: 'Single Rec (score 8)',
    group: toGroup([
      makeRecActivity('r2', USERS[1], ALBUMS[4], ALBUMS[5], 8, 15),
    ]),
  },
  rec_single_6: {
    label: 'Single Rec (score 6)',
    group: toGroup([
      makeRecActivity('r3', USERS[2], ALBUMS[6], ALBUMS[7], 6, 25),
    ]),
  },
  rec_single_5: {
    label: 'Single Rec (score 5)',
    group: toGroup([
      makeRecActivity('r4', USERS[3], ALBUMS[8], ALBUMS[9], 5, 35),
    ]),
  },
  rec_grouped_3: {
    label: 'Grouped Recs (3)',
    group: toGroup([
      makeRecActivity('rg1', USERS[0], ALBUMS[0], ALBUMS[1], 9, 10),
      makeRecActivity('rg2', USERS[0], ALBUMS[2], ALBUMS[4], 7, 12),
      makeRecActivity('rg3', USERS[0], ALBUMS[6], ALBUMS[8], 10, 14),
    ]),
  },
  rec_grouped_6: {
    label: 'Grouped Recs (6)',
    group: toGroup([
      makeRecActivity('rg6a', USERS[1], ALBUMS[0], ALBUMS[1], 10, 10),
      makeRecActivity('rg6b', USERS[1], ALBUMS[2], ALBUMS[3], 8, 12),
      makeRecActivity('rg6c', USERS[1], ALBUMS[4], ALBUMS[5], 7, 14),
      makeRecActivity('rg6d', USERS[1], ALBUMS[6], ALBUMS[7], 9, 16),
      makeRecActivity('rg6e', USERS[1], ALBUMS[8], ALBUMS[9], 6, 18),
      makeRecActivity('rg6f', USERS[1], ALBUMS[0], ALBUMS[9], 5, 20),
    ]),
  },
  coll_single: {
    label: 'Single Collection Add',
    group: toGroup([
      makeCollectionActivity('c1', USERS[2], ALBUMS[5], 9, 40),
    ]),
  },
  coll_single_no_rating: {
    label: 'Collection (no rating)',
    group: toGroup([
      makeCollectionActivity('c2', USERS[3], ALBUMS[8], undefined, 50),
    ]),
  },
  coll_grouped_4: {
    label: 'Grouped Collections (4)',
    group: toGroup([
      makeCollectionActivity('cg1', USERS[2], ALBUMS[0], 10, 60),
      makeCollectionActivity('cg2', USERS[2], ALBUMS[3], 8, 62),
      makeCollectionActivity('cg3', USERS[2], ALBUMS[5], 7, 64),
      makeCollectionActivity('cg4', USERS[2], ALBUMS[9], undefined, 66),
    ]),
  },
  follow_single: {
    label: 'Single Follow',
    group: toGroup([makeFollowActivity('f1', USERS[3], USERS[0], 70)]),
  },
  follow_grouped_3: {
    label: 'Grouped Follows (3)',
    group: toGroup([
      makeFollowActivity('fg1', USERS[1], USERS[0], 80),
      makeFollowActivity('fg2', USERS[1], USERS[2], 82),
      makeFollowActivity('fg3', USERS[1], USERS[3], 84),
    ]),
  },
};

const ALL_KEYS = Object.keys(MOCK_GROUPS);

const PRESETS: Record<string, string[]> = {
  'All items': ALL_KEYS,
  'Recs only': ALL_KEYS.filter(k => k.startsWith('rec_')),
  'Collections only': ALL_KEYS.filter(k => k.startsWith('coll_')),
  'Follows only': ALL_KEYS.filter(k => k.startsWith('follow_')),
  'Singles only': ALL_KEYS.filter(k => k.includes('single')),
  'Grouped only': ALL_KEYS.filter(k => k.includes('grouped')),
  'Mixed feed': [
    'rec_single_10',
    'coll_grouped_4',
    'follow_single',
    'rec_grouped_3',
    'coll_single',
    'rec_single_6',
    'follow_grouped_3',
  ],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FeedPlaygroundPage() {
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [enabled, setEnabled] = useState<Set<string>>(
    new Set(PRESETS['Mixed feed'])
  );

  const groups = useMemo(
    () =>
      ALL_KEYS.filter(k => enabled.has(k)).map(k => MOCK_GROUPS[k].group),
    [enabled]
  );

  const toggle = (key: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const applyPreset = (keys: string[]) => setEnabled(new Set(keys));

  return (
    <div className='flex h-[calc(100vh-5rem)] overflow-hidden relative'>
      {/* Toggle button in top bar area */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className='fixed top-4 right-4 z-[60] p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors'
        aria-label={sidebarOpen ? 'Hide settings' : 'Show settings'}
      >
        {sidebarOpen ? (
          <PanelLeftClose className='w-5 h-5' />
        ) : (
          <PanelLeftOpen className='w-5 h-5' />
        )}
      </button>

      {/* Controls sidebar */}
      <div
        className={`shrink-0 border-r border-zinc-800 bg-zinc-950 overflow-y-auto overflow-x-hidden transition-all duration-300 ${
          sidebarOpen ? 'w-72 p-4 pl-6' : 'w-0'
        }`}
      >
        {sidebarOpen && (
          <div className='mb-1'>
            <h2 className='text-lg font-bold text-white'>
              Feed Playground
            </h2>
          </div>
        )}
        {sidebarOpen && (
          <p className='text-xs text-zinc-500 mb-6'>
            Toggle items to control what appears in the feed.
          </p>
        )}

        {sidebarOpen && (<div className='space-y-6'>
        {/* Presets */}
        <div>
          <h3 className='text-xs text-zinc-500 uppercase tracking-wider mb-2'>
            Presets
          </h3>
          <div className='flex flex-wrap gap-1.5'>
            {Object.entries(PRESETS).map(([name, keys]) => {
              const isActive =
                keys.length === enabled.size &&
                keys.every(k => enabled.has(k));
              return (
                <button
                  key={name}
                  onClick={() => applyPreset(keys)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    isActive
                      ? 'bg-emeraled-green/20 border-emeraled-green/40 text-emeraled-green'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Individual toggles */}
        <div>
          <h3 className='text-xs text-zinc-500 uppercase tracking-wider mb-2'>
            Recommendations
          </h3>
          <div className='space-y-1'>
            {ALL_KEYS.filter(k => k.startsWith('rec_')).map(key => (
              <label
                key={key}
                className='flex items-center gap-2 text-sm cursor-pointer group'
              >
                <input
                  type='checkbox'
                  checked={enabled.has(key)}
                  onChange={() => toggle(key)}
                  className='accent-emeraled-green'
                />
                <span className='text-zinc-300 group-hover:text-white transition-colors'>
                  {MOCK_GROUPS[key].label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className='text-xs text-zinc-500 uppercase tracking-wider mb-2'>
            Collections
          </h3>
          <div className='space-y-1'>
            {ALL_KEYS.filter(k => k.startsWith('coll_')).map(key => (
              <label
                key={key}
                className='flex items-center gap-2 text-sm cursor-pointer group'
              >
                <input
                  type='checkbox'
                  checked={enabled.has(key)}
                  onChange={() => toggle(key)}
                  className='accent-emeraled-green'
                />
                <span className='text-zinc-300 group-hover:text-white transition-colors'>
                  {MOCK_GROUPS[key].label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className='text-xs text-zinc-500 uppercase tracking-wider mb-2'>
            Follows
          </h3>
          <div className='space-y-1'>
            {ALL_KEYS.filter(k => k.startsWith('follow_')).map(key => (
              <label
                key={key}
                className='flex items-center gap-2 text-sm cursor-pointer group'
              >
                <input
                  type='checkbox'
                  checked={enabled.has(key)}
                  onChange={() => toggle(key)}
                  className='accent-emeraled-green'
                />
                <span className='text-zinc-300 group-hover:text-white transition-colors'>
                  {MOCK_GROUPS[key].label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className='pt-2 border-t border-zinc-800'>
          <p className='text-xs text-zinc-600'>
            {enabled.size} of {ALL_KEYS.length} items shown
          </p>
        </div>
        </div>)}
      </div>

      {/* Feed preview */}
      <div className='flex-1 bg-zinc-950 overflow-y-auto custom-scrollbar'>
        <div className='mx-auto py-8 px-6'>
          <div className='mb-6 text-center'>
            <h2 className='text-xl font-semibold text-cosmic-latte'>
              Social Activity
            </h2>
          </div>

          {groups.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-zinc-500'>
                No items selected. Toggle some items in the sidebar.
              </p>
            </div>
          ) : (
            <div className='space-y-4'>
              {groups.map((group, i) => (
                <div key={group.id} className='relative'>
                  <span className='absolute -left-8 top-2 text-xs text-zinc-600 font-mono'>
                    {i + 1}
                  </span>
                  <GroupedActivityItem group={group} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
