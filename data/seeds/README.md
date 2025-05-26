# Database Seeding

This directory contains scripts to populate your database with sample data for development and testing.

## Usage

### Seed the database
```bash
pnpm db:seed
```

### Reset and seed the database
```bash
pnpm db:reset
```

## What gets seeded

- **5 Users** - Sample users with realistic names and profile images
- **10 Albums** - Classic albums across various genres (Rock, Jazz, Hip Hop, Electronic, etc.)
- **50 Tracks** - 5 tracks per album with realistic durations
- **15 Recommendations** - Cross-referenced recommendations between users and albums
- **5 Collections** - Sample music collections with different themes

## Sample Data Overview

### Users
- Alex Rodriguez (alex@example.com)
- Sam Chen (sam@example.com) 
- Jordan Taylor (jordan@example.com)
- Casey Morgan (casey@example.com)
- Riley Park (riley@example.com)

### Albums Include
- OK Computer - Radiohead
- The Dark Side of the Moon - Pink Floyd
- Kind of Blue - Miles Davis
- Nevermind - Nirvana
- To Pimp a Butterfly - Kendrick Lamar
- Random Access Memories - Daft Punk
- Abbey Road - The Beatles
- Blonde - Frank Ocean
- The Velvet Underground & Nico
- Rumours - Fleetwood Mac

### Collections Include
- Essential Albums (public)
- Late Night Vibes (private)
- 90s Grunge Essentials (public)
- Jazz Foundations (public)
- Electronic Explorations (private)

## Notes

- The seed script will clear all existing data before seeding
- All IDs are deterministic for consistent testing
- Images use Unsplash URLs for realistic album covers
- Recommendation scores range from 76-95 to simulate realistic ratings
- Collections include personal ratings and notes for albums

## Development Tips

- Use `pnpm db:reset` when you want to start fresh
- The sample data is designed to be realistic and interconnected
- You can modify the data files in `/data/` to customize the seed data
- All data respects the Prisma schema foreign key constraints 