import { Fragment } from 'react';
import Image from 'next/image';
import { ChevronRight, HelpCircle } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function MobileHelpPage() {
  return (
    <div className='px-4 py-6'>
      <div className='mb-6'>
        <div className='flex items-center gap-2 mb-1'>
          <HelpCircle className='h-5 w-5 text-emerald-400' />
          <h1 className='text-2xl font-bold text-white'>Help & FAQ</h1>
        </div>
        <p className='text-zinc-400 text-sm'>
          Everything you need to know about using Rec.
        </p>
      </div>

      <Accordion
        type='single'
        collapsible
        defaultValue='what-is-rec'
        className='w-full'
      >
        <AccordionItem value='what-is-rec' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-sm font-medium'>
            What is Rec?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 text-sm leading-relaxed'>
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

        <AccordionItem value='what-do-i-do' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-sm font-medium'>
            What do I do here?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 text-sm leading-relaxed'>
            <p className='mb-4'>
              The main thing to do is make recommendations. But here&apos;s an
              exhaustive list of things you can do:
            </p>
            <Accordion
              type='single'
              collapsible
              className='w-full pl-3 border-l border-zinc-800'
            >
              <AccordionItem value='do-make-rec' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  Make a recommendation
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    Pair two albums together for the community.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='do-artist-recs' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  See if specific artists have user recommendations
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    Check artist pages for community recs.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='do-album-recs' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  See if specific albums have user recommendations
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    Check album pages for community recs.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='do-follow' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  Follow your friends
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    Keep up with what they&apos;re recommending.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='do-collection' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  Add albums to your collection
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    Organize albums into personal lists.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value='do-listen-later'
                className='border-zinc-800'
              >
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  Add albums to Listen Later
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    Save albums you want to check out.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='do-activity' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  Catch up on your friends&apos; recent activity
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    See recs and collections from people you follow.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='do-browse' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  Browse latest releases
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs'>
                    Discover new albums as they drop.
                  </p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value='do-uncover' className='border-zinc-800'>
                <AccordionTrigger className='text-zinc-300 text-xs'>
                  Play Uncover
                </AccordionTrigger>
                <AccordionContent>
                  <p className='text-zinc-400 text-xs mb-3'>
                    A game where you guess albums from blurred artwork.
                  </p>
                  <div className='flex items-center gap-0.5'>
                    {[1, 2, 3, 4, 5].map((stage, i) => (
                      <Fragment key={stage}>
                        <Image
                          src={`/uncover/help-modal/homogenic-stage${stage}.png`}
                          alt={`Reveal stage ${stage}`}
                          width={758}
                          height={758}
                          className='aspect-square min-w-0 flex-1 rounded-md border border-zinc-800'
                        />
                        {i < 4 && (
                          <ChevronRight className='h-3 w-3 shrink-0 text-zinc-600' />
                        )}
                      </Fragment>
                    ))}
                  </div>
                  <p className='mt-2 text-center text-xs text-zinc-500'>
                    The cover unblurs with each wrong guess.
                  </p>
                  <ul className='mt-3 space-y-2 text-xs text-zinc-300'>
                    <li className='flex gap-2'>
                      <span className='font-semibold text-emerald-400'>1.</span>
                      You get 4 attempts to name the album.
                    </li>
                    <li className='flex gap-2'>
                      <span className='font-semibold text-emerald-400'>2.</span>
                      The cover starts fully blurred and unblurs a little more
                      with each miss.
                    </li>
                    <li className='flex gap-2'>
                      <span className='font-semibold text-emerald-400'>3.</span>
                      Solve it in as few attempts as possible. A new puzzle
                      drops every day.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='make-recommendation' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-sm font-medium'>
            How do I make a recommendation?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 text-sm leading-relaxed'>
            <ol className='list-decimal list-inside space-y-3'>
              <li>
                Tap the <strong className='text-white'>Recommend</strong>{' '}
                button, or hit{' '}
                <strong className='text-white'>Make Rec</strong> on any album
                page.
              </li>
              <li>
                The recommendation view opens with two turntables and a dial.
              </li>
              <li>
                <strong className='text-red-400'>
                  Left turntable (Source)
                </strong>{' '}
                — search for an album you know and love.
              </li>
              <li>
                <strong className='text-green-400'>
                  Right turntable (Recommended)
                </strong>{' '}
                — search for the album you want to recommend.
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

        <AccordionItem value='similarity-rating' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-sm font-medium'>
            How does the similarity rating work?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 text-sm leading-relaxed'>
            <p className='mb-3'>
              The similarity rating is a 1-10 scale that tells other users how
              close the two albums are in sound, vibe, or style.
            </p>
            <ul className='list-disc list-inside space-y-2'>
              <li>
                <strong className='text-white'>Higher scores (7-10)</strong> —
                the albums share a lot in common.
              </li>
              <li>
                <strong className='text-white'>Lower scores (1-3)</strong> — a
                more adventurous pick. The connection might be thematic or
                emotional.
              </li>
              <li>
                <strong className='text-white'>Mid-range (4-6)</strong> — some
                overlap, but enough difference to keep things interesting.
              </li>
            </ul>
            <p className='mt-3 text-zinc-400'>
              It&apos;s completely subjective — there are no wrong answers.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='discover-music' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-sm font-medium'>
            How do I discover new music?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 text-sm leading-relaxed'>
            <ul className='list-disc list-inside space-y-3'>
              <li>
                <strong className='text-white'>Browse</strong> — trending
                albums, new releases, and community recommendations.
              </li>
              <li>
                <strong className='text-white'>Search</strong> — find specific
                albums, artists, tracks, or users.
              </li>
              <li>
                <strong className='text-white'>Artist pages</strong> — explore
                discographies and see community recs.
              </li>
              <li>
                <strong className='text-white'>Album pages</strong> — check the
                Recs tab to see what the community recommends.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value='collections' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-sm font-medium'>
            What are collections?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 text-sm leading-relaxed'>
            <p className='mb-3'>
              Collections are personal lists of albums — think of them like
              playlists, but for albums.
            </p>
            <ul className='list-disc list-inside space-y-2'>
              <li>
                Add albums from any album page using{' '}
                <strong className='text-white'>Add to Collection</strong>.
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

        <AccordionItem value='customize-profile' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-sm font-medium'>
            How do I customize my profile?
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 text-sm leading-relaxed'>
            <ol className='list-decimal list-inside space-y-2'>
              <li>Tap your avatar in the menu to go to your profile.</li>
              <li>
                Hit the <strong className='text-white'>settings button</strong>{' '}
                (gear icon) on your profile page.
              </li>
              <li>Edit your username, bio, and profile picture.</li>
              <li>
                For account settings, go to{' '}
                <strong className='text-white'>Settings</strong>.
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
