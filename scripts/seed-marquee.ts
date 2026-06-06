/**
 * Seed the landing-page marquee from the previously hardcoded cover list.
 *
 * Parses each "Artist - Title" entry, finds the matching album already in the
 * database, and creates a MarqueeAlbum row (idempotent via the albumId unique
 * constraint). Albums not found in the DB are reported so they can be added
 * manually via /admin/marquee.
 *
 * Usage: pnpm tsx scripts/seed-marquee.ts
 */

import { PrismaClient } from '@prisma/client';
import chalk from 'chalk';

const prisma = new PrismaClient();

// "Artist - Title" pulled from the old landing-page hardcoded list.
const ENTRIES: string[] = [
  'Charli XCX - Brat',
  'Daft Punk - Random Access Memories',
  'Hannah Diamond - Reflections',
  'Nirvana - Nevermind',
  "The Beatles - Sgt. Pepper's Lonely Hearts Club Band",
  'Lorde - Melodrama',
  'Olivia Rodrigo - SOUR',
  'My Chemical Romance - The Black Parade',
  'The Strokes - Is This It',
  'OutKast - Stankonia',
  '2hollis - boy',
  'Foo Fighters - Caught in the Echo',
  'St. Vincent - Live in London',
  'Bladee - SPIDERR',
  'Lil Wayne - Tha Carter II',
  'Britney Spears - Blackout',
  'Gym Class Heroes - As Cruel as School Children',
  'Aqua - Aquarium',
  'Rihanna - Loud',
  'Ashanti - Ashanti',
  'twenty one pilots - Blurryface',
  'Talking Heads - Remain in Light',
  'Ariana Grande - thank u, next',
  'Evanescence - Fallen',
  'Wiz Khalifa - Rolling Papers',
  'Slayer - Reign in Blood',
  'Nine Inch Nails - The Downward Spiral',
  'The White Stripes - Elephant',
  'Pitbull - Pitbull Starring In Rebelution',
  'JAY-Z - Blueprint 2.1',
  'Playboi Carti - Die Lit',
  'Three Days Grace - One-X',
  'Kings of Leon - Only by the Night',
  'DJ Shadow - Endtroducing.....',
  'System of a Down - Mezmerize',
  'Drake - Nothing Was the Same',
  'Wu-Tang Clan - Enter the Wu-Tang (36 Chambers)',
  'Lil Uzi Vert - Luv Is Rage 2',
  'FKA twigs - LP1',
  'Fall Out Boy - From Under the Cork Tree',
  'Dr. Dre - 2001',
  "Coolio - Gangsta's Paradise",
  'Red Hot Chili Peppers - By the Way',
  'Mark Ronson - Version',
  'Paramore - Paramore',
  'Depeche Mode - Playing the Angel',
  'Rage Against the Machine - Rage Against the Machine',
  'Carly Rae Jepsen - Kiss',
  'The Game - The Documentary',
  'Led Zeppelin - Led Zeppelin IV',
  'Coldplay - Ghost Stories',
  'Björk - Homogenic',
  'Justin Timberlake - Justified',
  'P!nk - Funhouse',
  'Linkin Park - Hybrid Theory',
  'The Weeknd - Beauty Behind The Madness',
  'Playboi Carti - MUSIC',
  'The Rolling Stones - Sticky Fingers',
  'Jack Ü - Skrillex and Diplo Present Jack Ü',
  'Alicia Keys - The Element of Freedom',
  'MGMT - Oracular Spectacular',
  'Katy Perry - Teenage Dream',
  "Project Pat - Mista Don't Play: Everythangs Workin",
  'Rihanna - Talk That Talk',
  'Eminem - The Marshall Mathers LP',
  'Weird Al Yankovic - Straight Outta Lynwood',
  'Maroon 5 - Songs About Jane',
];

function parseEntry(entry: string): { artist: string; title: string } | null {
  const idx = entry.indexOf(' - ');
  if (idx === -1) return null;
  return {
    artist: entry.slice(0, idx).trim(),
    title: entry.slice(idx + 3).trim(),
  };
}

async function findAlbum(artist: string, title: string) {
  return prisma.album.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' },
      artists: {
        some: {
          artist: { name: { equals: artist, mode: 'insensitive' } },
        },
      },
    },
    select: { id: true, title: true },
  });
}

async function main() {
  console.log(chalk.bold(`\nSeeding marquee from ${ENTRIES.length} entries\n`));

  const matched: { entry: string; albumId: string }[] = [];
  const unmatched: string[] = [];

  for (const entry of ENTRIES) {
    const parsed = parseEntry(entry);
    if (!parsed) {
      unmatched.push(entry);
      continue;
    }
    const album = await findAlbum(parsed.artist, parsed.title);
    if (album) {
      matched.push({ entry, albumId: album.id });
    } else {
      unmatched.push(entry);
    }
  }

  console.log(
    chalk.green(`Matched ${matched.length}`),
    chalk.dim('/'),
    chalk.yellow(`${unmatched.length} unmatched\n`)
  );

  // Insert matched albums in list order, preserving sortOrder. Skip ones
  // already present so the script is safe to re-run.
  let inserted = 0;
  for (let i = 0; i < matched.length; i++) {
    const { albumId } = matched[i];
    const existing = await prisma.marqueeAlbum.findUnique({
      where: { albumId },
    });
    if (existing) continue;
    await prisma.marqueeAlbum.create({
      data: { albumId, sortOrder: i },
    });
    inserted++;
  }

  console.log(chalk.green(`Inserted ${inserted} new marquee albums.`));

  if (unmatched.length > 0) {
    console.log(chalk.yellow(`\nNot found in DB (add via /admin/marquee):`));
    for (const e of unmatched) console.log(chalk.dim(`  - ${e}`));
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
