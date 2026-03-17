// src/scripts/add-slow-job.ts
/**
 * Add a slow mock job to test long-running job visualization in the dashboard.
 *
 * Usage:
 *   pnpm queue:slow             # default 30-second slow job
 *   pnpm queue:slow -- --time 60   # custom duration in seconds
 *   pnpm queue:slow -- --count 5   # add 5 slow jobs
 */

import { getMusicBrainzQueue } from '@/lib/queue/musicbrainz-queue';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type { MusicBrainzJobData } from '@/lib/queue/jobs';

async function main() {
  const args = process.argv.slice(2);

  const timeIdx = args.indexOf('--time');
  const delaySeconds =
    timeIdx !== -1 ? parseInt(args[timeIdx + 1], 10) || 30 : 30;

  const countIdx = args.indexOf('--count');
  const count = countIdx !== -1 ? parseInt(args[countIdx + 1], 10) || 1 : 1;

  const queue = getMusicBrainzQueue();

  console.log(`🐌 Adding ${count} slow job(s) (${delaySeconds}s each)...`);

  for (let i = 0; i < count; i++) {
    const label = count > 1 ? `Slow job ${i + 1}/${count}` : 'Slow test job';
    const job = await queue.addJob(
      JOB_TYPES.MUSICBRAINZ_SEARCH_ARTISTS,
      {
        query: `${label} (${delaySeconds}s)`,
        slowProcessing: true,
        delaySeconds,
      } as unknown as MusicBrainzJobData,
      {
        priority: PRIORITY_TIERS.BACKGROUND,
        silent: true,
      }
    );
    console.log(`  ✓ Queued: ${job.id} — "${label}"`);
  }

  console.log(`\n✅ Done! ${count} slow job(s) queued.`);
  console.log(`   Each will take ${delaySeconds}s when processed.`);
  console.log('   Start the worker with: pnpm queue:dev');

  await queue.close();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
