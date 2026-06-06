// src/app/admin/help/page.tsx
'use client';

import Link from 'next/link';
import { HelpCircle, ExternalLink } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function AdminHelpPage() {
  return (
    <div className='container mx-auto px-4 py-8 max-w-3xl'>
      <div className='mb-10'>
        <div className='flex items-center gap-3 mb-4'>
          <HelpCircle className='h-8 w-8 text-emerald-400' />
          <h1 className='text-3xl font-bold text-white'>Admin Help</h1>
        </div>
        <p className='text-zinc-400 text-lg leading-relaxed'>
          How to run the day-to-day admin tasks for Rec.
        </p>
      </div>

      <Accordion type='single' collapsible className='w-full'>
        {/* Correct music in Music Database */}
        <AccordionItem value='music-database' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-base font-medium'>
            Correct music in the Music Database
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-4'>
              The{' '}
              <Link
                href='/admin/music-database'
                className='text-emerald-400 hover:text-emerald-300 underline'
              >
                Music Database
              </Link>{' '}
              is where all the music that is stored for Rec lives.
            </p>
            <h4 className='text-white font-medium mb-2'>How it works</h4>
            <p className='mb-4'>Rec only stores music during a few actions:</p>
            <ul className='list-disc list-inside space-y-2 mb-4'>
              <li>Weekly sync for latest releases</li>
              <li>Manual addition via admin</li>
              <li>
                User addition via album recommendation, Collection addition etc.
              </li>
            </ul>
            Sometimes, due to transient errors, bad data etc. some data on an
            album or artists will be wrong, just the name of the game. If you
            notice it, please correct the data manually.
            <h4 className='text-white font-medium mb-2'>
              How to correct music data
            </h4>
            Head to the{' '}
            <Link
              href='/admin/music-database'
              className='text-emerald-400 hover:text-emerald-300 underline'
            >
              Music Database
            </Link>{' '}
            It has three tabs: <strong className='text-white'>Albums</strong>,{' '}
            <strong className='text-white'>Artists</strong>, and{' '}
            <strong className='text-white'>Tracks</strong>.
            <h4 className='text-white font-medium mb-2'>Finding the entry</h4>
            <ol className='list-decimal list-inside space-y-2 mb-4'>
              <li>Pick the right tab (Albums, Artists, or Tracks).</li>
              <li>
                Search by name in the search box, or paste an ID into the{' '}
                <strong className='text-white'>&quot;search by ID&quot;</strong>{' '}
                box if you already know it.
              </li>
              <li>
                Narrow things down with the{' '}
                <strong className='text-white'>Data Quality</strong> and{' '}
                <strong className='text-white'>Enrichment Status</strong>{' '}
                filters, or the{' '}
                <strong className='text-white'>Needs Enrichment</strong> toggle.
              </li>
            </ol>
            <h4 className='text-white font-medium mb-2'>Correcting metadata</h4>
            <ul className='list-disc list-inside space-y-2 mb-4'>
              <li>
                Click the <strong className='text-white'>Correct</strong> action
                on a row to open the correction modal, then edit the fields and
                save.
              </li>
              <li>
                Use <strong className='text-white'>Enrich</strong> to pull fresh
                metadata from MusicBrainz for an entry. Use{' '}
                <strong className='text-white'>Preview Enrichment</strong> first
                if you want to see what would change before applying it.
              </li>
              <li>
                If an entry is stuck or got bad data, use{' '}
                <strong className='text-white'>Reset Enrichment</strong> and run
                it again.
              </li>
              <li>
                Select multiple rows and use{' '}
                <strong className='text-white'>Enrich Selected</strong> to batch
                process them.
              </li>
            </ul>
            <p className='text-zinc-400 text-sm'>
              Enrichment runs through the rate-limited MusicBrainz queue, so it
              isn&apos;t instant — give the status column a moment to update.
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Add albums to Uncover pool */}
        <AccordionItem value='uncover-pool' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-base font-medium'>
            Add albums to the Uncover pool
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-4'>
              Uncover is the daily game where players guess an album from its
              blurred cover. The{' '}
              <Link
                href='/admin/dailies/uncover'
                className='text-emerald-400 hover:text-emerald-300 underline'
              >
                Uncover admin page
              </Link>{' '}
              controls which albums get used. It has four tabs:{' '}
              <strong className='text-white'>Pool</strong>,{' '}
              <strong className='text-white'>Add Albums</strong>,{' '}
              <strong className='text-white'>History</strong>, and{' '}
              <strong className='text-white'>Stats</strong>.
            </p>

            <h4 className='text-white font-medium mb-2'>Adding albums</h4>
            <ol className='list-decimal list-inside space-y-2 mb-4'>
              <li>
                Go to the <strong className='text-white'>Add Albums</strong>{' '}
                tab.
              </li>
              <li>
                Browse the suggested albums and add the ones you want into the
                pool.
              </li>
              <li>
                Switch to the <strong className='text-white'>Pool</strong> tab
                to see everything currently queued and whether it&apos;s been
                used yet.
              </li>
            </ol>

            <h4 className='text-white font-medium mb-2'>Pool settings</h4>
            <ul className='list-disc list-inside space-y-2 mb-4'>
              <li>
                <strong className='text-white'>Selection Mode</strong> —{' '}
                <em>Random</em> picks any unused album each day; <em>FIFO</em>{' '}
                uses the oldest added first.
              </li>
              <li>
                <strong className='text-white'>When Pool Empty</strong> —{' '}
                <em>Auto-reset</em> reuses albums once the pool runs out;{' '}
                <em>Stop</em> halts new puzzles until you add more.
              </li>
            </ul>

            <h4 className='text-white font-medium mb-2'>
              Checking today&apos;s puzzle
            </h4>
            <p className='mb-2'>
              The <strong className='text-white'>Today&apos;s Cover</strong>{' '}
              panel at the top is hidden by default to avoid spoilers. Hit{' '}
              <strong className='text-white'>Reveal</strong> to confirm the
              cover looks right and that text regions (artist/title text on the
              artwork) were detected — those get blurred so the answer
              isn&apos;t given away.
            </p>
            <p className='text-zinc-400 text-sm'>
              A new puzzle generates daily at 7 AM Central. The History tab
              shows past covers; the Stats tab shows player performance. (Wiping
              all challenge data is owner-only.)
            </p>
            <p className='mt-3'>
              <Link
                href='/game'
                className='inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300'
              >
                Play the game <ExternalLink className='h-3.5 w-3.5' />
              </Link>
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Manage users */}
        <AccordionItem value='manage-users' className='border-zinc-800'>
          <AccordionTrigger className='text-white text-base font-medium'>
            Manage users
          </AccordionTrigger>
          <AccordionContent className='text-zinc-300 leading-relaxed'>
            <p className='mb-4'>
              The{' '}
              <Link
                href='/admin/users'
                className='text-emerald-400 hover:text-emerald-300 underline'
              >
                Users
              </Link>{' '}
              page lists every account. Search by name or email, then sort and
              filter to find who you need.
            </p>

            <h4 className='text-white font-medium mb-2'>What you can do</h4>
            <ul className='list-disc list-inside space-y-2 mb-4'>
              <li>
                <strong className='text-white'>Change a role</strong> — promote
                or demote a user between roles. (Some role changes are
                owner-only.)
              </li>
              <li>
                <strong className='text-white'>Soft delete</strong> — disables
                the account but keeps its data, so it can be brought back later.
              </li>
              <li>
                <strong className='text-white'>Restore</strong> — reactivates a
                soft-deleted account.
              </li>
              <li>
                <strong className='text-white'>Hard delete</strong> —
                permanently removes the user and their data. This cannot be
                undone, so use it carefully.
              </li>
            </ul>
            <p className='text-zinc-400 text-sm'>
              When in doubt, soft delete instead of hard delete — it&apos;s
              reversible.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
