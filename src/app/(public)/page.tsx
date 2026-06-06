// src/app/(public)/page.tsx
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { RecentRecs } from '@/components/landing/RecentRecs';
import { HeroMarquee } from '@/components/landing/HeroMarquee';
import { getMarqueeCovers } from '@/lib/marquee';

// Revalidate the server-rendered marquee covers every 5 minutes (ISR).
export const revalidate = 300;

// Album cover data for the marquee
const albumCovers = [
  {
    src: '/landing/Charli_XCX_-_Brat_(album_cover).png',
    alt: 'Charli XCX - Brat',
  },
  {
    src: '/demo-albums/RAM-daft-punk.jpeg',
    alt: 'Daft Punk - Random Access Memories',
  },
  {
    src: '/landing/reflections-hannah-diamond.webp',
    alt: 'Hannah Diamond - Reflections',
  },
  {
    src: '/landing/nevermind-nirvana.jpg',
    alt: 'Nirvana - Nevermind',
  },
  {
    src: '/landing/sgt-peppers-the-beatles.jpg',
    alt: "The Beatles - Sgt. Pepper's Lonely Hearts Club Band",
  },
  {
    src: '/landing/melodrama-lorde.jpg',
    alt: 'Lorde - Melodrama',
  },
  {
    src: '/landing/sour-olivia-rodrigo.jpg',
    alt: 'Olivia Rodrigo - SOUR',
  },
  {
    src: '/landing/black-parade-mcr.jpg',
    alt: 'My Chemical Romance - The Black Parade',
  },
  {
    src: '/landing/is-this-it-the-strokes.jpg',
    alt: 'The Strokes - Is This It',
  },
  {
    src: '/landing/stankonia-outkast.jpg',
    alt: 'OutKast - Stankonia',
  },
  {
    src: '/landing/boy-2hollis.jpg',
    alt: '2hollis - boy',
  },
  {
    src: '/landing/caught-in-the-echo-foo-fighters.jpg',
    alt: 'Foo Fighters - Caught in the Echo',
  },
  {
    src: '/landing/live-in-london-st-vincent.jpg',
    alt: 'St. Vincent - Live in London',
  },
  {
    src: '/landing/spiderr-bladee.jpg',
    alt: 'Bladee - SPIDERR',
  },
  {
    src: '/landing/lil-wayne-tha-carter-ii.jpg',
    alt: 'Lil Wayne - Tha Carter II',
  },
  {
    src: '/landing/britney-spears-blackout.jpg',
    alt: 'Britney Spears - Blackout',
  },
  {
    src: '/landing/gym-class-heroes-as-cruel-as-school-children.jpg',
    alt: 'Gym Class Heroes - As Cruel as School Children',
  },
  {
    src: '/landing/aqua-aquarium.jpg',
    alt: 'Aqua - Aquarium',
  },
  {
    src: '/landing/rihanna-loud.jpg',
    alt: 'Rihanna - Loud',
  },
  {
    src: '/landing/ashanti-ashanti.jpg',
    alt: 'Ashanti - Ashanti',
  },
  {
    src: '/landing/twenty-one-pilots-blurryface.jpg',
    alt: 'twenty one pilots - Blurryface',
  },
  {
    src: '/landing/talking-heads-remain-in-light.jpg',
    alt: 'Talking Heads - Remain in Light',
  },
  {
    src: '/landing/ariana-grande-thank-u-next.jpg',
    alt: 'Ariana Grande - thank u, next',
  },
  {
    src: '/landing/evanescence-fallen.jpg',
    alt: 'Evanescence - Fallen',
  },
  {
    src: '/landing/wiz-khalifa-rolling-papers.jpg',
    alt: 'Wiz Khalifa - Rolling Papers',
  },
  {
    src: '/landing/slayer-reign-in-blood.jpg',
    alt: 'Slayer - Reign in Blood',
  },
  {
    src: '/landing/nine-inch-nails-the-downward-spiral.jpg',
    alt: 'Nine Inch Nails - The Downward Spiral',
  },
  {
    src: '/landing/the-white-stripes-elephant.jpg',
    alt: 'The White Stripes - Elephant',
  },
  {
    src: '/landing/pitbull-pitbull-starring-in-rebelution.jpg',
    alt: 'Pitbull - Pitbull Starring In Rebelution',
  },
  {
    src: '/landing/jayz-blueprint-2-1.jpg',
    alt: 'JAY-Z - Blueprint 2.1',
  },
  {
    src: '/landing/playboi-carti-die-lit.jpg',
    alt: 'Playboi Carti - Die Lit',
  },
  {
    src: '/landing/three-days-grace-one-x.jpg',
    alt: 'Three Days Grace - One-X',
  },
  {
    src: '/landing/kings-of-leon-only-by-the-night.jpg',
    alt: 'Kings of Leon - Only by the Night',
  },
  {
    src: '/landing/dj-shadow-endtroducing.jpg',
    alt: 'DJ Shadow - Endtroducing.....',
  },
  {
    src: '/landing/system-of-a-down-mezmerize.jpg',
    alt: 'System of a Down - Mezmerize',
  },
  {
    src: '/landing/drake-nothing-was-the-same.jpg',
    alt: 'Drake - Nothing Was the Same',
  },
  {
    src: '/landing/wutang-clan-enter-the-wutang-36-chambers.jpg',
    alt: 'Wu-Tang Clan - Enter the Wu-Tang (36 Chambers)',
  },
  {
    src: '/landing/lil-uzi-vert-luv-is-rage-2.jpg',
    alt: 'Lil Uzi Vert - Luv Is Rage 2',
  },
  {
    src: '/landing/fka-twigs-lp1.jpg',
    alt: 'FKA twigs - LP1',
  },
  {
    src: '/landing/fall-out-boy-from-under-the-cork-tree.jpg',
    alt: 'Fall Out Boy - From Under the Cork Tree',
  },
  {
    src: '/landing/dr-dre-2001.jpg',
    alt: 'Dr. Dre - 2001',
  },
  {
    src: '/landing/coolio-gangstas-paradise.jpg',
    alt: "Coolio - Gangsta's Paradise",
  },
  {
    src: '/landing/red-hot-chili-peppers-by-the-way.jpg',
    alt: 'Red Hot Chili Peppers - By the Way',
  },
  {
    src: '/landing/mark-ronson-version.jpg',
    alt: 'Mark Ronson - Version',
  },
  {
    src: '/landing/paramore-paramore.jpg',
    alt: 'Paramore - Paramore',
  },
  {
    src: '/landing/depeche-mode-playing-the-angel.jpg',
    alt: 'Depeche Mode - Playing the Angel',
  },
  {
    src: '/landing/rage-against-the-machine-rage-against-the-machine.jpg',
    alt: 'Rage Against the Machine - Rage Against the Machine',
  },
  {
    src: '/landing/carly-rae-jepsen-kiss.jpg',
    alt: 'Carly Rae Jepsen - Kiss',
  },
  {
    src: '/landing/the-game-the-documentary.jpg',
    alt: 'The Game - The Documentary',
  },
  {
    src: '/landing/led-zeppelin-led-zeppelin-iv.jpg',
    alt: 'Led Zeppelin - Led Zeppelin IV',
  },
  {
    src: '/landing/coldplay-ghost-stories.jpg',
    alt: 'Coldplay - Ghost Stories',
  },
  {
    src: '/landing/bjork-homogenic.jpg',
    alt: 'Björk - Homogenic',
  },
  {
    src: '/landing/justin-timberlake-justified.jpg',
    alt: 'Justin Timberlake - Justified',
  },
  {
    src: '/landing/p-nk-funhouse.jpg',
    alt: 'P!nk - Funhouse',
  },
  {
    src: '/landing/linkin-park-hybrid-theory.jpg',
    alt: 'Linkin Park - Hybrid Theory',
  },
  {
    src: '/landing/the-weeknd-beauty-behind-the-madness.jpg',
    alt: 'The Weeknd - Beauty Behind The Madness',
  },
  {
    src: '/landing/playboi-carti-music.jpg',
    alt: 'Playboi Carti - MUSIC',
  },
  {
    src: '/landing/the-rolling-stones-sticky-fingers.jpg',
    alt: 'The Rolling Stones - Sticky Fingers',
  },
  {
    src: '/landing/jack-u-skrillex-and-diplo-present-jack-u.jpg',
    alt: 'Jack Ü - Skrillex and Diplo Present Jack Ü',
  },
  {
    src: '/landing/alicia-keys-the-element-of-freedom.jpg',
    alt: 'Alicia Keys - The Element of Freedom',
  },
  {
    src: '/landing/mgmt-oracular-spectacular.jpg',
    alt: 'MGMT - Oracular Spectacular',
  },
  {
    src: '/landing/katy-perry-teenage-dream.jpg',
    alt: 'Katy Perry - Teenage Dream',
  },
  {
    src: '/landing/project-pat-mista-dont-play-everythangs-workin.jpg',
    alt: "Project Pat - Mista Don't Play: Everythangs Workin",
  },
  {
    src: '/landing/rihanna-talk-that-talk.jpg',
    alt: 'Rihanna - Talk That Talk',
  },
  {
    src: '/landing/eminem-the-marshall-mathers-lp.jpg',
    alt: 'Eminem - The Marshall Mathers LP',
  },
  {
    src: '/landing/weird-al-yankovic-straight-outta-lynwood.jpg',
    alt: 'Weird Al Yankovic - Straight Outta Lynwood',
  },
  {
    src: '/landing/maroon-5-songs-about-jane.jpg',
    alt: 'Maroon 5 - Songs About Jane',
  },
];

