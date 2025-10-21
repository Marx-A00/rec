# Changelog

All notable changes to Rec will be documented in this file.

---

## [v1.0.0] - The Big Rewrite - October 2025

This massive update represents a complete backend overhaul with hundreds of improvements. We've rebuilt the entire data infrastructure to make Rec faster, smarter, and more reliable.

### 🎉 New Features

#### Search & Discovery
- **Smarter Search**: Now powered by fuzzy matching - find albums and artists even with typos
- **Enhanced Search Results**: See rich metadata including album types, release dates, and source information
- **Artist Navigation**: Click on any artist name to explore their full profile and discography
- **Better Discography Views**: Artist pages now show comprehensive album listings with improved metadata

#### Data & Integration
- **MusicBrainz Integration**: Switched from Discogs to MusicBrainz for richer, more accurate music data
- **Track Support**: Added support for searching and viewing individual tracks
- **Local Database**: All your music data is now stored locally for lightning-fast access
- **Cover Art Improvements**: Album covers are now cached and load faster than ever

#### Collections & Organization
- **Sortable Collections**: Drag and drop to reorder your album collections
- **Multiple Layout Options**: View your collections in horizontal or vertical layouts
- **Better Collection Navigation**: Navigate directly to albums with improved source tracking

#### Profile & Social
- **Avatar Uploads**: Upload custom profile pictures
- **User Statistics**: View detailed listening stats on profile pages
- **Following Stats**: See follower/following counts
- **Browse New Users**: Discover other music lovers on the platform

#### Dashboard & Admin
- **Admin Dashboard**: New comprehensive admin panel for system monitoring
- **Queue Dashboard**: Monitor background jobs and API calls in real-time
- **Testing Tools**: Admin testing tab for development and debugging
- **Activity Feed**: Improved activity tracking with better styling

### 🔧 Improvements

#### Performance
- **GraphQL API**: Migrated from REST to GraphQL for faster, more efficient data fetching
- **Smart Caching**: Implemented caching strategies that make pages load instantly
- **Queue System**: All API calls now use a priority queue system for better rate limiting
- **Optimized Images**: Cover art and profile images are optimized on-the-fly

#### User Experience
- **Persistent Dashboard Layout**: Your dashboard layout preferences are now saved
- **Smooth Transitions**: Added smooth animations throughout the app
- **Better Loading States**: Improved loading skeletons and indicators
- **Keyboard Shortcuts**: Press Enter in search bar to quickly navigate to results
- **Clickable Elements**: More intuitive clicking - artist names, album covers, and badges are all clickable

#### Search Bar
- **Simple Search Bar**: Redesigned search interface in the top navigation
- **Search Type Dropdown**: Filter searches by albums, artists, tracks, or users
- **Better Search Page**: Dedicated search results page with improved layout

#### Recommendations
- **Album Recommendations Tab**: View recommendations for any album
- **Artist Recommendations**: See recommendations for specific artists
- **Improved Recommendation Cards**: Better visual design for recommendation displays
- **Fixed Recommendation Creation**: Backend improvements make creating recommendations more reliable

#### Data Quality
- **Better Album Matching**: Improved algorithm for matching albums from different sources
- **Duplicate Prevention**: Fixed issues with duplicate albums appearing in collections
- **Enhanced Enrichment**: Automatic data enrichment for albums and artists
- **Source Badges**: See where your music data comes from (Local, MusicBrainz, Spotify)

### 🐛 Bug Fixes

#### Navigation & Links
- Fixed album links to properly include source information
- Fixed artist navigation from collection albums
- Fixed profile page navigation issues
- Fixed duplicate keys errors in lists
- Fixed overflow issues in collection album displays

#### Data & API
- Fixed duplicate album bug
- Fixed fetching recommendations from backend
- Fixed manual enrichment process
- Fixed image mapping for albums and artists
- Fixed artist ID tracking in recommendations
- Fixed TypeScript and build errors preventing deployment

#### User Experience
- Fixed validation for usernames (now requires letters, numbers, and specific symbols)
- Fixed anonymous user display
- Fixed edit actions visibility on other users' profiles
- Fixed "Load More" button functionality
- Fixed profile page display issues

#### Admin & Development
- Fixed production build errors related to Redis connections
- Fixed monitoring dashboard in production environments
- Fixed queue processing issues
- Fixed Cloudflare image caching errors

### 🎨 Design & UI

- New sidebar and navigation bar design
- Better dashboard panel organization
- Improved activity feed styling
- Enhanced browse page design
- Better loading animations and transitions
- Cleaner logging and console output (for developers)
- Fixed search bar dropdown styling
- Improved album modal design
- Better spacing and layout throughout the app

### 🔧 Technical Changes (for developers)

- Migrated entire backend from Discogs to MusicBrainz API
- Implemented GraphQL with Apollo Server
- Added Prisma ORM with PostgreSQL database
- Implemented BullMQ job queue with Redis for rate limiting (1 req/sec)
- Generated TypeScript types from GraphQL schema
- Added React Query (TanStack Query) for data fetching
- Implemented fuzzy search with `fuzzysort` library
- Added Cloudflare image optimization
- Set up Railway deployment configuration
- Removed legacy REST endpoints in favor of GraphQL
- Cleaned up deprecated search components

---

## Earlier Versions

### [v0.9.x] - Pre-Rewrite Era

All features and fixes before September 2025. This version used the original Discogs-based architecture.

---

**Note**: This is a living document and will be updated with each release. Have feedback? Let us know!
