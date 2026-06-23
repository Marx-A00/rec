/**
 * POST /api/admin/taste-matches
 *
 * Triggers taste match computation via the BullMQ queue.
 *
 * Body (all optional):
 *   userId: string - compute for a single user only
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';
import { getMusicBrainzQueue } from '@/lib/queue/musicbrainz-queue';
import { JOB_TYPES, PRIORITY_TIERS } from '@/lib/queue/jobs';
import type { ComputeTasteMatchesJobData } from '@/lib/queue/jobs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === 'string' ? body.userId : undefined;

  const queue = getMusicBrainzQueue();

  const jobData: ComputeTasteMatchesJobData = {
    source: 'manual',
    userId,
  };

  const jobId = userId
    ? `taste-match-manual-${userId}-${Date.now()}`
    : `taste-match-manual-all-${Date.now()}`;

  await queue.addJob(JOB_TYPES.COMPUTE_TASTE_MATCHES, jobData, {
    jobId,
    priority: PRIORITY_TIERS.ADMIN,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 5,
    removeOnFail: 5,
  });

  return NextResponse.json({
    success: true,
    jobId,
    message: userId
      ? `Taste match computation queued for user ${userId}`
      : 'Taste match computation queued for all users',
  });
}