async function HeroSection() {
  const dbCovers = await getMarqueeCovers();
  // Use curated DB covers (clickable) when present, else the static set.
  const covers = dbCovers.length > 0 ? dbCovers : albumCovers;
  return (
    <section className='relative min-h-[calc(100vh-4rem)] overflow-hidden bg-black'>
      {/* Subtle gradient overlay */}
      <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-cosmic-latte/5 via-transparent to-transparent pointer-events-none' />

      {/* Main content */}
      <div className='relative z-10 flex min-h-[calc(100vh-4rem)]'>
        {/* Left side - Hero content */}
        <div className='flex flex-1 flex-col justify-center px-6 sm:px-12 lg:px-20 py-12'>
          <div className='max-w-xl'>
            {/* Logo/Brand */}
            <div className='mb-8'>
              <h1 className='text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-cosmic-latte'>
                rec
              </h1>
            </div>

            {/* Tagline */}
            <h2 className='text-2xl sm:text-3xl lg:text-4xl font-semibold text-white mb-4'>
              Discover music that moves you
            </h2>

            <p className='text-lg sm:text-xl text-zinc-400 mb-8 leading-relaxed'>
              Get personalized album recommendations from people with great
              taste. Build your collection. Share your discoveries.
            </p>

            {/* CTA Buttons */}
            <div className='flex flex-col sm:flex-row gap-4'>
              <Button
                asChild
                variant='primary'
                size='lg'
                className='px-8 py-6 text-lg rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl'
              >
                <Link href='/register'>Get Started</Link>
              </Button>
              <Button
                asChild
                variant='outline'
                size='lg'
                className='px-8 py-6 text-lg rounded-xl transition-all duration-300'
              >
                <Link href='/signin'>Sign In</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Right side + mobile marquee (DB-backed, clickable covers) */}
        <HeroMarquee covers={covers} />
      </div>
    </section>
  );
}

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='bg-black border-t border-zinc-800/50'>
      <div className='max-w-6xl mx-auto px-6 py-12'>
        <div className='flex flex-col md:flex-row justify-between items-center gap-6'>
          {/* Logo */}
          <div className='flex items-center gap-3'>
            <span className='text-2xl font-bold text-cosmic-latte'>rec</span>
            <span className='text-zinc-600'>|</span>
            <span className='text-sm text-zinc-500'>music recommendations</span>
          </div>

          {/* Links */}
          <div className='flex items-center gap-6 text-sm'>
            <Link
              href='/about'
              className='text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              About
            </Link>
            <Link
              href='/privacy'
              className='text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              Privacy
            </Link>
            <Link
              href='/terms'
              className='text-zinc-500 hover:text-zinc-300 transition-colors'
            >
              Terms
            </Link>
          </div>

          {/* Copyright */}
          <div className='text-sm text-zinc-600'>© {currentYear}</div>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className='bg-black'>
      <HeroSection />
      <RecentRecs />
      <Footer />
    </div>
  );
}
