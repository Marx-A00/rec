import { HelpCircle } from 'lucide-react';

import BackButton from '@/components/ui/BackButton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function HelpPage() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-3xl'>
      <div className='mb-10'>
        <div className='flex items-center gap-3 mb-4'>
          <BackButton />
          <HelpCircle className='h-8 w-8 text-emerald-400' />
          <h1 className='text-3xl font-bold text-white'>Help & FAQ</h1>
        </div>
        <p className='text-zinc-400 text-lg leading-relaxed'>
          Everything you need to know about using Rec.
        </p>
      </div>

      <Accordion
        type='single'
        collapsible
        defaultValue='what-is-rec'
        className='space-y-2'
      >
        <AccordionItem
          value='what-is-rec'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            What is Rec?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-3'>
              Rec is a music recommendation platform built around one simple
              idea: if you love an album, you probably know other albums that
              fans of it would love too.
            </p>
            <p>
              The core concept is straightforward — you pick a{' '}
              <strong className='text-white'>source album</strong> (one you know
              and love), then recommend another album that you think fans of the
              source will enjoy. You rate how similar they are on a scale of
              1-10, and your recommendation goes live for the community to
              discover.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='what-do-i-do'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            What do I do here?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-3'>
              You recommend albums to people. That&apos;s it.
            </p>
            <p className='mb-3'>
              Pick an album you love, then pick another album you think fans of
              the first one would dig. Rate how similar they are, and your
              recommendation goes live for everyone to discover.
            </p>
            <p>
              Along the way you can browse what others are recommending, build
              collections of albums you want to remember, and find new music
              through the community.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='make-recommendation'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            How do I make a recommendation?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <ol className='list-decimal list-inside space-y-3'>
              <li>
                Click the <strong className='text-white'>Recommend</strong>{' '}
                button in the sidebar (or hit{' '}
                <strong className='text-white'>Make Rec</strong> on any album
                page).
              </li>
              <li>
                The recommendation drawer opens with two turntables and a dial.
              </li>
              <li>
                <strong className='text-red-400'>
                  Left turntable (Source)
                </strong>{' '}
                — search for an album you know and love. This is your starting
                point.
              </li>
              <li>
                <strong className='text-green-400'>
                  Right turntable (Recommended)
                </strong>{' '}
                — search for the album you want to recommend to fans of the
                source.
              </li>
              <li>
                <strong className='text-amber-400'>Middle dial</strong> — rate
                how similar the two albums are from 1-10.
              </li>
              <li>
                Hit <strong className='text-white'>submit</strong> — your rec is
                live!
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='similarity-rating'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            How does the similarity rating work?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-3'>
              The similarity rating is a 1-10 scale that tells other users how
              close the two albums are in sound, vibe, or style.
            </p>
            <ul className='list-disc list-inside space-y-2'>
              <li>
                <strong className='text-white'>Higher scores (7-10)</strong> —
                the albums share a lot in common. Similar genre, mood, or
                production style.
              </li>
              <li>
                <strong className='text-white'>Lower scores (1-3)</strong> — a
                more adventurous pick. The connection might be thematic,
                emotional, or just a gut feeling.
              </li>
              <li>
                <strong className='text-white'>Mid-range (4-6)</strong> — some
                overlap, but enough difference to keep things interesting.
              </li>
            </ul>
            <p className='mt-3 text-zinc-400'>
              It&apos;s completely subjective — there are no wrong answers. Some
              of the best recs come from unexpected connections.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='discover-music'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            How do I discover new music?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <ul className='list-disc list-inside space-y-3'>
              <li>
                <strong className='text-white'>Browse</strong> — trending
                albums, new releases, and community recommendations. This page
                is always growing with new content.
              </li>
              <li>
                <strong className='text-white'>Search</strong> — find specific
                albums, artists, tracks, or users. Use the search bar at the top
                of any page.
              </li>
              <li>
                <strong className='text-white'>Artist pages</strong> — explore
                discographies, see community recs for that artist, and discover
                similar artists.
              </li>
              <li>
                <strong className='text-white'>Album pages</strong> — check the{' '}
                <strong className='text-white'>Recs tab</strong> to see what the
                community recommends based on that album.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='collections'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            What are collections?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-3'>
              Collections are personal lists of albums — think of them like
              playlists, but for albums.
            </p>
            <ul className='list-disc list-inside space-y-2'>
              <li>
                Add albums from any album page using the{' '}
                <strong className='text-white'>Add to Collection</strong>{' '}
                button.
              </li>
              <li>
                Create as many collections as you want and organize them however
                you like.
              </li>
              <li>
                Your collections show up on your profile for others to explore.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='artist-album-pages'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            How do I explore artist and album pages?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-3'>
              Click any artist name or album cover anywhere in the app to visit
              their page.
            </p>
            <ul className='list-disc list-inside space-y-2'>
              <li>
                <strong className='text-white'>Artist pages</strong> — bio, full
                discography, and a recommendations tab showing all recs
                involving that artist.
              </li>
              <li>
                <strong className='text-white'>Album pages</strong> — tracklist,
                recommendations tab, and quick actions: make a rec, add to
                collection, or share with friends.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='customize-profile'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            How do I customize my profile?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <ol className='list-decimal list-inside space-y-2'>
              <li>Click your avatar in the sidebar to go to your profile.</li>
              <li>
                Hit the <strong className='text-white'>settings button</strong>{' '}
                (gear icon) on your profile page.
              </li>
              <li>
                From there you can edit your username, bio, and profile picture.
              </li>
              <li>
                For account settings (password, preferences), go to{' '}
                <strong className='text-white'>Settings &gt; Account</strong>.
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value='contextual-hints'
          className='border border-zinc-800 rounded-lg bg-zinc-900/50 px-4'
        >
          <AccordionTrigger className='text-white text-base font-medium hover:no-underline'>
            What are the tips that pop up on pages?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-3'>
              Those are contextual hints — small tooltips that appear on your
              first visit to key pages. They explain features right where you
              need them.
            </p>
            <ul className='list-disc list-inside space-y-2'>
              <li>
                Dismiss them by clicking{' '}
                <strong className='text-white'>Got it</strong> — they won&apos;t
                show again.
              </li>
              <li>
                If you want to see them again, go to{' '}
                <strong className='text-white'>Settings &gt; Account</strong>{' '}
                and click{' '}
                <strong className='text-white'>Reset Help Hints</strong>.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
