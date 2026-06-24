import { Music, Heart, Globe, Sparkles } from 'lucide-react';

export default function MobileAboutPage() {
  return (
    <div className='px-4 py-6 space-y-4'>
      <div>
        <h1 className='text-2xl font-bold text-white'>About</h1>
        <p className='text-zinc-400 mt-1 text-sm'>
          What rec is and why we built it
        </p>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <div className='flex items-center gap-3 mb-3'>
          <Music className='w-5 h-5 text-emerald-400' />
          <h2 className='text-lg font-semibold text-white'>
            Music discovery, powered by people
          </h2>
        </div>
        <p className='text-zinc-300 text-sm leading-relaxed'>
          rec is a platform built around a simple idea: the best music
          recommendations come from real people, not algorithms. When someone
          tells you &quot;if you like this album, you will love this one&quot; —
          that is the kind of discovery rec is built for.
        </p>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <div className='flex items-center gap-3 mb-3'>
          <Sparkles className='w-5 h-5 text-emerald-400' />
          <h2 className='text-lg font-semibold text-white'>How It Works</h2>
        </div>
        <div className='space-y-3 text-zinc-300 text-sm leading-relaxed'>
          <p>
            Users create recommendations by pairing two albums together — a
            basis album and a recommended album — along with a similarity score.
            These pairings build a network of connections between albums, driven
            entirely by human taste.
          </p>
          <p>
            You can browse albums and artists, explore what others have
            recommended, build collections of albums you love, and follow other
            users whose taste you trust.
          </p>
        </div>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <div className='flex items-center gap-3 mb-3'>
          <Heart className='w-5 h-5 text-emerald-400' />
          <h2 className='text-lg font-semibold text-white'>What We Value</h2>
        </div>
        <ul className='space-y-3 text-zinc-300 text-sm'>
          <li className='flex items-start gap-2'>
            <span className='text-emerald-400 mt-0.5'>-</span>
            <span>
              <strong className='text-white'>
                Human curation over algorithms.
              </strong>{' '}
              Every recommendation on rec was made by a person who genuinely
              thinks those two albums connect.
            </span>
          </li>
          <li className='flex items-start gap-2'>
            <span className='text-emerald-400 mt-0.5'>-</span>
            <span>
              <strong className='text-white'>Discovery over popularity.</strong>{' '}
              We surface music based on connections, not charts. A lesser-known
              album can sit right next to a classic if the recommendation is
              strong.
            </span>
          </li>
          <li className='flex items-start gap-2'>
            <span className='text-emerald-400 mt-0.5'>-</span>
            <span>
              <strong className='text-white'>
                Community over consumption.
              </strong>{' '}
              rec is about sharing music you care about, not endless scrolling.
              Quality over quantity.
            </span>
          </li>
        </ul>
      </div>

      <div className='bg-zinc-900 border border-zinc-800 rounded-xl p-5'>
        <div className='flex items-center gap-3 mb-3'>
          <Globe className='w-5 h-5 text-emerald-400' />
          <h2 className='text-lg font-semibold text-white'>
            Powered by Open Data
          </h2>
        </div>
        <p className='text-zinc-300 text-sm leading-relaxed'>
          rec uses data from MusicBrainz, an open music encyclopedia, along with
          other sources to provide accurate album and artist information. Album
          art, tracklists, and metadata are sourced from a combination of public
          APIs and community contributions.
        </p>
      </div>
    </div>
  );
}
