// src/lib/graphql/dataloaders/index.ts
// DataLoader factory functions for N+1 query prevention

import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';

// Artist DataLoader - batch load artists by IDs
export function createArtistLoader(prisma: PrismaClient) {
  return new DataLoader(async (artistIds: readonly string[]) => {
    const artists = await prisma.artist.findMany({
      where: { id: { in: [...artistIds] } },
    });

    // Return artists in the same order as requested IDs
    const artistMap = new Map(artists.map(artist => [artist.id, artist]));
    return artistIds.map(id => artistMap.get(id) || null);
  });
}

// Album DataLoader - batch load albums by IDs
export function createAlbumLoader(prisma: PrismaClient) {
  return new DataLoader(async (albumIds: readonly string[]) => {
    const albums = await prisma.album.findMany({
      where: { id: { in: [...albumIds] } },
    });

    const albumMap = new Map(albums.map(album => [album.id, album]));
    return albumIds.map(id => albumMap.get(id) || null);
  });
}

// Track DataLoader - batch load tracks by IDs
export function createTrackLoader(prisma: PrismaClient) {
  return new DataLoader(async (trackIds: readonly string[]) => {
    const tracks = await prisma.track.findMany({
      where: { id: { in: [...trackIds] } },
    });

    const trackMap = new Map(tracks.map(track => [track.id, track]));
    return trackIds.map(id => trackMap.get(id) || null);
  });
}

// User DataLoader - batch load users by IDs
export function createUserLoader(prisma: PrismaClient) {
  return new DataLoader(async (userIds: readonly string[]) => {
    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
    });

    const userMap = new Map(users.map(user => [user.id, user]));
    return userIds.map(id => userMap.get(id) || null);
  });
}

// Collection DataLoader - batch load collections by IDs
export function createCollectionLoader(prisma: PrismaClient) {
  return new DataLoader(async (collectionIds: readonly string[]) => {
    const collections = await prisma.collection.findMany({
      where: { id: { in: [...collectionIds] } },
    });

    const collectionMap = new Map(collections.map(collection => [collection.id, collection]));
    return collectionIds.map(id => collectionMap.get(id) || null);
  });
}

// Albums by Artist DataLoader - batch load albums for multiple artists
export function createAlbumsByArtistLoader(prisma: PrismaClient) {
  return new DataLoader(async (artistIds: readonly string[]) => {
    const albumArtists = await prisma.albumArtist.findMany({
      where: { artistId: { in: [...artistIds] } },
      include: { album: true },
      orderBy: { position: 'asc' },
    });

    // Group albums by artist ID
    const albumsByArtist = new Map<string, any[]>();
    for (const aa of albumArtists) {
      if (!albumsByArtist.has(aa.artistId)) {
        albumsByArtist.set(aa.artistId, []);
      }
      albumsByArtist.get(aa.artistId)!.push(aa.album);
    }

    return artistIds.map(artistId => albumsByArtist.get(artistId) || []);
  });
}

// Tracks by Album DataLoader - batch load tracks for multiple albums
export function createTracksByAlbumLoader(prisma: PrismaClient) {
  return new DataLoader(async (albumIds: readonly string[]) => {
    const tracks = await prisma.track.findMany({
      where: { albumId: { in: [...albumIds] } },
      orderBy: [{ discNumber: 'asc' }, { trackNumber: 'asc' }],
    });

    // Group tracks by album ID
    const tracksByAlbum = new Map<string, any[]>();
    for (const track of tracks) {
      if (!tracksByAlbum.has(track.albumId)) {
        tracksByAlbum.set(track.albumId, []);
      }
      tracksByAlbum.get(track.albumId)!.push(track);
    }

    return albumIds.map(albumId => tracksByAlbum.get(albumId) || []);
  });
}

// Artists by Album DataLoader - batch load artists for multiple albums
export function createArtistsByAlbumLoader(prisma: PrismaClient) {
  return new DataLoader(async (albumIds: readonly string[]) => {
    const albumArtists = await prisma.albumArtist.findMany({
      where: { albumId: { in: [...albumIds] } },
      include: { artist: true },
      orderBy: { position: 'asc' },
    });

    // Group artist credits by album ID
    const artistsByAlbum = new Map<string, any[]>();
    for (const aa of albumArtists) {
      if (!artistsByAlbum.has(aa.albumId)) {
        artistsByAlbum.set(aa.albumId, []);
      }
      artistsByAlbum.get(aa.albumId)!.push({
        artist: aa.artist,
        role: aa.role,
        position: aa.position,
      });
    }

    return albumIds.map(albumId => artistsByAlbum.get(albumId) || []);
  });
}

// Collections by User DataLoader - batch load collections for multiple users
export function createCollectionsByUserLoader(prisma: PrismaClient) {
  return new DataLoader(async (userIds: readonly string[]) => {
    const collections = await prisma.collection.findMany({
      where: { userId: { in: [...userIds] } },
      orderBy: { updatedAt: 'desc' },
    });

    // Group collections by user ID
    const collectionsByUser = new Map<string, any[]>();
    for (const collection of collections) {
      if (!collectionsByUser.has(collection.userId)) {
        collectionsByUser.set(collection.userId, []);
      }
      collectionsByUser.get(collection.userId)!.push(collection);
    }

    return userIds.map(userId => collectionsByUser.get(userId) || []);
  });
}
